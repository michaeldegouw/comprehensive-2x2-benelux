// Rekenmodel Comprehensive 2x2 – referentie voor de documenten en de latere webcalculator.
// Alle invoer staat in aannames.json. Draaien: `node calculator/rekenmodel.mjs` (schrijft uitkomsten.md).

import { readFileSync, writeFileSync } from 'node:fs';

const A = JSON.parse(readFileSync(new URL('./aannames.json', import.meta.url)));
const WEKEN_PER_MAAND = 52 / 12;

export function aantalControles(maanden, intervalWeken) {
  return Math.floor((maanden * WEKEN_PER_MAAND) / intervalWeken + 1e-9);
}

// Stoel- en artsentijd in minuten voor één behandeling.
export function stoeltijd(type, controles, consultenOpAfstand = 0) {
  const t = A.stoeltijdMinuten;
  return (
    t.diagnostiek[type] +
    t.start[type] +
    controles * t.controle[type] +
    t.aantalSpoedbezoeken[type] * t.spoedbezoek[type] +
    t.afronding[type] +
    t.planningBuitenStoel[type] +
    consultenOpAfstand * (t.consultOpAfstand.aligner ?? 0)
  );
}

// Totaal aantal alignersets (initieel + additional). Inbegrepen: 3; daarboven per set bij te bestellen.
export function labkosten(type, btw, sets = A.product.setsInbegrepen.waarde) {
  if (type !== 'aligner') return A.vasteBeugel.materiaalBracketsBogen.waarde;
  const extra = Math.max(0, sets - A.product.setsInbegrepen.waarde);
  return (A.product.labprijsExBtw.waarde + extra * A.product.extraSetExBtw.waarde) * (1 + btw);
}

// ---------- Nederland (NZa) ----------
export function nl({ type, maanden, intervalWeken, opAfstand = false, sets }) {
  const T = A.nl.tarieven;
  const controles = aantalControles(maanden, intervalWeken);
  // Maximaal één maandconsult per kalendermaand, alleen in maanden met een bezoek.
  const maandenMetBezoek = Math.min(controles, maanden);
  const afstand = opAfstand ? maanden - maandenMetBezoek : 0;
  const maandtarief = type === 'aligner' ? T.F517 : T.F516;
  const vol = Math.min(maandenMetBezoek, A.nl.regels.F521VanafBehandelmaand - 1);
  const laag = maandenMetBezoek - vol; // vanaf 25e behandelmaand F521 (F520-maanden genegeerd)

  const posten = {
    diagnostiek: T.F121 + T.F125 + T.F126,
    plaatsen: type === 'aligner' ? T.F471 : T.F461,
    maandconsulten: vol * maandtarief + laag * T.F521,
    consultenOpAfstand: afstand * T.F520,
    afronding: 2 * T.F492,
  };
  const honorarium = Object.values(posten).reduce((a, b) => a + b, 0);
  const techniek = labkosten(type, A.nl.btw.waarde, sets);
  const patient = honorarium + techniek;
  const v = A.nl.voorbeeldVerzekering;
  const vergoeding = Math.min(v.maximum, v.percentage * patient);
  const minuten = stoeltijd(type, controles, afstand);
  return {
    controles, maandenMetBezoek, afstand, posten, honorarium, techniek, patient,
    ouders: patient - vergoeding,
    praktijkNetto: honorarium, // techniekkosten worden tegen inkoopprijs doorberekend
    uren: minuten / 60,
    perUur: honorarium / (minuten / 60),
  };
}

// ---------- België (RIZIV) ----------
export function be({ type, maanden, intervalWeken, model, pakketprijs, sets }) {
  const R = A.be.riziv;
  const M = A.be.maximumtarieven2026;
  const controles = aantalControles(maanden, intervalWeken);
  // De eerste zitting valt op de dag van plaatsen; max 6 per halfjaar en 36 totaal.
  const plafond = Math.min(R.maxZittingen, R.maxZittingenPerHalfjaar * Math.ceil(maanden / 6));
  const zittingen = Math.min(controles + 1, plafond);
  const forfaits =
    zittingen >= R.tweedeApparatuurforfaitNaZittingen && maanden >= R.tweedeApparatuurforfaitVanafMaand ? 2 : 1;

  const factuur =
    model === 'pakket'
      ? pakketprijs
      : R.diagnostiekFactuur + forfaits * M.apparatuur + zittingen * M.zitting;
  const riziv = R.diagnostiekTerugbetaling + forfaits * R.apparatuurTerugbetaling + zittingen * R.zittingTerugbetaling;
  const eigenDeel = Math.max(0, factuur - riziv);
  const av = A.be.voorbeeldAanvullend;
  const aanvullend = Math.min(av.maximum, av.percentage * eigenDeel);
  const lab = labkosten(type, A.be.btw.waarde, sets);
  const minuten = stoeltijd(type, controles);
  return {
    controles, zittingen, forfaits, factuur, riziv, eigenDeel, aanvullend,
    ouders: eigenDeel - aanvullend,
    lab,
    praktijkNetto: factuur - lab,
    uren: minuten / 60,
    perUur: (factuur - lab) / (minuten / 60),
  };
}

