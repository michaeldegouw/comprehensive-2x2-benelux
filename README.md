# Invisalign Comprehensive 2x2 – Benelux

Case studies voor artsen in **Nederland, België en Luxemburg**. Ze laten zien hoe Comprehensive 2x2, met een vaste labprijs van €1.000 ex btw en minder controlebezoeken, de behandeling betaalbaarder maakt voor patiënten en ouders. Ze laten ook zien wat het de praktijk per uur oplevert, vergeleken met een blokjesbeugel.

> **Status: CONCEPT.** Alles moet nog worden gevalideerd door artsen. De bronnen zijn via zoekresultaten verzameld en nog niet in de originele documenten gecontroleerd.

## Inhoud

| Map | Inhoud |
|---|---|
| [`nl/`](nl/case-study-nl.md) | Case study Nederland: NZa-tarieven, techniekkosten tegen inkoopprijs, F517 alleen in maanden met een bezoek |
| [`be/`](be/case-study-be.md) | Case study België: RIZIV-forfait per zitting, maximumtarieven 2026, adviespakketprijs |
| [`lu/`](lu/case-study-lu.md) | Case study Luxemburg: CNS-vergoeding per periode, supplement via CP8 |
| [`gedeeld/`](gedeeld/klinisch-protocol.md) | Klinisch kader voor het controle-interval, gelijk voor alle landen |
| [`validatie/`](validatie/validatieformulier.md) | Formulier voor de validerende artsen, met per stelling een ID |
| [`calculator/`](calculator/) | Rekenmodel (`rekenmodel.mjs`), alle invoer (`aannames.json`) en de uitkomsten (`uitkomsten.md`) |
| [`onderzoek/`](onderzoek/) | Het volledige onderzoek per land en over de klinische literatuur, met bron-URL's |

## Hoe de markten verschillen

| | Nederland | België | Luxemburg |
|---|---|---|---|
| Labprijs incl. btw | €1.210 (21%) | €1.060 (6%) | €1.170 (17%, te bevestigen) |
| Prijsstelling | NZa-maximumtarieven, techniekkosten tegen inkoopprijs | Vrij (niet-geconventioneerd) of akkoord- en maximumtarieven | Verplicht CNS-tarief + eventueel CP8-supplement |
| Controle betaald | Per kalendermaand **met** bezoek | Per **zitting** | Per **periode** (6 / 9 maanden) |
| Gevolg van minder bezoeken | Gezin betaalt minder, praktijk minder honorarium maar veel minder stoeltijd | Minder RIZIV-terugbetaling, gezin netto toch goedkoper uit | CNS-inkomsten gelijk, alleen tijdwinst |

## Rekenmodel draaien

```bash
node calculator/rekenmodel.mjs   # schrijft calculator/uitkomsten.md
```

Alle bedragen in de documenten komen uit dit model. Verandert er een tarief of aanname, pas dan `aannames.json` aan en draai het model opnieuw. Het model is ook de basis voor de latere webcalculator.

## Nog te doen

**Productvoorwaarden en facturatie (opgave Align):**
- Wat houdt "2x2" precies in: looptijd, aantal extra sets, retainers?
- Met welke btw factureert Align in Luxemburg?

**Officiële bronnen controleren:**
- NZa-beschikking TB/REG-26617-01
- RIZIV-tarieftabel 1/1/2026 en het akkoord 2026-2027
- CNS-nomenclatuur 01.06.2026

**Juridisch en fiscaal:**
- Juridische check van de adviesprijs (mededinging) in België en Luxemburg
- Fiscale check van de btw-behandeling per land

**Vertalingen:** Franstalige versie voor België en Luxemburg.

**Validatie en calculator:**
- Validatie door artsen via het formulier
- Webcalculator bouwen op basis van `calculator/`
