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

## Wachtwoord en e-mail

- **Wachtwoord.** De worker toont eerst een inlogpagina. Na het juiste wachtwoord krijgt de gebruiker een sessiecookie: HttpOnly, 12 uur geldig, ondertekend met HMAC. Zonder geldige sessie levert de worker geen pagina en geen API.
- **Versturen.** De knop "Versturen" stuurt de pdf naar `/api/verstuur`. Daar gelden twee regels:
  - het cc-adres moet een `@REP_DOMAIN`-adres zijn, zodat de functie niet als open mailrelais te gebruiken is;
  - het antwoordadres is de vertegenwoordiger.
- **Zonder server.** Als er geen server is (los bestand), wordt de pdf gedownload en opent het e-mailprogramma, met de praktijk als ontvanger en de vertegenwoordiger in cc.

## Installeren (na akkoord van Align IT/Compliance)

```bash
cd web
npx wrangler secret put APP_PASSWORD     # gedeeld wachtwoord voor de vertegenwoordigers
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
