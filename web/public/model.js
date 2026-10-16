// Rekenmodel praktijkcalculator. Pure functies, geen DOM.
import { PRODUCTEN, EXTRA_SET_EX_BTW, TIERS, LANDEN, TARIEVEN, ALIGN_DATA, STOELTIJD } from './data.js';

const WEKEN_PER_MAAND = 52 / 12;
const som = (xs) => xs.reduce((a, b) => a + b, 0);

export function controles(maanden, intervalWeken) {
  return Math.max(0, Math.floor((maanden * WEKEN_PER_MAAND) / intervalWeken + 1e-9));
}

export function productprijs(land, product, tierId) {
  const btw = LANDEN[land].btw;
  const p = PRODUCTEN[product];
  if (p.vastExBtw) return p.vastExBtw * (1 + btw);
  const tier = TIERS[land].find((t) => t.id === tierId) ?? TIERS[land][0];
  return p.lijst * (1 - tier.korting) * (1 + btw);
}

// Verwacht aantal extra sets boven de 2 inbegrepen sets (ondergrens: 4+ AA telt als 2 extra).
export function verwachteExtraSets(profiel = ALIGN_DATA.groeiendMeerderheid) {
  return (profiel.driePlus - profiel.vierPlus) * 1 + profiel.vierPlus * 2;
}

export function labkosten(land, type, product, tierId, materiaalVast) {
  if (type === 'vast') return materiaalVast;
  const basis = productprijs(land, product, tierId);
  if (product !== 'c2x2teen') return basis;
  return basis + verwachteExtraSets() * EXTRA_SET_EX_BTW * (1 + LANDEN[land].btw);
}

// Stoel- en artsentijd in uren voor één behandeling.
export function uren(type, n, { opAfstand = 0, refinements = 0, stoeltijd = STOELTIJD } = {}) {
  const t = stoeltijd[type];
  const min = t.diagnostiek + t.start + n * t.controle + t.aantalSpoed * t.spoed + t.afronding + t.planning
    + (type === 'aligner' ? opAfstand * t.opAfstand + refinements * t.refinement : 0);
  return min / 60;
}

// Opbrengst en kosten van één behandeling volgens de regels van het land.
// omzet = wat de praktijk factureert (incl. doorberekende labkosten); netto = omzet − labkosten.
export function behandeling(land, s) {
  const { type, maanden, interval, opAfstand = false, lab, be = {}, lu = {}, nlPolis = { percentage: 1, maximum: 2000 } } = s;
  const n = controles(maanden, interval);
  const refinements = type === 'aligner' ? ALIGN_DATA.perLand[land].aaPerBehandeling : 0;
  let omzet, vergoeding = 0, afstand = 0;

  if (land === 'NL') {
    const T = TARIEVEN.NL;
    const metBezoek = Math.min(n, maanden);
    afstand = opAfstand && type === 'aligner' ? maanden - metBezoek : 0;
    const maand = type === 'aligner' ? T.maandAligner : T.maandVast;
    const vol = Math.min(metBezoek, 24);
    const honorarium = T.diagnostiek + (type === 'aligner' ? T.plaatsenAligner : T.plaatsenVast)
      + vol * maand + (metBezoek - vol) * T.maandVanaf25 + afstand * T.opAfstand + T.afronding;
    omzet = honorarium + lab; // techniekkosten tegen inkoopprijs
    vergoeding = Math.min(nlPolis.maximum, nlPolis.percentage * omzet); // aanvullende verzekering
  } else if (land === 'BE') {
    const T = TARIEVEN.BE;
    const plafond = Math.min(T.maxZittingen, T.maxZittingenPerHalfjaar * Math.ceil(maanden / 6));
    const zittingen = Math.min(n + 1, plafond);
    const forfaits = zittingen >= T.tweedeForfaitNaZittingen && maanden >= 6 ? 2 : 1;
    const eigen = type === 'aligner' ? be.prijsAligner : be.prijsVast;
    omzet = be.model === 'eigen' && eigen > 0 ? eigen : T.diagnostiekFactuur + forfaits * T.apparatuurMax + zittingen * T.zittingMax;
    vergoeding = T.diagnostiekTerug + forfaits * T.apparatuurTerug + zittingen * T.zittingTerug;
    const eigenDeel = Math.max(0, omzet - vergoeding);
    vergoeding += Math.min(T.aanvullend.maximum, T.aanvullend.percentage * eigenDeel);
  } else {
    const T = TARIEVEN.LU;
    const cns = T.eerste15Maanden + Math.ceil(Math.max(0, maanden - 15) / T.vervolgMaanden) * T.vervolgperiode;
    const cp8 = type === 'aligner' ? (lu.cp8 ?? 0) : 0;
    omzet = cns + cp8;
    vergoeding = cns + Math.min(T.aanvullendMax, cp8);
  }

  const u = uren(type, n, { opAfstand: afstand, refinements, stoeltijd: s.stoeltijd });
  const netto = omzet - lab;
  return { controles: n, afstand, omzet, lab, netto, uren: u, perUur: netto / u, vergoeding, ouders: Math.max(0, omzet - vergoeding) };
}

