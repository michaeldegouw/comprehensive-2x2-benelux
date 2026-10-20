// Rekenmodel praktijkcalculator. Pure functies, geen DOM.
import { PRODUCTEN, EXTRA_SET_EX_BTW, TIERS, LANDEN, TARIEVEN, ALIGN_DATA, STOELTIJD, TIER_DREMPELS_NL } from './data.js';

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

// Volledige praktijkberekening in twee delen.
// A: aligners tegenover vaste beugel (bedrijfsvoering) – product gelijk aan het huidige.
// B: Comprehensive 2x2 als productkeuze voor tieners – lagere labkosten worden doorgegeven in de prijs.
export function praktijk(inv) {
  const land = inv.land;
  const capaciteit = inv.stoelen * inv.dagenPerWeek * inv.urenPerDag * inv.wekenPerJaar * (inv.orthoAandeel / 100);
  const tieners = inv.startsPerJaar * (inv.aandeelTieners / 100);
  const volw = inv.startsPerJaar - tieners;
  const labHuidig = labkosten(land, 'aligner', inv.productTienersNu, inv.tier);
  const lab2x2 = labkosten(land, 'aligner', 'c2x2teen', inv.tier);
  const labVerschil = labHuidig - lab2x2; // per tienerbehandeling

  function scenario({ alignerTieners, interval, opAfstand, product }) {
    const met2x2 = product === 'c2x2teen';
    // In BE en LU geeft de praktijk het labverschil door in de prijs: gelijke marge, lagere prijs.
    const beT = { ...inv.be, prijsAligner: met2x2 ? inv.be.prijsAligner - labVerschil : inv.be.prijsAligner };
    const luT = { cp8: met2x2 ? Math.max(0, inv.lu.cp8 - labVerschil) : inv.lu.cp8 };
    const basis = { opAfstand, nlPolis: inv.nlPolis, stoeltijd: inv.stoeltijd };
    const vast = behandeling(land, { ...basis, be: inv.be, lu: inv.lu, type: 'vast', maanden: inv.duurVast, interval: inv.intervalVast, lab: inv.materiaalVast });
    const alT = behandeling(land, { ...basis, be: beT, lu: luT, type: 'aligner', maanden: inv.duurAligner, interval,
      lab: met2x2 ? lab2x2 : labHuidig });
    const alV = behandeling(land, { ...basis, be: { ...inv.be, prijsAligner: inv.be.prijsAlignerVolw ?? inv.be.prijsAligner }, lu: inv.lu,
      type: 'aligner', maanden: inv.duurAligner, interval, lab: labkosten(land, 'aligner', inv.productVolw, inv.tier) });
    const groepen = [
      { naam: 'Tieners – vaste beugel', aantal: tieners * (1 - alignerTieners / 100), b: vast },
      { naam: 'Tieners – aligners', aantal: tieners * (alignerTieners / 100), b: alT },
      { naam: 'Volwassenen – vaste beugel', aantal: volw * (1 - inv.volwAlignerNu / 100), b: vast },
      { naam: 'Volwassenen – aligners', aantal: volw * (inv.volwAlignerNu / 100), b: alV },
    ];
    const tot = (f) => som(groepen.map((g) => g.aantal * f(g.b)));
    const r = { groepen, vast, alT, alV, uren: tot((b) => b.uren), netto: tot((b) => b.netto), omzet: tot((b) => b.omzet), lab: tot((b) => b.lab) };
    r.perUur = r.netto / r.uren;
    r.bezetting = r.uren / capaciteit;
    r.marge = r.netto - r.uren * inv.kostenPerStoeluur;
    r.tienersAligner = tieners * (alignerTieners / 100);
    return r;
  }

  // A. Bedrijfsvoering
  const nu = scenario({ alignerTieners: inv.tienersAlignerNu, interval: inv.intervalAlignerNu, opAfstand: inv.opAfstandNu, product: inv.productTienersNu });
  const aligners = scenario({ alignerTieners: inv.tienersAlignerDoel, interval: inv.intervalAlignerDoel, opAfstand: inv.opAfstandDoel, product: inv.productTienersNu });
  const vrij = nu.uren - aligners.uren;
  const extraStarts = vrij > 0 ? vrij / aligners.alT.uren : 0;
  const A = { nu, aligners, vrij, extraStarts, extraNetto: extraStarts * aligners.alT.netto };

  // B. Comprehensive 2x2 voor tieners
  const doelB = Math.min(100, inv.tienersAlignerDoel + inv.extraAdoptie);
  const met2x2 = scenario({ alignerTieners: doelB, interval: inv.intervalAlignerDoel, opAfstand: inv.opAfstandDoel, product: 'c2x2teen' });
  const productvergelijking = ['c2x2teen', 'c3x3', 'unlimited'].map((p) => ({
    product: p, naam: PRODUCTEN[p].naam, prijs: productprijs(land, p, inv.tier), verwacht: labkosten(land, 'aligner', p, inv.tier),
  }));
  const B = {
    met2x2, labHuidig, lab2x2, labVerschil, doelB, productvergelijking,
    besparingOuders: met2x2.tienersAligner * (aligners.alT.omzet - met2x2.alT.omzet),
    verschilMetVast: met2x2.alT.omzet - met2x2.vast.omzet,
    verschilMetVastHuidig: aligners.alT.omzet - aligners.vast.omzet,
    extraTieners: met2x2.tienersAligner - aligners.tienersAligner,
  };

  return { capaciteit, tieners, volw, A, B, kansen: kansen(inv, aligners) };
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

// C. Invisalign tegenover een andere aligner: volledige rekensom per jaar.
// De prijzen en voorzieningen van de andere leverancier worden door de praktijk ingevuld.
export function vergelijking(inv, r) {
  const c = inv.concurrent;
  if (!(c.prijs > 0)) return null;
  const land = inv.land;
  const al = r.A.aligners;
  const tienerCases = r.B.met2x2.tienersAligner, volwCases = r.volw * (inv.volwAlignerNu / 100);
  const cases = tienerCases + volwCases;
  const aa = ALIGN_DATA.perLand[land].aaPerBehandeling;
  // Tieners met Comprehensive 2x2 (vaste prijs), volwassenen met het gekozen product bij de eigen tier.
  const labTiener = r.B.lab2x2, labVolw = labkosten(land, 'aligner', inv.productVolw, inv.tier);
  const invisalign = cases > 0 ? (tienerCases * labTiener + volwCases * labVolw) / cases : labVolw;
  const extraRefConcurrent = Math.max(0, aa - c.refinementsInbegrepen) * c.prijsRefinement;
  const concurrent = c.prijs + extraRefConcurrent;
  const meerkosten = (invisalign - concurrent) * cases;
  const uurwaarde = inv.kostenPerStoeluur;
  const D = ALIGN_DATA.digitaal;
  const posten = [];
  const heeft = (id) => c.voorzieningen.includes(id);
  if (!heeft('monitoring') && inv.opAfstandDoel) {
    const bezoeken = c.bezoekenMinderMetMonitoring; // per case, Hansa 2020/2021: 2,3–3,5
    posten.push({ naam: 'Minder bezoeken door monitoring op afstand', bedrag: cases * bezoeken * (inv.stoeltijd.aligner.controle / 60) * uurwaarde,
      bron: `${getalNl(bezoeken, 1)} bezoeken per case (Hansa 2020: −2,3; Hansa 2021: −3,5) × ${inv.stoeltijd.aligner.controle} min × €${uurwaarde}/u` });
  }
  if (!heeft('templates') || !heeft('liveupdate')) {
    const mods = D.ipp.modsZonder - D.ipp.modsMet;
    posten.push({ naam: 'Minder aanpassingen aan het behandelplan (IPP, Live Update)', bedrag: cases * mods * (inv.aannames.minutenPerModificatie / 60) * uurwaarde,
      bron: `${getalNl(mods, 2)} modificaties per case minder (Align-data Benelux, verband) × ${inv.aannames.minutenPerModificatie} min` });
  }
  if (!heeft('simulator')) {
    posten.push({ naam: 'Meer patiënten die starten na visualisatie', bedrag: c.adviesgesprekken * (c.conversieExtra / 100) * al.alT.netto,
      bron: `${c.adviesgesprekken} adviesgesprekken × ${c.conversieExtra}%-punt meer starts × netto per case (inschatting praktijk)` });
  }
  if (!heeft('leads') && c.extraLeads > 0) {
    posten.push({ naam: 'Patiënten via consumentencampagnes en Doctor Locator', bedrag: c.extraLeads * (c.leadConversie / 100) * al.alT.netto,
      bron: `${c.extraLeads} aanvragen × ${c.leadConversie}% start × netto per case (inschatting praktijk)` });
  }
  if (r.B.labVerschil > 0 && !c.heeftTienerprijs) {
    posten.push({ naam: 'Comprehensive 2x2 tegen vaste prijs voor tieners', bedrag: 0, info: true,
      bron: 'Zie deel B: lagere prijs voor ouders bij gelijke marge.' });
  }
  const voordeel = posten.reduce((a, p) => a + p.bedrag, 0);
  // NL: techniekkosten gaan tegen inkoopprijs naar de patiënt, dus een labverschil raakt de patiënt, niet de praktijk.
  const viaPatient = land === 'NL';
  return { cases, tienerCases, volwCases, labTiener, labVolw, invisalign, concurrent, extraRefConcurrent, meerkosten, viaPatient, posten, voordeel,
    netto: viaPatient ? voordeel : voordeel - meerkosten, breakEvenPerCase: cases > 0 ? voordeel / cases : 0 };
}

// D. Groeien met Invisalign: volgende kortingstier (NL op basis van cases per jaar).
export function groei(inv, r) {
  const land = inv.land;
  const casesPerJaar = r.B.met2x2.tienersAligner + r.volw * (inv.volwAlignerNu / 100); // zelfde scenario als deel B en C
  // Comprehensive 2x2 voor tieners heeft een vaste prijs; de tierkorting telt voor de overige cases.
  const aandeelMetKorting = casesPerJaar > 0 ? (r.volw * (inv.volwAlignerNu / 100)) / casesPerJaar : 0;
  const tiers = TIERS[land];
  let huidig = tiers.findIndex((t) => t.id === inv.tier);
  if (huidig < 0) huidig = 0;
  // NL: tier volgt uit het aantal cases; meld als de ingevulde tier lager is dan het volume rechtvaardigt.
  const tierVolgensVolume = land === 'NL' ? TIER_DREMPELS_NL.filter((d) => casesPerJaar >= d).length - 1 : null;
  const volgende = tiers[huidig + 1];
  if (!volgende) return { casesPerJaar, volgende: null, tierVolgensVolume };
  const drempel = land === 'NL' ? TIER_DREMPELS_NL[huidig + 1] : inv.drempelVolgendeTier || null;
  const prijsNu = productprijs(land, inv.productVolw, inv.tier);
  const prijsVolgend = productprijs(land, inv.productVolw, volgende.id);
  return { casesPerJaar, volgende, drempel, tierVolgensVolume, huidigIndex: huidig, nodig: drempel ? Math.max(0, drempel - casesPerJaar) : null,
    besparingPerCase: prijsNu - prijsVolgend, besparingPerJaar: (prijsNu - prijsVolgend) * Math.max(casesPerJaar, drempel || 0) * aandeelMetKorting };
}

const getalNl = (x, d = 0) => x.toLocaleString('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: d });
