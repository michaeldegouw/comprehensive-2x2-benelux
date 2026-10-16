// Cloudflare Worker: wachtwoord voor de calculator en verzending van de pdf.
// Geheimen (wrangler secret put …): APP_PASSWORD, SESSION_SECRET, RESEND_API_KEY.
// Variabelen (wrangler.jsonc): MAIL_FROM, REP_DOMAIN (bv. "aligntech.com").

const COOKIE = 'calc_sessie';
const GELDIG_UUR = 12;
const enc = new TextEncoder();

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '');
}

function gelijk(a, b) {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}

async function ingelogd(req, env) {
  const c = (req.headers.get('cookie') || '').split(/;\s*/).find((x) => x.startsWith(COOKIE + '='));
  if (!c) return false;
  const [verloopt, sig] = c.slice(COOKIE.length + 1).split('.');
  if (!verloopt || !sig || Number(verloopt) < Date.now()) return false;
  return gelijk(sig, await hmac(env.SESSION_SECRET, verloopt));
}

const inlogpagina = (fout) => new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Praktijkcalculator</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f9;font:15px/1.5 system-ui,Arial,sans-serif;color:#1d2433}form{background:#fff;padding:28px;border-radius:8px;border:1px solid #dfe3ea;width:min(340px,92vw)}input,button{width:100%;padding:9px;font:inherit;margin-top:8px;border-radius:5px;border:1px solid #dfe3ea;box-sizing:border-box}button{background:#0f5f8c;color:#fff;border-color:#0f5f8c;cursor:pointer}.f{color:#9b1c1c;font-size:13px}</style></head>
<body><form method="post" action="/login"><strong>Praktijkcalculator</strong><br><small>Alleen voor medewerkers van Align Technology.</small>
<input type="password" name="wachtwoord" placeholder="Wachtwoord" autofocus required>${fout ? '<div class="f">Onjuist wachtwoord.</div>' : ''}<button>Inloggen</button></form></body></html>`,
  { status: fout ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

const geldigAdres = (s) => typeof s === 'string' && /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(s) && s.length < 200;
const schoon = (s, max = 120) => String(s ?? '').replace(/[\r\n<>]/g, ' ').slice(0, max);

async function verstuur(req, env) {
  let b;
  try { b = await req.json(); } catch { return new Response('Ongeldige aanvraag', { status: 400 }); }
  if (!geldigAdres(b.aan)) return new Response('Ongeldig e-mailadres praktijk', { status: 400 });
  if (!geldigAdres(b.cc) || !b.cc.toLowerCase().endsWith('@' + env.REP_DOMAIN)) return new Response(`CC moet een @${env.REP_DOMAIN}-adres zijn`, { status: 400 });
  if (typeof b.pdf !== 'string' || b.pdf.length > 4_000_000) return new Response('Pdf ontbreekt of is te groot', { status: 400 });
  const praktijk = schoon(b.praktijk) || 'uw praktijk';
  const html = `<p>Beste ${schoon(b.contact) || 'collega'},</p><p>In de bijlage vindt u de praktijkanalyse voor ${praktijk}, zoals we die samen hebben opgesteld.</p><p>Met vriendelijke groet,<br>${schoon(b.rep)}</p>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [b.aan], cc: [b.cc], reply_to: b.cc,
      subject: `Praktijkanalyse aligners – ${praktijk}`, html,
      attachments: [{ filename: schoon(b.bestandsnaam, 80).replace(/[^\w.-]/g, '') || 'praktijkanalyse.pdf', content: b.pdf }],
    }),
  });
  return r.ok ? new Response('ok') : new Response('Verzenden mislukt', { status: 502 });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/login' && req.method === 'POST') {
      const form = await req.formData();
      const ww = String(form.get('wachtwoord') || '');
      if (!env.APP_PASSWORD || !gelijk(await hmac(env.SESSION_SECRET, ww), await hmac(env.SESSION_SECRET, env.APP_PASSWORD))) return inlogpagina(true);
      const verloopt = String(Date.now() + GELDIG_UUR * 3600_000);
      return new Response(null, { status: 303, headers: {
        location: '/', 'set-cookie': `${COOKIE}=${verloopt}.${await hmac(env.SESSION_SECRET, verloopt)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${GELDIG_UUR * 3600}` } });
    }
    if (!(await ingelogd(req, env))) return url.pathname.startsWith('/api/') ? new Response('Niet ingelogd', { status: 401 }) : inlogpagina(false);
    if (url.pathname === '/api/verstuur' && req.method === 'POST') return verstuur(req, env);
    const res = await env.ASSETS.fetch(req);
    const h = new Headers(res.headers);
    h.set('cache-control', 'no-store'); h.set('x-robots-tag', 'noindex'); h.set('referrer-policy', 'no-referrer');
    return new Response(res.body, { status: res.status, headers: h });
  },
};
