# Uitkomsten rekenmodel

Gegenereerd uit `aannames.json` met `node calculator/rekenmodel.mjs`. Niet met de hand aanpassen.

## Nederland (NZa 2026, tarief A)

| Scenario | Controles | Honorarium | Techniekkosten | Totaal patiënt | Ouders na verzekering* | Stoel- en artsentijd | Honorarium per uur |
|---|---|---|---|---|---|---|---|
| Vaste beugel, 24 mnd, maandelijks | 24 | € 2.074 | € 240 | € 2.314 | € 314 | 11,7 u | € 178 |
| Aligner 2x2, 18 mnd, maandelijks | 18 | € 1.777 | € 1.210 | € 2.987 | € 987 | 7 u | € 253 |
| Aligner 2x2, 18 mnd, elke 11 wkn | 7 | € 1.268 | € 1.210 | € 2.478 | € 478 | 4,3 u | € 296 |
| Aligner 2x2, 18 mnd, elke 11 wkn + F520 tussenmaanden | 7 | € 1.439 | € 1.210 | € 2.649 | € 649 | 5,2 u | € 277 |

*Voorbeeldpolis 100% tot €2.000.

## België

### A. Geconventioneerd, maximumtarieven 2026 als totaalplafond (interpretatie)

| Scenario | Zittingen | App.-forfaits | Factuur | RIZIV | Eigen deel | Ouders na CM* | Praktijk na lab | Tijd | Per uur |
|---|---|---|---|---|---|---|---|---|---|
| Vaste beugel, 24 mnd, maandelijks | 24 | 2 | € 2.595 | € 1.026 | € 1.569 | € 628 | € 2.355 | 11,7 u | € 202 |
| Aligner 2x2, 18 mnd, maandelijks | 18 | 2 | € 2.352 | € 886 | € 1.466 | € 586 | € 1.292 | 7 u | € 184 |
| Aligner 2x2, 18 mnd, elke 11 wkn | 8 | 2 | € 1.947 | € 653 | € 1.294 | € 518 | € 887 | 4,3 u | € 207 |

*CM: 60% van het eigen deel, max. €1.500.

### B. Vrije pakketprijs (niet-geconventioneerd)

| Scenario | Pakketprijs | RIZIV | Ouders na CM | Praktijk na lab | Tijd | Per uur |
|---|---|---|---|---|---|---|
| Vaste beugel, marktprijs | € 3.500 | € 1.026 | € 990 | € 3.260 | 11,7 u | € 280 |
| Aligner 2x2, elke 11 wkn | € 2.450 | € 653 | € 719 | € 1.390 | 4,3 u | € 325 |
| Aligner 2x2, elke 11 wkn | € 2.950 | € 653 | € 919 | € 1.890 | 4,3 u | € 441 |

Pakketprijs aligner (elke 11 wkn) met hetzelfde bedrag per uur als een vaste beugel van € 3.500: **€ 2.259**.

## Luxemburg (CNS, interpretatie: DT-forfait inclusief apparaat)

| Scenario | Controles | CNS | CP8 | Lab | Ouders** | Praktijk na lab | Tijd | Per uur |
|---|---|---|---|---|---|---|---|---|
| Vaste beugel, 24 mnd, maandelijks | 24 | € 2.471 | € 0 | € 240 | € 0 | € 2.231 | 11,7 u | € 192 |
| Aligner 2x2, elke 11 wkn, geen CP8 | 7 | € 2.471 | € 0 | € 1.170 | € 0 | € 1.301 | 4,3 u | € 304 |
| Aligner 2x2, maandelijks, CP8 = materiaalverschil | 18 | € 2.471 | € 930 | € 1.170 | € 430 | € 2.231 | 7 u | € 317 |
| Aligner 2x2, elke 11 wkn, CP8 = materiaalverschil | 7 | € 2.471 | € 930 | € 1.170 | € 430 | € 2.231 | 4,3 u | € 521 |

**Kind < 18: CNS 100%; CP8 deels gedekt door CMCM Denta & OptiPlus (max. €500, niet geverifieerd).

## Labkosten per aantal sets (incl. btw)

| Sets totaal | Nederland (21%) | België (6%) | Luxemburg (17%) |
|---|---|---|---|
| 3 (inbegrepen) | € 1.210 | € 1.060 | € 1.170 |
| 4 | € 1.452 | € 1.272 | € 1.404 |
| 5 | € 1.694 | € 1.484 | € 1.638 |

## Adviesprijs (MRSP) als totaalprijs per markt, controle elke 11 weken

| Markt | Sets | Honorarium arts | Labkosten | Totaalprijs | Vergoeding* | Ouders | Per uur |
|---|---|---|---|---|---|---|---|
| NL – NZa-tarieven | 3 | € 1.268 | € 1.210 | € 2.478 | € 2.000 | € 478 | € 296 |
| NL – NZa-tarieven | 4 | € 1.268 | € 1.452 | € 2.720 | € 2.000 | € 720 | € 296 |
| BE – geconventioneerd (maximumtarieven) | 3 | € 887 | € 1.060 | € 1.947 | € 1.429 | € 518 | € 207 |
| BE – geconventioneerd (maximumtarieven) | 4 | € 675 | € 1.272 | € 1.947 | € 1.429 | € 518 | € 158 |
| BE – niet-geconventioneerd (pakket) | 3 | € 1.690 | € 1.060 | € 2.750 | € 1.911 | € 839 | € 395 |
| BE – niet-geconventioneerd (pakket) | 4 | € 1.690 | € 1.272 | € 2.962 | € 2.038 | € 924 | € 395 |
| LU – CNS-tarief + CP8 | 3 | € 2.231 | € 1.170 | € 3.401 | € 2.971 | € 430 | € 521 |
| LU – CNS-tarief + CP8 | 4 | € 2.231 | € 1.404 | € 3.635 | € 2.971 | € 664 | € 521 |

*NL: aanvullende verzekering (voorbeeld 100% tot €2.000). BE: RIZIV + CM (60%, max. €1.500). LU: CNS 100% (< 18 jaar) + CMCM Denta & OptiPlus (max. €500). BE geconventioneerd: de praktijk vangt de labkosten op binnen de maximumtarieven, dus een vierde set verlaagt het honorarium.

