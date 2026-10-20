// Cloudflare Worker: inloggen per vertegenwoordiger en verzending van de pdf.
// Geheimen (wrangler secret put …):
//   GEBRUIKERS     JSON: { "gebruikersnaam": { "naam": "…", "email": "…@aligntech.com", "hash": "pbkdf2$…" } }
//                  Maak een regel met: node gebruiker-toevoegen.mjs <gebruikersnaam> "<naam>" <email>
//   SESSION_SECRET lange willekeurige tekenreeks
//   RESEND_API_KEY sleutel van de mailprovider
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

const gebruikers = (env) => { try { return JSON.parse(env.GEBRUIKERS || '{}'); } catch { return {}; } };

async function pbkdf2(wachtwoord, zoutB64, rondes) {
  const key = await crypto.subtle.importKey('raw', enc.encode(wachtwoord), 'PBKDF2', false, ['deriveBits']);
  const zout = Uint8Array.from(atob(zoutB64), (c) => c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: zout, iterations: rondes }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function controleer(gebruiker, wachtwoord) {
  const [soort, rondes, zout, hash] = String(gebruiker?.hash || '').split('$');
  if (soort !== 'pbkdf2' || !hash) return false;
  return gelijk(await pbkdf2(wachtwoord, zout, Number(rondes)), hash);
}

// Geeft de ingelogde gebruiker terug, of null.
async function ingelogd(req, env) {
  const c = (req.headers.get('cookie') || '').split(/;\s*/).find((x) => x.startsWith(COOKIE + '='));
  if (!c) return null;
  const [naam, verloopt, sig] = decodeURIComponent(c.slice(COOKIE.length + 1)).split('.');
  if (!naam || !verloopt || !sig || Number(verloopt) < Date.now()) return null;
  if (!gelijk(sig, await hmac(env.SESSION_SECRET, `${naam}.${verloopt}`))) return null;
  const u = gebruikers(env)[naam];
  return u ? { gebruikersnaam: naam, naam: u.naam, email: u.email } : null;
}

const inlogpagina = (fout) => new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Praktijkcalculator</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f9;font:15px/1.5 system-ui,Arial,sans-serif;color:#1d2433}form{background:#fff;padding:28px;border-radius:8px;border:1px solid #dfe3ea;width:min(340px,92vw)}input,button{width:100%;padding:9px;font:inherit;margin-top:8px;border-radius:5px;border:1px solid #dfe3ea;box-sizing:border-box}button{background:#0f5f8c;color:#fff;border-color:#0f5f8c;cursor:pointer}.f{color:#9b1c1c;font-size:13px}</style></head>
<body><form method="post" action="/login"><strong>Praktijkcalculator</strong><br><small>Alleen voor medewerkers van Align Technology.</small>
<input name="gebruiker" placeholder="Gebruikersnaam" autocomplete="username" autofocus required><input type="password" name="wachtwoord" placeholder="Wachtwoord" autocomplete="current-password" required>${fout ? '<div class="f">Onjuiste gebruikersnaam of wachtwoord.</div>' : ''}<button>Inloggen</button></form></body></html>`,
  { status: fout ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

const geldigAdres = (s) => typeof s === 'string' && /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(s) && s.length < 200;
const schoon = (s, max = 120) => String(s ?? '').replace(/[\r\n<>]/g, ' ').slice(0, max);

async function verstuur(req, env, gebruiker) {
  if (!env.RESEND_API_KEY) return new Response('Mailverzending niet ingesteld', { status: 503 }); // app valt terug op download + mailprogramma
  let b;
  try { b = await req.json(); } catch { return new Response('Ongeldige aanvraag', { status: 400 }); }
  if (!geldigAdres(b.aan)) return new Response('Ongeldig e-mailadres praktijk', { status: 400 });
  const cc = gebruiker.email; // altijd de ingelogde vertegenwoordiger, nooit een adres uit het formulier
  if (!geldigAdres(cc) || !cc.toLowerCase().endsWith('@' + env.REP_DOMAIN)) return new Response('Account heeft geen geldig e-mailadres', { status: 400 });
  if (typeof b.pdf !== 'string' || b.pdf.length > 4_000_000) return new Response('Pdf ontbreekt of is te groot', { status: 400 });
  const praktijk = schoon(b.praktijk) || 'uw praktijk';
  const html = `<p>Beste ${schoon(b.contact) || 'collega'},</p><p>In de bijlage vindt u de praktijkanalyse voor ${praktijk}, zoals we die samen hebben opgesteld.</p><p>Met vriendelijke groet,<br>${schoon(gebruiker.naam)}</p>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [b.aan], cc: [cc], reply_to: cc,
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
      const naam = String(form.get('gebruiker') || '').trim().toLowerCase();
      const u = gebruikers(env)[naam];
      const ok = await controleer(u, String(form.get('wachtwoord') || ''));
      if (!ok) { await new Promise((r) => setTimeout(r, 800)); return inlogpagina(true); }
      const verloopt = String(Date.now() + GELDIG_UUR * 3600_000);
      const waarde = encodeURIComponent(`${naam}.${verloopt}.${await hmac(env.SESSION_SECRET, `${naam}.${verloopt}`)}`);
      return new Response(null, { status: 303, headers: {
        location: '/', 'set-cookie': `${COOKIE}=${waarde}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${GELDIG_UUR * 3600}` } });
    }
    if (url.pathname === '/uitloggen') return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });
    const gebruiker = await ingelogd(req, env);
    if (!gebruiker) return url.pathname.startsWith('/api/') ? new Response('Niet ingelogd', { status: 401 }) : inlogpagina(false);
    if (url.pathname === '/api/me') return Response.json({ naam: gebruiker.naam, email: gebruiker.email }, { headers: { 'cache-control': 'no-store' } });
    if (url.pathname === '/api/verstuur' && req.method === 'POST') return verstuur(req, env, gebruiker);
    const res = await env.ASSETS.fetch(req);
    const h = new Headers(res.headers);
    h.set('cache-control', 'no-store'); h.set('x-robots-tag', 'noindex'); h.set('referrer-policy', 'no-referrer');
    return new Response(res.body, { status: res.status, headers: h });
  },
};
