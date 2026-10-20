# Praktijkcalculator (webpagina)

Een webpagina waarop een vertegenwoordiger samen met de praktijk de gegevens invult. De pagina laat zien wat aligners en Comprehensive 2x2 voor tieners betekenen: per behandeling, per jaar en voor de ouders. Aan het eind maakt de vertegenwoordiger een pdf. Die kan worden gedownload of direct naar de praktijk gemaild, met de vertegenwoordiger in cc.

## Opbouw

| Bestand | Inhoud |
|---|---|
| `public/index.html`, `style.css` | Invulformulier en resultaatweergave |
| `public/data.js` | Prijslijsten 2026, NZa/RIZIV/CNS-tarieven, Align-benchmarks (geaggregeerd), standaardaannames |
| `public/model.js` | Rekenmodel (pure functies). Deel A: aligners tegenover vaste beugel, met het huidige product. Deel B: Comprehensive 2x2 voor tieners; het labverschil gaat in NL via de techniekkosten en in BE/LU via een lagere prijs of een lager supplement naar de ouders |
| `public/app.js` | Weergave, pdf (jsPDF, lokaal in `vendor/`) en versturen |
| `worker.js`, `wrangler.jsonc` | Cloudflare Worker: wachtwoord en pdf mailen via Resend |
| `build-voorbeeld.mjs` | Maakt `../voorbeeld/praktijkcalculator.html`: één los bestand om te bekijken. **Zonder wachtwoord en zonder mail.** |

## Opzet: stappenplan voor vertegenwoordigers

De tool is bedoeld voor eigen medewerkers. Zij lopen samen met de klant door zes korte stappen:

1. **Praktijk.** Hier kies je ook de route:
   - **Snel:** alleen de kernvragen; de rest zijn Nederlandse gemiddelden.
   - **Op maat:** alle aannames zichtbaar.
2. **Patiënten.** De tier wordt automatisch bepaald uit het aantal cases.
3. **Werkwijze en tools.**
4. **Plan.**
5. **Concurrent** (optioneel).
6. **Uitkomst en versturen.**

Rechts staat tijdens het invullen een voorlopige uitkomst. De invoer wordt tussentijds opgeslagen in de browser van de vertegenwoordiger. "Nieuwe analyse" wist die gegevens.

De opzet volgt gangbare richtlijnen voor stappenplannen en waardecalculators:
- één onderwerp per stap, met voortgang zichtbaar;
- realistische standaardwaarden;
- extra velden pas op verzoek;
- weinig rekenposten;
- vergelijking met de huidige situatie.

Zie het gesprek of `../onderzoek/` voor de bronnen.

## Inloggen per vertegenwoordiger

- **Eigen account.** Iedere vertegenwoordiger heeft een eigen gebruikersnaam en wachtwoord. Accounts staan in het geheim `GEBRUIKERS`. Wachtwoorden worden alleen opgeslagen als PBKDF2-hash met 100.000 rondes.
- **Account aanmaken:**
  ```bash
  node web/gebruiker-toevoegen.mjs jjansen "Jan Jansen" j.jansen@aligntech.com
  ```
  Plak de regel in het JSON-geheim en voer daarna `npx wrangler secret put GEBRUIKERS` uit.
- **Account verwijderen:** haal de regel uit `GEBRUIKERS` en zet het geheim opnieuw. Bestaande sessies vervallen dan direct.
- **Na inloggen** worden naam en e-mail van de vertegenwoordiger automatisch gebruikt. De pdf gaat naar de praktijk, met **altijd** de ingelogde vertegenwoordiger in cc; een ander cc-adres is niet mogelijk.

## Installeren (na akkoord van Align IT/Compliance)

```bash
cd web
npx wrangler secret put GEBRUIKERS       # JSON met de accounts
npx wrangler secret put SESSION_SECRET   # lange willekeurige tekenreeks
npx wrangler secret put RESEND_API_KEY   # of vervang de mailfunctie door de mailserver van Align
# pas MAIL_FROM en REP_DOMAIN aan in wrangler.jsonc
npx wrangler deploy
```

## Voordat dit live gaat

- **Hosting en afzenderdomein:** een tool met de naam en prijzen van Invisalign hoort op infrastructuur van Align te draaien, met een afzenderdomein van Align. Laat IT dit goedkeuren. Overweeg SSO (bijvoorbeeld Cloudflare Access met Align-accounts) in plaats van één gedeeld wachtwoord.
- **Privacy (AVG/GDPR):** de tool slaat zelf niets op. De ingevulde gegevens blijven in de browser. Alleen de pdf gaat via de mailprovider naar de praktijk. Leg die verwerking vast in het register.
- **Toezicht:**
  - **adviesprijzen:** die moeten vrijblijvend blijven, en dat staat in de pagina en in de pdf;
  - **klinische uitspraken:** laat die meenemen in de validatie door de artsengroep;
  - **medische claims en aanbevelingen aan zorgverleners:** laat Compliance toetsen of de tekst voldoet aan de regels voor promotie van medische hulpmiddelen.
- **Cijfers controleren:** de tarieven en aannames in `data.js` moeten nog worden gecontroleerd in de officiële bronnen (zie `../onderzoek/`).