// Volledige praktijkberekening: huidige situatie tegenover het voorgestelde scenario.
export function praktijk(inv) {
  const land = inv.land;
  const capaciteit = inv.stoelen * inv.dagenPerWeek * inv.urenPerDag * inv.wekenPerJaar * (inv.orthoAandeel / 100);
  const tieners = inv.startsPerJaar * (inv.aandeelTieners / 100);
  const volw = inv.startsPerJaar - tieners;

  function scenario(alignerTieners, alignerVolw, intervalAligner, opAfstand, productTieners) {
    const basis = { opAfstand, be: inv.be, lu: inv.lu, nlPolis: inv.nlPolis, stoeltijd: inv.stoeltijd };
    const vast = behandeling(land, { ...basis, type: 'vast', maanden: inv.duurVast, interval: inv.intervalVast, lab: inv.materiaalVast });
    const alT = behandeling(land, { ...basis, type: 'aligner', maanden: inv.duurAligner, interval: intervalAligner,
      lab: labkosten(land, 'aligner', productTieners, inv.tier) });
    const alV = behandeling(land, { ...basis, type: 'aligner', maanden: inv.duurAligner, interval: intervalAligner,
      lab: labkosten(land, 'aligner', inv.productVolw, inv.tier) });
    const groepen = [
      { naam: 'Tieners – vaste beugel', aantal: tieners * (1 - alignerTieners / 100), b: vast },
      { naam: 'Tieners – aligners', aantal: tieners * (alignerTieners / 100), b: alT },
      { naam: 'Volwassenen – vaste beugel', aantal: volw * (1 - alignerVolw / 100), b: vast },
      { naam: 'Volwassenen – aligners', aantal: volw * (alignerVolw / 100), b: alV },
    ];
    const tot = (f) => som(groepen.map((g) => g.aantal * f(g.b)));
    const r = { groepen, vast, alT, alV, uren: tot((b) => b.uren), netto: tot((b) => b.netto), omzet: tot((b) => b.omzet), lab: tot((b) => b.lab) };
    r.perUur = r.netto / r.uren;
    r.bezetting = r.uren / capaciteit;
    r.marge = r.netto - r.uren * inv.kostenPerStoeluur;
    return r;
  }

  const nu = scenario(inv.tienersAlignerNu, inv.volwAlignerNu, inv.intervalAlignerNu, inv.opAfstandNu, inv.productTienersNu);
  const doel = scenario(inv.tienersAlignerDoel, inv.volwAlignerNu, inv.intervalAlignerDoel, inv.opAfstandDoel, 'c2x2teen');
  const vrij = nu.uren - doel.uren;
  const extraStarts = vrij > 0 ? vrij / doel.alT.uren : 0;
  const extraNetto = extraStarts * doel.alT.netto;

  // Productkeuze tieners: labkosten per behandeling bij het eigen tier.
  const productvergelijking = ['c2x2teen', 'c3x3', 'unlimited'].map((p) => ({
    product: p, naam: PRODUCTEN[p].naam, prijs: productprijs(land, p, inv.tier), verwacht: labkosten(land, 'aligner', p, inv.tier),
  }));
  const tienerAligners = tieners * (inv.tienersAlignerDoel / 100);
  const besparingLab = tienerAligners * (labkosten(land, 'aligner', inv.productTienersNu, inv.tier) - labkosten(land, 'aligner', 'c2x2teen', inv.tier));

  return { capaciteit, tieners, volw, nu, doel, vrij, extraStarts, extraNetto, productvergelijking, besparingLab, kansen: kansen(inv, doel) };
}

// Kansen met digitale tools: indicatie van tijdwinst per jaar (aannames instelbaar).
export function kansen(inv, doel) {
  const k = [];
  const alignerStarts = som(doel.groepen.filter((g) => g.naam.includes('aligner')).map((g) => g.aantal));
  const D = ALIGN_DATA.digitaal;
  if (!inv.tools.itero) {
    const scans = alignerStarts * (1 + ALIGN_DATA.perLand[inv.land].aaPerBehandeling);
    const m = inv.aannames.minutenPerAfdrukBespaard;
    k.push({ tool: 'iTero intraorale scanner', uren: m > 0 ? (scans * m) / 60 : null,
      tekst: `±${Math.round(scans)} afdrukken per jaar (starts + refinements). Stoeltijdwinst per scan is in studies niet aangetoond (Burzynski 2018); de winst zit in minder afgekeurde afdrukken (Benelux: ${(D.afgekeurdeAfdrukken * 100).toFixed(1)}% bij 98% digitale cases), een kortere doorlooptijd (${D.itero.dagenMet} tegenover ${D.itero.dagenZonder} dagen in de Align-data) en het tonen van het verwachte resultaat (Outcome Simulator) bij het adviesgesprek.` });
  }
  if (!inv.tools.monitoring) {
    k.push({ tool: 'Monitoring op afstand (Virtual Care / Dental Monitoring)', uren: null,
      tekst: 'Maakt een controle-interval van 10–12 weken verantwoord (Hansa 2021: gemiddeld 1 bezoek per 16 weken bij gelijke nauwkeurigheid). Zonder monitoring adviseren we maximaal 8 weken.' });
  }
  if (!inv.tools.ipp) {
    const mods = alignerStarts * (D.ipp.modsZonder - D.ipp.modsMet);
    k.push({ tool: 'Invisalign Personalized Plan (IPP) en IPL-templates', uren: (mods * inv.aannames.minutenPerModificatie) / 60,
      tekst: `In de Align-data hebben IPP-gebruikers ${D.ipp.modsMet} tegenover ${D.ipp.modsZonder} ClinCheck-modificaties per case, en een doorlooptijd van ${D.ipp.dagenMet} tegenover ${D.ipp.dagenZonder} dagen. Bij ${inv.aannames.minutenPerModificatie} minuten per modificatie.` });
  }
  return k;
}
