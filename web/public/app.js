import { praktijk } from './model.js';
import { TIERS, LANDEN, ALIGN_DATA, STOELTIJD, PRODUCTEN } from './data.js';

const form = document.getElementById('form');
const uit = document.getElementById('uitkomst');
const eur = (x) => '€ ' + Math.round(x).toLocaleString('nl-NL');
const pct = (x) => (x * 100).toLocaleString('nl-NL', { maximumFractionDigits: 0 }) + '%';
const getal = (x, d = 0) => x.toLocaleString('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let laatste = null;

function vulTiers() {
  const land = form.land.value;
  const sel = form.tier;
  const oud = sel.value;
  sel.innerHTML = TIERS[land].map((t) => `<option value="${t.id}">${t.naam} (${pct(t.korting)} korting)</option>`).join('');
  if ([...sel.options].some((o) => o.value === oud)) sel.value = oud;
  document.querySelectorAll('fieldset[data-land]').forEach((f) => { f.hidden = f.dataset.land !== land; });
}

function invoer() {
  const f = form;
  const n = (k) => Number(f[k].value) || 0;
  const stoeltijd = structuredClone(STOELTIJD);
  stoeltijd.vast.controle = n('st_vast_controle'); stoeltijd.aligner.controle = n('st_aligner_controle');
  stoeltijd.vast.start = n('st_vast_start'); stoeltijd.aligner.start = n('st_aligner_start');
  return {
    praktijkNaam: f.praktijk.value.trim(), contact: f.contact.value.trim(), emailPraktijk: f.emailPraktijk.value.trim(),
    rep: f.rep.value.trim(), emailRep: f.emailRep.value.trim(), type: f.type.value,
    land: f.land.value, stoelen: n('stoelen'), dagenPerWeek: n('dagenPerWeek'), urenPerDag: n('urenPerDag'), wekenPerJaar: n('wekenPerJaar'),
    orthoAandeel: n('orthoAandeel'), kostenPerStoeluur: n('kostenPerStoeluur'), wachtlijst: f.wachtlijst.checked,
    startsPerJaar: n('startsPerJaar'), aandeelTieners: n('aandeelTieners'), tienersAlignerNu: n('tienersAlignerNu'), volwAlignerNu: n('volwAlignerNu'),
    duurVast: n('duurVast'), duurAligner: n('duurAligner'), intervalVast: n('intervalVast'), intervalAlignerNu: n('intervalAlignerNu'),
    opAfstandNu: f.opAfstandNu.checked, tools: { itero: f.itero.checked, ipp: f.ipp.checked, monitoring: f.opAfstandDoel.checked || f.opAfstandNu.checked },
    tier: f.tier.value, productTienersNu: f.productTienersNu.value, productVolw: f.productVolw.value, materiaalVast: n('materiaalVast'),
    nlPolis: { percentage: n('polisPct') / 100, maximum: n('polisMax') },
    be: { model: f.beModel.value, prijsVast: n('prijsVast'), prijsAligner: n('prijsAligner') },
    lu: { cp8: n('cp8') },
    tienersAlignerDoel: n('tienersAlignerDoel'), intervalAlignerDoel: n('intervalAlignerDoel'), opAfstandDoel: f.opAfstandDoel.checked,
    aannames: { minutenPerAfdrukBespaard: n('minutenPerAfdrukBespaard'), minutenPerModificatie: n('minutenPerModificatie') },
    stoeltijd,
  };
}

function adviezen(inv, r) {
  const a = [];
  if (inv.intervalAlignerDoel > 8 && !inv.opAfstandDoel) a.push('Een interval van meer dan 8 weken adviseren we alleen met monitoring op afstand tussen de bezoeken.');
  if (inv.intervalAlignerDoel >= 10) a.push('Plan de eerste controle 4–6 weken na de start. Ga pas daarna naar 10–12 weken, als pasvorm, draagdiscipline en attachments in orde zijn. Kort het interval in bij IPR, elastieken, groeisturing of matige draagdiscipline.');
  if (r.doel.bezetting > 0.85 || inv.wachtlijst) a.push(`De vrijgekomen ${getal(r.vrij)} stoeluren per jaar zijn direct te gebruiken voor ongeveer ${getal(r.extraStarts)} extra starts, of om de wachtlijst in te korten.`);
  else if (r.vrij > 0) a.push(`Het scenario maakt ${getal(r.vrij)} stoeluren per jaar vrij (${pct(r.vrij / r.capaciteit)} van de capaciteit voor orthodontie). Die zijn te gebruiken voor nieuwe patiënten, of voor kortere werkdagen.`);
  if (inv.productTienersNu !== 'c2x2teen' && r.besparingLab > 0) {
    a.push(inv.land === 'NL'
      ? `Comprehensive 2x2 verlaagt de techniekkosten voor tieners. Omdat de praktijk die tegen inkoopprijs doorberekent, betalen ouders samen ±${eur(r.besparingLab)} per jaar minder.`
      : `Comprehensive 2x2 verlaagt de labkosten voor tieners met ±${eur(r.besparingLab)} per jaar ten opzichte van het huidige product.`);
  }
  if (inv.land === 'BE' && inv.be.model === 'max') a.push('Bij de maximumtarieven moeten de labkosten binnen het plafond worden opgevangen. Plan minimaal 6 zittingen voor het tweede apparatuurforfait.');
  if (inv.land === 'LU') a.push('Vermeld het CP8-supplement apart op de offerte voor de CMSS, en laat de ouders vooraf schriftelijk akkoord geven.');
  return a;
}

function render() {
  const inv = invoer();
  const r = praktijk(inv);
  laatste = { inv, r };
  const L = LANDEN[inv.land].naam;
  const hint = document.getElementById('hintInterval');
  hint.textContent = inv.intervalAlignerDoel > 8 && !inv.opAfstandDoel ? 'Let op: langer dan 8 weken alleen met monitoring op afstand.' : '';
  hint.className = 'hint' + (hint.textContent ? ' warn' : '');

  const d = r.doel, n = r.nu;
  const verschil = (a, b, f = eur) => `<span class="${a - b >= 0 ? 'plus' : 'min'}">${a - b >= 0 ? '+' : '−'}${f(Math.abs(a - b))}</span>`;
  const maxUur = Math.max(n.vast.perUur, d.alT.perUur, n.alT.perUur);
  const bar = (lbl, v, alt) => `<div class="bar"><div class="lbl">${lbl}</div><div class="track"><div class="fill ${alt ? 'alt' : ''}" style="width:${Math.max(4, (v / maxUur) * 100)}%"></div></div><div class="val">${eur(v)}</div></div>`;
  const profiel = ALIGN_DATA.tienerMeerderheid, tot = ALIGN_DATA.totaal;

  uit.innerHTML = `
  <div class="kaart">
    <h2>${esc(inv.praktijkNaam || 'Uw praktijk')} · ${L}</h2>
    <div class="kpis">
      <div class="kpi"><div class="v">${getal(r.vrij)} u</div><div class="l">stoeltijd per jaar vrij</div></div>
      <div class="kpi"><div class="v">+${getal(r.extraStarts)}</div><div class="l">extra starts mogelijk in dezelfde tijd</div></div>
      <div class="kpi"><div class="v">${eur(d.perUur)}</div><div class="l">netto per stoeluur (nu ${eur(n.perUur)})</div></div>
      <div class="kpi"><div class="v">${eur(d.alT.ouders)}</div><div class="l">eigen bijdrage ouders, tiener met aligners</div></div>
    </div>
  </div>

  <div class="kaart">
    <h2>1. Praktijk per jaar: nu en in het scenario</h2>
    <div class="tabel"><table>
      <tr><th></th><th class="n">Nu</th><th class="n">Scenario</th><th class="n">Verschil</th></tr>
      <tr><td>Tieners met aligners</td><td class="n">${pct(inv.tienersAlignerNu / 100)}</td><td class="n">${pct(inv.tienersAlignerDoel / 100)}</td><td></td></tr>
      <tr><td>Controle-interval aligners</td><td class="n">${getal(inv.intervalAlignerNu, 1)} wk</td><td class="n">${getal(inv.intervalAlignerDoel, 1)} wk</td><td></td></tr>
      <tr><td>Stoel- en artsentijd orthodontie</td><td class="n">${getal(n.uren)} u</td><td class="n">${getal(d.uren)} u</td><td class="n">${verschil(d.uren, n.uren, (x) => getal(x) + ' u')}</td></tr>
      <tr><td>Bezetting capaciteit (${getal(r.capaciteit)} u)</td><td class="n">${pct(n.bezetting)}</td><td class="n">${pct(d.bezetting)}</td><td></td></tr>
      <tr><td>Netto honorarium (na labkosten)</td><td class="n">${eur(n.netto)}</td><td class="n">${eur(d.netto)}</td><td class="n">${verschil(d.netto, n.netto)}</td></tr>
      <tr><td>Netto per stoeluur</td><td class="n">${eur(n.perUur)}</td><td class="n">${eur(d.perUur)}</td><td class="n">${verschil(d.perUur, n.perUur)}</td></tr>
      <tr><td>Marge na stoelkosten (${eur(inv.kostenPerStoeluur)}/u)</td><td class="n">${eur(n.marge)}</td><td class="n">${eur(d.marge)}</td><td class="n">${verschil(d.marge, n.marge)}</td></tr>
      <tr class="hl"><td>+ vrijgekomen uren ingezet voor ${getal(r.extraStarts)} extra tieners met aligners</td><td></td><td class="n">${eur(d.netto + r.extraNetto)}</td><td class="n">${verschil(d.netto + r.extraNetto, n.netto)}</td></tr>
    </table></div>
    <small>Gelijk aantal starts in beide situaties; alleen de mix en het interval veranderen. ${inv.land === 'NL' ? 'In Nederland gaan de techniekkosten tegen inkoopprijs naar de patiënt; netto = honorarium.' : ''}</small>
  </div>

  <div class="kaart">
    <h2>2. Per behandeling: waarom aligners per uur meer opleveren</h2>
    <p>Dit geldt voor elk Invisalign-product. De winst komt uit minder bezoeken, minder spoedbezoeken en minder stoeltijd per bezoek.</p>
    <div class="tabel"><table>
      <tr><th></th><th class="n">Vaste beugel</th><th class="n">Aligner, nu</th><th class="n">2x2, scenario</th></tr>
      <tr><td>Controlebezoeken</td><td class="n">${n.vast.controles}</td><td class="n">${n.alT.controles}</td><td class="n">${d.alT.controles}${d.alT.afstand ? ` + ${d.alT.afstand} op afstand` : ''}</td></tr>
      <tr><td>Stoel- en artsentijd</td><td class="n">${getal(n.vast.uren, 1)} u</td><td class="n">${getal(n.alT.uren, 1)} u</td><td class="n">${getal(d.alT.uren, 1)} u</td></tr>
      <tr><td>Totaalprijs (honorarium + lab)</td><td class="n">${eur(n.vast.omzet)}</td><td class="n">${eur(n.alT.omzet)}</td><td class="n">${eur(d.alT.omzet)}</td></tr>
      <tr><td>Labkosten</td><td class="n">${eur(n.vast.lab)}</td><td class="n">${eur(n.alT.lab)}</td><td class="n">${eur(d.alT.lab)}</td></tr>
      <tr><td>Netto voor de praktijk</td><td class="n">${eur(n.vast.netto)}</td><td class="n">${eur(n.alT.netto)}</td><td class="n">${eur(d.alT.netto)}</td></tr>
      <tr class="hl"><td>Netto per uur</td><td class="n">${eur(n.vast.perUur)}</td><td class="n">${eur(n.alT.perUur)}</td><td class="n">${eur(d.alT.perUur)}</td></tr>
      <tr><td>Eigen bijdrage ouders</td><td class="n">${eur(n.vast.ouders)}</td><td class="n">${eur(n.alT.ouders)}</td><td class="n">${eur(d.alT.ouders)}</td></tr>
    </table></div>
    ${bar('Vaste beugel', n.vast.perUur, true)}${bar('Aligner, nu', n.alT.perUur, true)}${bar('2x2, scenario', d.alT.perUur)}
  </div>

  <div class="kaart">
    <h2>3. Comprehensive 2x2 past bij tieners</h2>
    <p>De initiële set plus 2 extra sets, af binnen 2 jaar. Wat de Align-data voor de Benelux laat zien:</p>
    <div class="tabel"><table>
      <tr><th>Benodigde extra sets</th><th class="n">Alle praktijken</th><th class="n">Praktijken met &gt;50% tieners</th></tr>
      <tr><td>0 of 1 extra set</td><td class="n">${pct(tot.geen + tot.een)}</td><td class="n">${pct(1 - profiel.twee - profiel.driePlus)}</td></tr>
      <tr><td>2 extra sets</td><td class="n">${pct(tot.twee)}</td><td class="n">${pct(profiel.twee)}</td></tr>
      <tr class="hl"><td>Binnen Comprehensive 2x2</td><td class="n">${pct(1 - tot.driePlus)}</td><td class="n">${pct(1 - profiel.driePlus)}</td></tr>
      <tr><td>3 of meer extra sets (€200 per set)</td><td class="n">${pct(tot.driePlus)}</td><td class="n">${pct(profiel.driePlus)}</td></tr>
    </table></div>
    <small>${ALIGN_DATA.bron}. ${getal(tot.behandelingen)} behandelingen bij ${getal(tot.artsen)} artsen; ${pct(tot.binnen2j)} van de extra sets binnen 2 jaar. Indeling naar tienersaandeel per arts, niet per patiënt.</small>
    <p><strong>Uit de literatuur:</strong> bij tieners hadden aligners 15,7 tegenover 21,3 afspraken en 0,4 tegenover 1,0 spoedbezoeken, met een gelijk resultaat (PAR) en minder witte vlekken (Oki 2026). In een studie met matige tot ernstige casussen waren er 16 tegenover 24 bezoeken (Chou 2023). Kanttekening: één Amerikaanse praktijkstudie vond gemiddeld ±2,5 refinements per behandeling (Kravitz 2023). Selecteer complexe casussen daarom bewust.</p>
    <div class="tabel"><table>
      <tr><th>Labkosten per tiener bij uw tier</th><th class="n">Prijs</th><th class="n">Verwacht incl. extra sets</th></tr>
      ${r.productvergelijking.map((p) => `<tr class="${p.product === 'c2x2teen' ? 'hl' : ''}"><td>${p.naam}</td><td class="n">${eur(p.prijs)}</td><td class="n">${eur(p.verwacht)}</td></tr>`).join('')}
    </table></div>
    <small>Verwacht voor 2x2: gemiddeld ${getal(0.281, 2)} extra sets per behandeling (ondergrens, uit de Align-data voor praktijken met vooral groeiende patiënten).</small>
  </div>

  <div class="kaart">
    <h2>4. Kansen met digitale tools</h2>
    ${r.kansen.length ? `<ul class="advies">${r.kansen.map((k) => `<li><strong>${k.tool}</strong>${k.uren ? ` · ±${getal(k.uren)} u/jaar` : ''}<br>${k.tekst}</li>`).join('')}</ul>` : '<p>Alle tools in de calculator worden al gebruikt.</p>'}
    <small>Align-data: verband, geen bewezen oorzaak. Praktijken die tools gebruiken verschillen ook op andere punten, zoals volume en ervaring.</small>
  </div>

  <div class="kaart">
    <h2>5. Advies</h2>
    <ul class="advies">${adviezen(inv, r).map((x) => `<li>${x}</li>`).join('')}</ul>
  </div>

`;
  const knop = document.getElementById('mail');
  knop.disabled = !inv.emailPraktijk;
  knop.textContent = `Verstuur naar ${inv.emailPraktijk || 'praktijk'}${inv.emailRep ? ' (cc ' + inv.emailRep + ')' : ''}`;
}

function bestandsnaam() {
  const n = (laatste.inv.praktijkNaam || 'praktijk').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `praktijkanalyse-${n}.pdf`;
}

// Standaardfonts van jsPDF kennen alleen WinAnsi-tekens.
const pdfTekst = (x) => String(x).replace(/≤/g, 'max.').replace(/≥/g, 'min.').replace(/[−–]/g, '-').replace(/±/g, 'ca. ').replace(/→/g, '->').replace(/[‘’]/g, "'").replace(/\u202f|\u00a0/g, ' ');

function maakPdf() {
  const { inv, r } = laatste;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const blauw = [15, 95, 140];
  let y = 18;
  doc.setTextColor(...blauw); doc.setFontSize(9); doc.text('INVISALIGN · BENELUX · CONCEPT', 14, y);
  doc.setTextColor(29, 36, 51); doc.setFontSize(18); doc.text('Praktijkanalyse aligners en Comprehensive 2x2', 14, (y += 8));
  doc.setFontSize(10);
  doc.text(pdfTekst(`${inv.praktijkNaam || 'Praktijk'}${inv.contact ? ' · ' + inv.contact : ''} · ${LANDEN[inv.land].naam} · ${new Date().toLocaleDateString('nl-NL')}`), 14, (y += 6));
  if (inv.rep) doc.text(pdfTekst(`Opgesteld met: ${inv.rep}`), 14, (y += 5));
  const tabel = (titel, head, body, opts = {}) => {
    doc.setFontSize(12); doc.setTextColor(...blauw); doc.text(titel, 14, (y += 9)); doc.setTextColor(29, 36, 51);
    doc.autoTable({ startY: y + 2, head: [head.map(pdfTekst)], body: body.map((r) => r.map(pdfTekst)), theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: blauw }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }, margin: { left: 14, right: 14 }, ...opts });
    y = doc.lastAutoTable.finalY;
    if (y > 250) { doc.addPage(); y = 14; }
  };
  const d = r.doel, n = r.nu;
  tabel('Kerncijfers', ['', 'Waarde'], [
    ['Stoeltijd per jaar vrij', `${getal(r.vrij)} uur`],
    ['Extra starts mogelijk in dezelfde tijd', getal(r.extraStarts)],
    ['Netto per stoeluur', `${eur(d.perUur)} (nu ${eur(n.perUur)})`],
    ['Eigen bijdrage ouders, tiener met aligners', eur(d.alT.ouders)],
  ]);
  tabel('Praktijk per jaar', ['', 'Nu', 'Scenario', 'Verschil'], [
    ['Tieners met aligners', pct(inv.tienersAlignerNu / 100), pct(inv.tienersAlignerDoel / 100), ''],
    ['Controle-interval aligners', `${getal(inv.intervalAlignerNu, 1)} wk`, `${getal(inv.intervalAlignerDoel, 1)} wk`, ''],
    ['Stoel- en artsentijd', `${getal(n.uren)} u`, `${getal(d.uren)} u`, `${getal(d.uren - n.uren)} u`],
    ['Bezetting', pct(n.bezetting), pct(d.bezetting), ''],
    ['Netto honorarium', eur(n.netto), eur(d.netto), eur(d.netto - n.netto)],
    ['Netto per stoeluur', eur(n.perUur), eur(d.perUur), eur(d.perUur - n.perUur)],
    [`Met ${getal(r.extraStarts)} extra starts`, '', eur(d.netto + r.extraNetto), eur(d.netto + r.extraNetto - n.netto)],
  ]);
  tabel('Per behandeling', ['', 'Vaste beugel', 'Aligner, nu', '2x2, scenario'], [
    ['Controlebezoeken', n.vast.controles, n.alT.controles, d.alT.controles],
    ['Stoel- en artsentijd', `${getal(n.vast.uren, 1)} u`, `${getal(n.alT.uren, 1)} u`, `${getal(d.alT.uren, 1)} u`],
    ['Totaalprijs', eur(n.vast.omzet), eur(n.alT.omzet), eur(d.alT.omzet)],
    ['Netto voor de praktijk', eur(n.vast.netto), eur(n.alT.netto), eur(d.alT.netto)],
    ['Netto per uur', eur(n.vast.perUur), eur(n.alT.perUur), eur(d.alT.perUur)],
    ['Eigen bijdrage ouders', eur(n.vast.ouders), eur(n.alT.ouders), eur(d.alT.ouders)],
  ]);
  const t = ALIGN_DATA.totaal, p = ALIGN_DATA.tienerMeerderheid;
  tabel('Comprehensive 2x2 past bij tieners (Align-data Benelux)', ['', 'Alle praktijken', '>50% tieners'], [
    ['Binnen 2x2 (≤ 2 extra sets)', pct(1 - t.driePlus), pct(1 - p.driePlus)],
    ['3 of meer extra sets', pct(t.driePlus), pct(p.driePlus)],
  ]);
  tabel('Labkosten per tiener bij uw tier', ['Product', 'Prijs', 'Verwacht'], r.productvergelijking.map((x) => [x.naam, eur(x.prijs), eur(x.verwacht)]));
  doc.setFontSize(12); doc.setTextColor(...blauw); doc.text('Advies', 14, (y += 9)); doc.setTextColor(29, 36, 51); doc.setFontSize(9);
  for (const a of [...adviezen(inv, r), ...r.kansen.map((k) => `${k.tool}: ${k.tekst}`)]) {
    const regels = doc.splitTextToSize('• ' + pdfTekst(a), 182);
    if (y + regels.length * 4.5 > 280) { doc.addPage(); y = 14; }
    doc.text(regels, 14, (y += 5)); y += (regels.length - 1) * 4.2;
  }
  doc.setFontSize(7.5); doc.setTextColor(91, 100, 117);
  const disc = doc.splitTextToSize('Concept ter validatie. Indicatieve berekening op basis van de invoer van de praktijk, de nationale tarieven (NZa 2026 / RIZIV 1-1-2026 / CNS 01-06-2026) en de Invisalign-prijslijsten 2026. Bindend zijn de prijzen op de Invisalign Doctor Site. Adviesprijzen zijn vrijblijvend; elke praktijk bepaalt haar eigen tarieven. Klinische keuzes, waaronder het controle-interval, blijven aan de behandelaar.', 182);
  if (y + 14 > 285) { doc.addPage(); y = 14; }
  doc.text(disc, 14, (y += 8));
  return doc;
}