// Pakketprijs waarbij een aligner per uur evenveel oplevert als de referentie.
export function beBreakEvenPakket(referentiePerUur, alignerScenario) {
  const s = be({ ...alignerScenario, model: 'pakket', pakketprijs: 0 });
  return s.lab + referentiePerUur * s.uren;
}

// ---------- Luxemburg (CNS) ----------
export function cnsInkomsten(maanden) {
  const C = A.lu.cns;
  return C.eerste15Maanden + Math.ceil(Math.max(0, maanden - 15) / C.vervolgperiodeMaanden) * C.vervolgperiode;
}

export function lu({ type, maanden, intervalWeken, cp8 = 0, sets }) {
  const controles = aantalControles(maanden, intervalWeken);
  const cns = cnsInkomsten(maanden);
  const lab = labkosten(type, A.lu.btw.waarde, sets);
  const aanvullend = Math.min(A.lu.voorbeeldAanvullend.maximum, cp8);
  const minuten = stoeltijd(type, controles);
  return {
    controles, cns, cp8, lab,
    ouders: cp8 - aanvullend + cns * (1 - A.lu.cns.vergoedingOnder18),
    praktijkNetto: cns + cp8 - lab,
    uren: minuten / 60,
    perUur: (cns + cp8 - lab) / (minuten / 60),
  };
}

// ---------- Uitkomsten voor de documenten ----------
const eur = (x) => '€ ' + x.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const uur = (x) => x.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + ' u';
const D = A.product.behandelduurMaanden.waarde;
const VD = A.vasteBeugel.behandelduurMaanden.waarde;
const VI = A.vasteBeugel.intervalWeken.waarde;

