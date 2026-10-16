# Analyse Align-data Benelux

Bron: zes exports van Align (oktober 2026), aangeleverd door de opdrachtgever. De ruwe bestanden bevatten namen, e-mailadressen, telefoonnummers en omzet per arts. Ze staan daarom **niet** in deze repository. Hier staan alleen totalen en gemiddelden. De cijfers per groep staan in [`../data/align-benelux-aggregaten.json`](../data/align-benelux-aggregaten.json).

## 1. Hoeveel extra sets zijn nodig? (basis voor "past binnen 2x2")

Bestand: primaire behandelingen met gekoppelde orders voor additional aligners (AA), per arts. Gewogen naar het aantal behandelingen. Het gaat om alle producten en leeftijden.

| | Alle artsen | NL | BE | LU | Orthodontisten |
|---|---|---|---|---|---|
| Artsen | 2.416 | 1.386 | 899 | 131 | 992 |
| Primaire behandelingen | 212.364 | 119.999 | 78.634 | 13.731 | 172.913 |
| Geen extra set | 24,5% | 27,0% | 21,3% | 21,2% | 21,0% |
| 1 extra set | 39,1% | 39,1% | 38,8% | 40,6% | 39,2% |
| 2 extra sets | 21,8% | 20,6% | 23,4% | 23,1% | 23,1% |
| **Binnen 2x2 (max. 2 extra sets)** | **85,4%** | **86,7%** | **83,5%** | **84,8%** | **83,3%** |
| 3 of meer | 14,6% | 13,3% | 16,5% | 15,2% | 16,7% |
| 4 of meer | 6,2% | 5,6% | 7,1% | 6,0% | 7,1% |
| Extra sets binnen 2 jaar na start | 88,3% | 88,5% | 87,6% | 90,2% | 87,5% |

### Naar patiëntmix van de arts

Gekoppeld met het doktersbestand. De indeling is naar het aandeel van de patiënten van de arts, op artsniveau, niet per patiënt:

| Aandeel van de cases | Artsen | Behandelingen | 2 extra sets | 3+ | **Binnen 2x2** |
|---|---|---|---|---|---|
| Tieners > 50% | 44 | 6.617 | 22,5% | 11,5% | **88,5%** |
| Groeiende patiënten (kind + tiener) > 50% | 177 | 63.830 | 24,7% | 19,7% | **80,3%** |
| Groeiende patiënten < 10% | 79 | 16.000 | 17,5% | 7,3% | 92,7% |

**Hoe dit te lezen:**
- **Tieners passen goed.** In praktijken waar vooral tieners worden behandeld, blijft 88% binnen de 2 extra sets.
- **Groeiende patiënten iets minder.** Praktijken met veel groeiende patiënten (inclusief Invisalign First en Mandibular Advancement) hebben vaker 3+ extra sets: 80% blijft binnen 2x2.
- **De extra set van €200.** Ook bij die 20% komt een extra set van €200 per stuk ruim onder de prijs van Comprehensive 3x3 of unlimited uit, behalve bij de hoogste tiers en contractprijzen. Zie §3.
- **Wat nog nodig is: een export per patiënt** met leeftijd bij de start en het aantal AA-orders. Dat is het sterkste bewijs, en sluit uit dat artsen met veel tieners ook op andere punten verschillen.

**Kanttekening uit de literatuur.** Eén Amerikaanse praktijkstudie vond gemiddeld ±2,5 refinements per behandeling, met 6% zonder refinement (Kravitz 2023, AJODO). Dat ligt hoger dan de Benelux-data. Mogelijke oorzaken zijn de selectie van casussen, de manier van tellen, en of refinements per set of per order worden geteld. Laat de validatiegroep dit beoordelen.

## 2. Digitale tools (verband, geen oorzaak)

Bestand: digitale tools per arts. Gewogen naar CCA's. AMR → CCA = doorlooptijd van ontvangst van het dossier tot goedgekeurd behandelplan (definitie te bevestigen door Align).

| Groep | Artsen | Dagen AMR → CCA | ClinCheck-modificaties per case |
|---|---|---|---|
| Alle | 1.072 | 17,8 | 1,23 |
| IPP-gebruiker | 176 | **16,6** | **1,17** |
| Geen IPP | 896 | 21,9 | 1,43 |
| IPL ≥ 90% van cases | 271 | 16,3 | 1,10 |
| IPL < 50% | 603 | 19,1 | 1,39 |
| iTero ≥ 90% van cases | 483 | 17,9 | 1,23 |
| iTero < 50% | 517 | 23,1 | 1,47 |

**Wat dit wel en niet zegt:**
- **Overige cijfers:** afgekeurde afdrukken 0,66% van de CCA's, en 98% van de cases is digitaal.
- **Geen oorzaak-gevolg.** Gebruikers van tools hebben vaak meer volume en ervaring.
- **Meer extra sets bij toolgebruikers.** Artsen met iTero, IOSim Pro en Smile Video bestellen gemiddeld *meer* extra sets. Dat komt waarschijnlijk door volume en complexere casussen, niet door de tools.

## 3. Prijsvergelijking per tier (prijslijsten 2026, incl. btw)

Comprehensive 2x2 voor 19 jaar en jonger is in elke tier hetzelfde bedrag. Met één extra set (€200 ex btw) komt het hoger uit dan Comprehensive 3x3 alleen bij de hoogste tier of contractprijzen:

| | 2x2 tiener | 2x2 + 1 extra set | 3x3 hoogste tier | 3x3 contract |
|---|---|---|---|---|
| NL | €1.210 | €1.452 | €1.411 (200+ cases) | – |
| BE | €1.060 | €1.272 | €1.339 (Blue Diamond II) | €1.208 |
| LU | €1.170 | €1.404 | €1.478 (Blue Diamond II) | €1.334 |

## 4. Beperkingen van de data

- **Orderexport afgekapt:** de export van AA-orders telt 150.003 regels en loopt van februari 2019 tot februari 2024. Dat is vermoedelijk de exportlimiet.
- **Periode onbekend:** de periode van de primaire behandelingen staat niet in het bestand.
- **Ook lopende behandelingen:** behandelingen die nog lopen, kunnen later nog extra sets nodig hebben. Daardoor is het aandeel "binnen 2x2" eerder iets te hoog dan te laag.