async function verstuur() {
  const m = document.getElementById('melding');
  const { inv } = laatste;
  const doc = maakPdf();
  m.textContent = 'Versturen…';
  try {
    const res = await fetch('api/verstuur', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ aan: inv.emailPraktijk, cc: inv.emailRep, praktijk: inv.praktijkNaam, contact: inv.contact, rep: inv.rep,
        bestandsnaam: bestandsnaam(), pdf: doc.output('datauristring').split(',')[1] }),
    });
    if (!res.ok) throw new Error(await res.text());
    m.textContent = `Verstuurd naar ${inv.emailPraktijk}${inv.emailRep ? ', cc ' + inv.emailRep : ''}.`;
  } catch {
    doc.save(bestandsnaam());
    const onderwerp = encodeURIComponent(`Praktijkanalyse aligners – ${inv.praktijkNaam}`);
    const tekst = encodeURIComponent(`Beste ${inv.contact || 'collega'},\n\nIn de bijlage vindt u de praktijkanalyse die we samen hebben gemaakt.\n\nMet vriendelijke groet,\n${inv.rep}`);
    location.href = `mailto:${inv.emailPraktijk}?cc=${encodeURIComponent(inv.emailRep)}&subject=${onderwerp}&body=${tekst}`;
    m.textContent = 'Geen verzendserver bereikbaar: de pdf is gedownload en uw e-mailprogramma is geopend. Voeg de pdf als bijlage toe.';
  }
}

document.getElementById('pdf').onclick = () => maakPdf().save(bestandsnaam());
document.getElementById('mail').onclick = verstuur;
form.land.addEventListener('change', vulTiers);
form.addEventListener('input', render);
form.addEventListener('change', render);
vulTiers();
render();
