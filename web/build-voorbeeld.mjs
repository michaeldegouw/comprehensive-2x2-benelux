// Maakt één zelfstandig HTML-bestand (zonder server) om de calculator te bekijken, bv. op een telefoon.
// Gebruik: node web/build-voorbeeld.mjs  → voorbeeld/praktijkcalculator.html
import { readFileSync, writeFileSync } from 'node:fs';
const p = (f) => new URL('./public/' + f, import.meta.url);
const lees = (f) => readFileSync(p(f), 'utf8');
const zonderModules = (src) => src.replace(/^import .*$/gm, '').replace(/^export (const|function|async function)/gm, '$1');
const js = ['data.js', 'model.js', 'app.js'].map((f) => zonderModules(lees(f))).join('\n');
let html = lees('index.html')
  .replace('<link rel="stylesheet" href="style.css">', `<style>${lees('style.css')}</style>`)
  .replace('<script src="vendor/jspdf.umd.min.js"></script>', `<script>${lees('vendor/jspdf.umd.min.js')}</script>`)
  .replace('<script src="vendor/jspdf.plugin.autotable.min.js"></script>', `<script>${lees('vendor/jspdf.plugin.autotable.min.js')}</script>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
writeFileSync(new URL('../voorbeeld/praktijkcalculator.html', import.meta.url), html);
console.log('voorbeeld/praktijkcalculator.html', (html.length / 1024).toFixed(0), 'kB');
