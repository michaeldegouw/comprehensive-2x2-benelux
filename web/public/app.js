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
    tienersAlignerDoel: n('tienersAlignerDoel'), extraAdoptie: n('extraAdoptie'), intervalAlignerDoel: n('intervalAlignerDoel'), opAfstandDoel: f.opAfstandDoel.checked,
    aannames: { minutenPerAfdrukBespaard: n('minutenPerAfdrukBespaard'), minutenPerModificatie: n('minutenPerModificatie') },
    stoeltijd,
  };
}

function adviezen(inv, r) {
  const a = [], A = r.A, B = r.B;
  if (inv.intervalAlignerDoel > 8 && !inv.opAfstandDoel) a.push('Een interval van meer dan 8 weken adviseren we alleen met monitoring op afstand tussen de bezoeken.');
  if (inv.intervalAlignerDoel >= 10) a.push('Plan de eerste controle 4–6 weken na de start. Ga pas daarna naar 10–12 weken, als pasvorm, draagdiscipline en attachments in orde zijn. Kort het interval in bij IPR, elastieken, groeisturing of matige draagdiscipline.');
  if (A.vrij > 0) a.push(`Meer aligners en een langer interval maken ${getal(A.vrij)} stoeluren per jaar vrij. Daarmee zijn ongeveer ${getal(A.extraStarts)} extra starts mogelijk${inv.wachtlijst ? ', of kan de wachtlijst korter' : ''}.`);
  if (B.labVerschil > 0) {
    if (inv.land === 'NL') a.push(`Met Comprehensive 2x2 betalen ouders ${eur(B.labVerschil)} minder per tienerbehandeling. De techniekkosten worden tegen inkoopprijs doorberekend. Daardoor ligt de alignerbehandeling nog ${eur(Math.abs(B.verschilMetVast))} ${B.verschilMetVast >= 0 ? 'boven' : 'onder'} de prijs van een blokjesbeugel.`);
    if (inv.land === 'BE' && inv.be.model === 'max') a.push(`Bij de maximumtarieven blijft de prijs voor het gezin gelijk. Met Comprehensive 2x2 houdt de praktijk ${eur(B.labVerschil)} per tienerbehandeling meer over.`);
    else if (inv.land === 'BE') a.push(`Met Comprehensive 2x2 kan de prijs voor tieners omlaag van ${eur(inv.be.prijsAligner)} naar ${eur(B.met2x2.alT.omzet)}, terwijl de praktijk per behandeling evenveel overhoudt. Dat is ${eur(Math.abs(B.verschilMetVast))} ${B.verschilMetVast >= 0 ? 'boven' : 'onder'} uw prijs voor een blokjesbeugel.`);
    if (inv.land === 'LU') a.push(B.labVerschil >= inv.lu.cp8
      ? `Met Comprehensive 2x2 kan het CP8-supplement voor tieners vervallen (nu ${eur(inv.lu.cp8)}): de CNS vergoedt dan de hele behandeling, en de praktijk houdt toch ${eur(B.labVerschil - inv.lu.cp8)} per behandeling meer over.`
      : `Met Comprehensive 2x2 kan het CP8-supplement voor tieners omlaag van ${eur(inv.lu.cp8)} naar ${eur(inv.lu.cp8 - B.labVerschil)}, terwijl de praktijk evenveel overhoudt.`);
  } else a.push('Bij uw tier is Comprehensive 2x2 niet goedkoper dan het huidige product. Kies per casus het pakket met de laagste verwachte labkosten.');
  if (inv.land === 'BE' && inv.be.model === 'max') a.push('Bij de maximumtarieven moeten de labkosten binnen het plafond worden opgevangen. 2x2 verlaagt die kosten direct. Plan minimaal 6 zittingen voor het tweede apparatuurforfait.');
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

  const { A, B } = r; const n = A.nu, al = A.aligners, m = B.met2x2;
  const verschil = (a, b, f = eur) => `<span class="${a - b >= 0 ? 'plus' : 'min'}">${a - b >= 0 ? '+' : '−'}${f(Math.abs(a - b))}</span>`;
  const bars = (rijen) => { const mx = Math.max(...rijen.map((x) => x[1])); return rijen.map(([l, v, hl, f]) => `<div class="bar"><div class="lbl">${l}</div><div class="track"><div class="fill ${hl ? '' : 'alt'}" style="width:${Math.max(4, (v / mx) * 100)}%"></div></div><div class="val">${(f || eur)(v)}</div></div>`).join(''); };
  const profiel = ALIGN_DATA.tienerMeerderheid, tot = ALIGN_DATA.totaal;
  const prijsLabel = inv.land === 'NL' ? 'Totaalprijs (NZa-honorarium + techniekkosten)' : inv.land === 'BE' ? 'Prijs voor het gezin' : 'Totaal (CNS-tarief + CP8)';

  uit.innerHTML = `
  <div class="kaart">
    <h2>${esc(inv.praktijkNaam || 'Uw praktijk')} · ${L}</h2>
    <div class="kpis">
      <div class="kpi"><div class="v">${getal(A.vrij)} u</div><div class="l">stoeltijd per jaar vrij met aligners</div></div>
      <div class="kpi"><div class="v">+${getal(A.extraStarts)}</div><div class="l">extra starts mogelijk in dezelfde tijd</div></div>
      <div class="kpi"><div class="v">${eur(B.labVerschil)}</div><div class="l">lagere labkosten per tiener met 2x2</div></div>
      <div class="kpi"><div class="v">${B.verschilMetVast >= 0 ? '+' : '−'}${eur(Math.abs(B.verschilMetVast))}</div><div class="l">prijsverschil aligner 2x2 met blokjesbeugel</div></div>
    </div>
  </div>

  <div class="kaart">
    <h2>A. Aligners en de bedrijfsvoering</h2>
    <p>Dit geldt voor elk Invisalign-product: minder bezoeken, minder spoedbezoeken en minder stoeltijd per bezoek. Gerekend met uw huidige product en prijs.</p>
    <div class="tabel"><table>
      <tr><th>Per behandeling</th><th class="n">Vaste beugel</th><th class="n">Aligners</th></tr>
      <tr><td>Controlebezoeken in de praktijk</td><td class="n">${al.vast.controles}</td><td class="n">${al.alT.controles}${al.alT.afstand ? ` (+ ${al.alT.afstand} op afstand)` : ''}</td></tr>
      <tr><td>Spoedbezoeken (gemiddeld, Borda 2020)</td><td class="n">${getal(inv.stoeltijd.vast.aantalSpoed, 1)}</td><td class="n">${getal(inv.stoeltijd.aligner.aantalSpoed, 1)}</td></tr>
      <tr><td>Stoel- en artsentijd</td><td class="n">${getal(al.vast.uren, 1)} u</td><td class="n">${getal(al.alT.uren, 1)} u</td></tr>
      <tr><td>Netto voor de praktijk (na lab)</td><td class="n">${eur(al.vast.netto)}</td><td class="n">${eur(al.alT.netto)}</td></tr>
      <tr class="hl"><td>Netto per stoeluur</td><td class="n">${eur(al.vast.perUur)}</td><td class="n">${eur(al.alT.perUur)}</td></tr>
    </table></div>
    ${bars([['Vaste beugel', al.vast.uren, false, (x) => getal(x, 1) + ' u'], ['Aligners', al.alT.uren, true, (x) => getal(x, 1) + ' u']])}
    <div class="tabel"><table>
      <tr><th>Per jaar</th><th class="n">Nu</th><th class="n">Meer aligners</th><th class="n">Verschil</th></tr>
      <tr><td>Tieners met aligners</td><td class="n">${pct(inv.tienersAlignerNu / 100)}</td><td class="n">${pct(inv.tienersAlignerDoel / 100)}</td><td></td></tr>
      <tr><td>Controle-interval aligners</td><td class="n">${getal(inv.intervalAlignerNu, 1)} wk</td><td class="n">${getal(inv.intervalAlignerDoel, 1)} wk</td><td></td></tr>
      <tr><td>Stoel- en artsentijd orthodontie</td><td class="n">${getal(n.uren)} u</td><td class="n">${getal(al.uren)} u</td><td class="n">${verschil(al.uren, n.uren, (x) => getal(x) + ' u')}</td></tr>
      <tr><td>Bezetting capaciteit (${getal(r.capaciteit)} u)</td><td class="n">${pct(n.bezetting)}</td><td class="n">${pct(al.bezetting)}</td><td></td></tr>
      <tr><td>Netto honorarium</td><td class="n">${eur(n.netto)}</td><td class="n">${eur(al.netto)}</td><td class="n">${verschil(al.netto, n.netto)}</td></tr>
      <tr><td>Netto per stoeluur</td><td class="n">${eur(n.perUur)}</td><td class="n">${eur(al.perUur)}</td><td class="n">${verschil(al.perUur, n.perUur)}</td></tr>
      <tr class="hl"><td>Vrijgekomen tijd ingezet voor ${getal(A.extraStarts)} extra starts</td><td class="n">${eur(n.netto)}</td><td class="n">${eur(al.netto + A.extraNetto)}</td><td class="n">${verschil(al.netto + A.extraNetto, n.netto)}</td></tr>
    </table></div>
    <small>Gelijk aantal starts; alleen de verhouding vaste beugel/aligners en het interval veranderen. Stoeltijdaannames zijn aanpasbaar onderaan het formulier.</small>
  </div>

  <div class="kaart">
    <h2>B. Comprehensive 2x2: de beste keuze voor tieners</h2>
    <p>${inv.land === 'NL' ? 'In Nederland gaan de techniekkosten tegen inkoopprijs naar de patiënt. Het lagere labbedrag komt dus direct bij de ouders terecht, en de alignerbehandeling komt bijna op de prijs van een blokjesbeugel.' : 'De praktijk houdt per behandeling hetzelfde over, maar kan de prijs voor tieners verlagen met het verschil in labkosten. Zo worden aligners voor meer gezinnen betaalbaar.'}</p>
    <div class="tabel"><table>
      <tr><th>Per tiener</th><th class="n">Blokjesbeugel</th><th class="n">Aligners, ${esc(PRODUCTEN[inv.productTienersNu].naam.split(' (')[0])}</th><th class="n">Aligners, 2x2</th></tr>
      <tr><td>Labkosten</td><td class="n">${eur(m.vast.lab)}</td><td class="n">${eur(B.labHuidig)}</td><td class="n">${eur(B.lab2x2)}</td></tr>
      <tr class="hl"><td>${prijsLabel}</td><td class="n">${eur(m.vast.omzet)}</td><td class="n">${eur(al.alT.omzet)}</td><td class="n">${eur(m.alT.omzet)}</td></tr>
      <tr><td>Eigen bijdrage ouders na vergoeding</td><td class="n">${eur(m.vast.ouders)}</td><td class="n">${eur(al.alT.ouders)}</td><td class="n">${eur(m.alT.ouders)}</td></tr>
      <tr><td>Netto voor de praktijk</td><td class="n">${eur(m.vast.netto)}</td><td class="n">${eur(al.alT.netto)}</td><td class="n">${eur(m.alT.netto)}</td></tr>
    </table></div>
    ${bars([['Blokjesbeugel', m.vast.omzet], ['Aligners nu', al.alT.omzet], ['Aligners 2x2', m.alT.omzet, true]])}
    <p>Per jaar: ${getal(m.tienersAligner)} tieners met 2x2 betalen samen <strong>${eur(B.besparingOuders)}</strong> minder${B.extraTieners > 0 ? `, en bij ${inv.extraAdoptie}%-punt meer keuze voor aligners zijn dat ${getal(B.extraTieners)} tieners extra` : ''}.</p>

    <h3>Past 2x2 bij de behandeling? De Align-data Benelux</h3>
    <div class="tabel"><table>
      <tr><th>Benodigde extra sets</th><th class="n">Alle praktijken</th><th class="n">Praktijken met &gt;50% tieners</th></tr>
      <tr><td>0 of 1</td><td class="n">${pct(tot.geen + tot.een)}</td><td class="n">${pct(1 - profiel.twee - profiel.driePlus)}</td></tr>
      <tr><td>2</td><td class="n">${pct(tot.twee)}</td><td class="n">${pct(profiel.twee)}</td></tr>
      <tr class="hl"><td>Binnen 2x2</td><td class="n">${pct(1 - tot.driePlus)}</td><td class="n">${pct(1 - profiel.driePlus)}</td></tr>
      <tr><td>3 of meer (€200 per extra set)</td><td class="n">${pct(tot.driePlus)}</td><td class="n">${pct(profiel.driePlus)}</td></tr>
    </table></div>
    <small>${ALIGN_DATA.bron}. ${getal(tot.behandelingen)} behandelingen bij ${getal(tot.artsen)} artsen; ${pct(tot.binnen2j)} van de extra sets binnen 2 jaar. Ingedeeld naar het aandeel tieners per arts, niet per patiënt.</small>
    <div class="tabel"><table>
      <tr><th>Labkosten per tiener bij uw tier</th><th class="n">Prijs</th><th class="n">Verwacht incl. extra sets</th></tr>
      ${B.productvergelijking.map((p) => `<tr class="${p.product === 'c2x2teen' ? 'hl' : ''}"><td>${p.naam}</td><td class="n">${eur(p.prijs)}</td><td class="n">${eur(p.verwacht)}</td></tr>`).join('')}
    </table></div>
    <p><strong>Klinisch, bij tieners:</strong> 15,7 tegenover 21,3 afspraken en 0,4 tegenover 1,0 spoedbezoeken met aligners, met een gelijk resultaat (PAR) en minder witte vlekken (Oki 2026). Bij matige tot ernstige casussen 16 tegenover 24 bezoeken (Chou 2023). Kanttekening: één Amerikaanse praktijkstudie vond gemiddeld ±2,5 refinements (Kravitz 2023). Selecteer complexe casussen bewust.</p>
  </div>

  <div class="kaart">
    <h2>Kansen met digitale tools</h2>
    ${r.kansen.length ? `<ul class="advies">${r.kansen.map((k) => `<li><strong>${k.tool}</strong>${k.uren ? ` · ±${getal(k.uren)} u/jaar` : ''}<br>${k.tekst}</li>`).join('')}</ul>` : '<p>Alle tools in de calculator worden al gebruikt.</p>'}
    <small>Align-data: verband, geen bewezen oorzaak.</small>
  </div>

  <div class="kaart">
    <h2>Advies</h2>
    <ul class="advies">${adviezen(inv, r).map((x) => `<li>${x}</li>`).join('')}</ul>
  </div>`;
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
  const { A, B } = r; const n = A.nu, al = A.aligners, m = B.met2x2;
  tabel('Kerncijfers', ['', 'Waarde'], [
    ['Stoeltijd per jaar vrij met aligners', `${getal(A.vrij)} uur`],
    ['Extra starts mogelijk in dezelfde tijd', getal(A.extraStarts)],
    ['Lagere labkosten per tiener met 2x2', eur(B.labVerschil)],
    ['Prijsverschil aligner 2x2 met blokjesbeugel', eur(B.verschilMetVast)],
  ]);
  tabel('A. Aligners en de bedrijfsvoering, per behandeling', ['', 'Vaste beugel', 'Aligners'], [
    ['Controlebezoeken', al.vast.controles, al.alT.controles],
    ['Spoedbezoeken', getal(inv.stoeltijd.vast.aantalSpoed, 1), getal(inv.stoeltijd.aligner.aantalSpoed, 1)],
    ['Stoel- en artsentijd', `${getal(al.vast.uren, 1)} u`, `${getal(al.alT.uren, 1)} u`],
    ['Netto voor de praktijk', eur(al.vast.netto), eur(al.alT.netto)],
    ['Netto per stoeluur', eur(al.vast.perUur), eur(al.alT.perUur)],
  ]);
  tabel('A. Per jaar', ['', 'Nu', 'Meer aligners', 'Verschil'], [
    ['Tieners met aligners', pct(inv.tienersAlignerNu / 100), pct(inv.tienersAlignerDoel / 100), ''],
    ['Controle-interval aligners', `${getal(inv.intervalAlignerNu, 1)} wk`, `${getal(inv.intervalAlignerDoel, 1)} wk`, ''],
    ['Stoel- en artsentijd', `${getal(n.uren)} u`, `${getal(al.uren)} u`, `${getal(al.uren - n.uren)} u`],
    ['Netto honorarium', eur(n.netto), eur(al.netto), eur(al.netto - n.netto)],
    ['Netto per stoeluur', eur(n.perUur), eur(al.perUur), eur(al.perUur - n.perUur)],
    [`Met ${getal(A.extraStarts)} extra starts`, eur(n.netto), eur(al.netto + A.extraNetto), eur(al.netto + A.extraNetto - n.netto)],
  ]);
  tabel('B. Comprehensive 2x2 voor tieners, per behandeling', ['', 'Blokjesbeugel', 'Aligners nu', 'Aligners 2x2'], [
    ['Labkosten', eur(m.vast.lab), eur(B.labHuidig), eur(B.lab2x2)],
    ['Prijs voor het gezin', eur(m.vast.omzet), eur(al.alT.omzet), eur(m.alT.omzet)],
    ['Eigen bijdrage na vergoeding', eur(m.vast.ouders), eur(al.alT.ouders), eur(m.alT.ouders)],
    ['Netto voor de praktijk', eur(m.vast.netto), eur(al.alT.netto), eur(m.alT.netto)],
  ]);
  const t = ALIGN_DATA.totaal, p = ALIGN_DATA.tienerMeerderheid;
  tabel('B. Past binnen 2x2 (Align-data Benelux)', ['', 'Alle praktijken', '>50% tieners'], [
    ['Binnen 2x2 (≤ 2 extra sets)', pct(1 - t.driePlus), pct(1 - p.driePlus)],
    ['3 of meer extra sets', pct(t.driePlus), pct(p.driePlus)],
  ]);
  tabel('B. Labkosten per tiener bij uw tier', ['Product', 'Prijs', 'Verwacht'], B.productvergelijking.map((x) => [x.naam, eur(x.prijs), eur(x.verwacht)]));
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