function tabel(kop, rijen) {
  return [`| ${kop.join(' | ')} |`, `|${kop.map(() => '---').join('|')}|`, ...rijen.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

export function uitkomsten() {
  const out = [`# Uitkomsten rekenmodel\n\nGegenereerd uit \`aannames.json\` met \`node calculator/rekenmodel.mjs\`. Niet met de hand aanpassen.\n`];

  // NL
  const nlS = {
    'Vaste beugel, 24 mnd, maandelijks': nl({ type: 'vast', maanden: VD, intervalWeken: VI }),
    'Aligner 2x2, 18 mnd, maandelijks': nl({ type: 'aligner', maanden: D, intervalWeken: VI }),
    'Aligner 2x2, 18 mnd, elke 11 wkn': nl({ type: 'aligner', maanden: D, intervalWeken: 11 }),
    'Aligner 2x2, 18 mnd, elke 11 wkn + F520 tussenmaanden': nl({ type: 'aligner', maanden: D, intervalWeken: 11, opAfstand: true }),
  };
  out.push('## Nederland (NZa 2026, tarief A)\n');
  out.push(tabel(
    ['Scenario', 'Controles', 'Honorarium', 'Techniekkosten', 'Totaal patiënt', 'Ouders na verzekering*', 'Stoel- en artsentijd', 'Honorarium per uur'],
    Object.entries(nlS).map(([k, s]) => [k, s.controles, eur(s.honorarium), eur(s.techniek), eur(s.patient), eur(s.ouders), uur(s.uren), eur(s.perUur)]),
  ));
  out.push('\n*Voorbeeldpolis 100% tot €2.000.\n');

  // BE
  const beVast = be({ type: 'vast', maanden: VD, intervalWeken: VI, model: 'max' });
  const beAlMaand = be({ type: 'aligner', maanden: D, intervalWeken: VI, model: 'max' });
  const beAl11 = be({ type: 'aligner', maanden: D, intervalWeken: 11, model: 'max' });
  const marktVast = be({ type: 'vast', maanden: VD, intervalWeken: VI, model: 'pakket', pakketprijs: A.be.marktprijsVasteBeugel.waarde });
  const breakEven = beBreakEvenPakket(marktVast.perUur, { type: 'aligner', maanden: D, intervalWeken: 11 });
  const pakketten = [2450, 2950].map((p) => [p, be({ type: 'aligner', maanden: D, intervalWeken: 11, model: 'pakket', pakketprijs: p })]);
  out.push('## België\n\n### A. Geconventioneerd, maximumtarieven 2026 als totaalplafond (interpretatie)\n');
  out.push(tabel(
    ['Scenario', 'Zittingen', 'App.-forfaits', 'Factuur', 'RIZIV', 'Eigen deel', 'Ouders na CM*', 'Praktijk na lab', 'Tijd', 'Per uur'],
    [['Vaste beugel, 24 mnd, maandelijks', beVast], ['Aligner 2x2, 18 mnd, maandelijks', beAlMaand], ['Aligner 2x2, 18 mnd, elke 11 wkn', beAl11]]
      .map(([k, s]) => [k, s.zittingen, s.forfaits, eur(s.factuur), eur(s.riziv), eur(s.eigenDeel), eur(s.ouders), eur(s.praktijkNetto), uur(s.uren), eur(s.perUur)]),
  ));
  out.push('\n*CM: 60% van het eigen deel, max. €1.500.\n\n### B. Vrije pakketprijs (niet-geconventioneerd)\n');
  out.push(tabel(
    ['Scenario', 'Pakketprijs', 'RIZIV', 'Ouders na CM', 'Praktijk na lab', 'Tijd', 'Per uur'],
    [[`Vaste beugel, marktprijs`, marktVast, A.be.marktprijsVasteBeugel.waarde], ...pakketten.map(([p, s]) => [`Aligner 2x2, elke 11 wkn`, s, p])]
      .map(([k, s, p]) => [k, eur(p), eur(s.riziv), eur(s.ouders), eur(s.praktijkNetto), uur(s.uren), eur(s.perUur)]),
  ));
  out.push(`\nPakketprijs aligner (elke 11 wkn) met hetzelfde bedrag per uur als een vaste beugel van ${eur(A.be.marktprijsVasteBeugel.waarde)}: **${eur(breakEven)}**.\n`);

  // LU
  const luVast = lu({ type: 'vast', maanden: VD, intervalWeken: VI });
  const luAl0 = lu({ type: 'aligner', maanden: D, intervalWeken: 11, cp8: 0 });
  const verschil = luVast.praktijkNetto - luAl0.praktijkNetto;
  const luAlCp = lu({ type: 'aligner', maanden: D, intervalWeken: 11, cp8: Math.round(verschil) });
  const luAlMaand = lu({ type: 'aligner', maanden: D, intervalWeken: VI, cp8: Math.round(verschil) });
  out.push('## Luxemburg (CNS, interpretatie: DT-forfait inclusief apparaat)\n');
  out.push(tabel(
    ['Scenario', 'Controles', 'CNS', 'CP8', 'Lab', 'Ouders**', 'Praktijk na lab', 'Tijd', 'Per uur'],
    [['Vaste beugel, 24 mnd, maandelijks', luVast], ['Aligner 2x2, elke 11 wkn, geen CP8', luAl0], ['Aligner 2x2, maandelijks, CP8 = materiaalverschil', luAlMaand], ['Aligner 2x2, elke 11 wkn, CP8 = materiaalverschil', luAlCp]]
      .map(([k, s]) => [k, s.controles, eur(s.cns), eur(s.cp8), eur(s.lab), eur(s.ouders), eur(s.praktijkNetto), uur(s.uren), eur(s.perUur)]),
  ));
  out.push('\n**Kind < 18: CNS 100%; CP8 deels gedekt door CMCM Denta & OptiPlus (max. €500, niet geverifieerd).\n');

  // Sets en adviesprijzen
  out.push('## Labkosten per aantal sets (incl. btw)\n');
  out.push(tabel(['Sets totaal', 'Nederland (21%)', 'België (6%)', 'Luxemburg (17%)'],
    [3, 4, 5].map((n) => [n === 3 ? '3 (inbegrepen)' : String(n), eur(labkosten('aligner', A.nl.btw.waarde, n)), eur(labkosten('aligner', A.be.btw.waarde, n)), eur(labkosten('aligner', A.lu.btw.waarde, n))]),
  ));
  const m = A.mrsp;
  out.push('\n## Adviesprijs (MRSP) per markt, controle elke 11 weken\n');
  const rij = (land, sets, s, prijs) => [land, sets, eur(prijs), eur(s.ouders), eur(s.praktijkNetto), eur(s.perUur)];
  const r = [];
  for (const n of [3, 4]) {
    const s = nl({ type: 'aligner', maanden: D, intervalWeken: 11, sets: n });
    r.push(rij('Nederland (NZa-begroting)', n, s, s.patient));
  }
  for (const n of [3, 4]) {
    const extra = labkosten('aligner', A.be.btw.waarde, n) - labkosten('aligner', A.be.btw.waarde, 3);
    const s = be({ type: 'aligner', maanden: D, intervalWeken: 11, model: 'pakket', pakketprijs: m.be.pakketprijs + extra, sets: n });
    r.push(rij('België (pakket, niet-geconv.)', n, s, s.factuur));
  }
  for (const n of [3, 4]) {
    const extra = labkosten('aligner', A.lu.btw.waarde, n) - labkosten('aligner', A.lu.btw.waarde, 3);
    const s = lu({ type: 'aligner', maanden: D, intervalWeken: 11, cp8: m.lu.cp8 + extra, sets: n });
    r.push(rij('Luxemburg (CNS + CP8)', n, s, s.cp8));
  }
  out.push(tabel(['Markt', 'Sets', 'Adviesprijs*', 'Ouders na verzekering', 'Praktijk na lab', 'Per uur'], r));
  out.push('\n*NL: totale NZa-begroting. BE: all-in pakketprijs; extra set tegen inkoopprijs erbij. LU: CP8-supplement bovenop het CNS-tarief; extra set tegen inkoopprijs erbij.\n');
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const md = uitkomsten();
  writeFileSync(new URL('./uitkomsten.md', import.meta.url), md + '\n');
  console.log(md);
}
