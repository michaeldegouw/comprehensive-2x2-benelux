// Maakt een account-regel voor het geheim GEBRUIKERS.
// Gebruik: node web/gebruiker-toevoegen.mjs jjansen "Jan Jansen" j.jansen@aligntech.com
// Het wachtwoord wordt gevraagd (niet zichtbaar) of willekeurig aangemaakt.
import { webcrypto as crypto } from 'node:crypto';
import { createInterface } from 'node:readline';

const [gebruikersnaam, naam, email] = process.argv.slice(2);
if (!gebruikersnaam || !naam || !email) { console.error('Gebruik: node gebruiker-toevoegen.mjs <gebruikersnaam> "<naam>" <email>'); process.exit(1); }
const RONDES = 100000;

const vraag = () => new Promise((res) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Wachtwoord (leeg = willekeurig): ', (a) => { rl.close(); res(a); });
});
let wachtwoord = await vraag();
if (!wachtwoord) wachtwoord = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('base64url');
const zout = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(wachtwoord), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: zout, iterations: RONDES }, key, 256);
const hash = `pbkdf2$${RONDES}$${Buffer.from(zout).toString('base64')}$${Buffer.from(bits).toString('base64')}`;
console.log('\nVoeg toe aan het JSON-geheim GEBRUIKERS:\n');
console.log(JSON.stringify({ [gebruikersnaam.toLowerCase()]: { naam, email, hash } }, null, 2));
console.log(`\nWachtwoord voor ${naam}: ${wachtwoord}  (geef dit apart door, het wordt nergens opgeslagen)`);
