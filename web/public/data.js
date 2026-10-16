// Invoergegevens voor de praktijkcalculator. Alle bedragen in euro.
// Prijslijsten: Invisalign Price List 1 maart – 31 december 2026 (NL, BE, LU).
// Tarieven: onderzoek/onderzoek-*.md (nog in officiële bron te controleren).
// Align-data: data/align-benelux-aggregaten.json (geaggregeerd, geen persoonsgegevens).

export const PRODUCTEN = {
  unlimited: { naam: 'Comprehensive – unlimited (5 jaar)', lijst: 2730 },
  c3x3: { naam: 'Comprehensive – 3x3 (3 jaar, 3 sets)', lijst: 2430 },
  c2x2volw: { naam: 'Comprehensive – 2x2 volwassenen', lijst: 2195 },
  c2x2teen: { naam: 'Comprehensive – 2x2, 19 jaar en jonger', vastExBtw: 1000 },
  moderate: { naam: 'Moderate (dual arch)', lijst: 1845 },
  lite: { naam: 'Lite (dual arch)', lijst: 1615 },
  vivera: { naam: 'Vivera (dual arch)', lijst: 357 },
};

// Extra set boven de 2 inbegrepen sets van Comprehensive 2x2 (opgave Align; ex btw aangenomen).
export const EXTRA_SET_EX_BTW = 200;

// Kortingstiers per land (korting op lijstprijs ex btw).
export const TIERS = {
  NL: [
    { id: 't0', naam: '0–9 cases', korting: 0 },
    { id: 't1', naam: '10–49 cases', korting: 0.30 },
    { id: 't2', naam: '50–99 cases', korting: 0.40 },
    { id: 't3', naam: '100–199 cases', korting: 0.46 },
    { id: 't4', naam: '200+ cases', korting: 0.52 },
  ],
  BE: [
    ['Bronze', 0], ['Silver', 0.10], ['Gold I', 0.20], ['Gold II', 0.25], ['Platinum I', 0.30], ['Platinum II', 0.35],
    ['Platinum Elite I', 0.40], ['Platinum Elite II', 0.425], ['Diamond I', 0.445], ['Diamond II', 0.46],
    ['Blue Diamond I', 0.47], ['Blue Diamond II', 0.48],
  ].map(([naam, korting], i) => ({ id: 't' + i, naam, korting })),
};
TIERS.LU = TIERS.BE;

export const LANDEN = {
  NL: { naam: 'Nederland', btw: 0.21 },
  BE: { naam: 'België', btw: 0.06 },
  LU: { naam: 'Luxemburg', btw: 0.17 },
};

// Nationale tarieven (zie onderzoek/). Status: via zoekresultaten, nog te controleren.
export const TARIEVEN = {
  NL: { // NZa 2026 tarief A
    diagnostiek: 28.51 + 18.99 + 68.54, // F121 + F125 + F126
    plaatsenVast: 633.24, plaatsenAligner: 614.53, // F461 / F471
    maandVast: 46.31, maandAligner: 46.31, // F516 / F517
    maandVanaf25: 32.42, // F521
    opAfstand: 15.51, // F520
    afronding: 2 * 106.65, // 2 × F492
  },
  BE: { // RIZIV 1/1/2026 + maximumtarieven akkoord 2026-2027
    diagnostiekFactuur: 107, diagnostiekTerug: 81.75,
    apparatuurMax: 758, zittingMax: 40.5,
    apparatuurTerug: 192.31, zittingTerug: 23.30,
    maxZittingenPerHalfjaar: 6, maxZittingen: 36, tweedeForfaitNaZittingen: 6,
    aanvullend: { percentage: 0.6, maximum: 1500, naam: 'CM' },
  },
  LU: { // CNS nomenclatuur 01.06.2026
    eerste15Maanden: 1833.5, vervolgperiode: 637.7, vervolgMaanden: 9,
    aanvullendMax: 500,
  },
};

// Benchmarks uit Align-data Benelux (geaggregeerd over artsen; alle leeftijden en producten tenzij vermeld).
export const ALIGN_DATA = {
  bron: 'Align Benelux, primaire behandelingen met gekoppelde additional aligner (AA) orders; export oktober 2026',
  totaal: { artsen: 2416, behandelingen: 212364, geen: 0.245, een: 0.391, twee: 0.218, driePlus: 0.146, vierPlus: 0.062, binnen2j: 0.883 },
  groeiendMeerderheid: { artsen: 177, behandelingen: 63830, twee: 0.247, driePlus: 0.197, vierPlus: 0.084 },
  tienerMeerderheid: { artsen: 44, behandelingen: 6617, twee: 0.225, driePlus: 0.115, vierPlus: 0.039 },
  perLand: {
    NL: { binnen2x2: 0.867, aaPerBehandeling: 1.30 },
    BE: { binnen2x2: 0.835, aaPerBehandeling: 1.48 },
    LU: { binnen2x2: 0.848, aaPerBehandeling: 1.43 },
  },
  digitaal: { // gewogen per CCA, correlatie, geen oorzaak-gevolg
    ipp: { dagenMet: 16.6, dagenZonder: 21.9, modsMet: 1.17, modsZonder: 1.43 },
    ipl: { dagenMet: 16.3, dagenZonder: 19.1, modsMet: 1.10, modsZonder: 1.39 },
    itero: { dagenMet: 17.9, dagenZonder: 23.1, modsMet: 1.23, modsZonder: 1.47 },
    afgekeurdeAfdrukken: 0.0066,
  },
};

// Standaardaannames voor stoeltijd (minuten), door validatiegroep te toetsen.
export const STOELTIJD = {
  vast: { diagnostiek: 45, start: 75, controle: 20, spoed: 15, aantalSpoed: 3.6, afronding: 45, planning: 0 },
  aligner: { diagnostiek: 45, start: 45, controle: 15, spoed: 15, aantalSpoed: 0.8, afronding: 20, planning: 30, opAfstand: 5, refinement: 20 },
};
