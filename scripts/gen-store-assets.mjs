/**
 * Genera gli asset grafici per la scheda Google Play di Promemo.
 * Output in ./store-assets/  (feature graphic, icona 512, screenshot promo).
 * Uso: node scripts/gen-store-assets.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store-assets');
mkdirSync(out, { recursive: true });

const FONT = "Segoe UI, Arial, Helvetica, sans-serif";
const GRAD = `
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6C63FF"/><stop offset="1" stop-color="#3B82F6"/>
  </linearGradient>`;

/** Logo mark "P" (white strokes) scalato/posizionato */
function mark(x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M17 52 L17 12" stroke="white" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    <path d="M17 12 L29 12 C38 12 47 17 47 27 C47 37 38 42 29 42 L17 42" stroke="white" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="32" y1="27" x2="23.3" y2="22" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round"/>
    <line x1="32" y1="27" x2="43.3" y2="20.3" stroke="rgba(255,255,255,0.88)" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="32" cy="27" r="2.2" fill="rgba(255,255,255,0.9)"/>
    <circle cx="47" cy="12" r="6.5" fill="#FF4757" stroke="rgba(255,255,255,0.55)" stroke-width="1.8"/>
  </g>`;
}

async function svgToPng(svg, w, h, file) {
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(join(out, file));
  console.log('CREATO', file, `${w}x${h}`);
}

/* ── 1. Feature graphic 1024×500 ── */
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>${GRAD}</defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <circle cx="880" cy="120" r="260" fill="rgba(255,255,255,0.06)"/>
  <circle cx="120" cy="430" r="200" fill="rgba(255,255,255,0.05)"/>
  <rect x="92" y="186" width="128" height="128" rx="32" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.25)"/>
  ${mark(106, 200, 1.55)}
  <text x="250" y="232" font-family="${FONT}" font-size="78" font-weight="800" fill="#FFFFFF" letter-spacing="-2">Promemo</text>
  <text x="252" y="292" font-family="${FONT}" font-size="30" font-weight="600" fill="rgba(255,255,255,0.92)">Mai più scadenze dimenticate</text>
  <text x="252" y="338" font-family="${FONT}" font-size="22" font-weight="400" fill="rgba(255,255,255,0.78)">Tasse, bollo, documenti — promemoria automatici</text>
</svg>`;
await svgToPng(feature, 1024, 500, 'feature-graphic.png');

/* ── 2. Icona store 512×512 (dal PNG esistente) ── */
await sharp(join(root, 'src/assets/app-icon.png')).resize(512, 512).png().toFile(join(out, 'icon-512.png'));
console.log('CREATO icon-512.png 512x512');

/* ── 3. Screenshot promo 1080×1920 ── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card(x, y, w, color, title, sub, big) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="104" rx="20" fill="#FFFFFF"/>
    <rect x="${x + 14}" y="${y + 22}" width="6" height="60" rx="3" fill="${color}"/>
    <circle cx="${x + 54}" cy="${y + 52}" r="17" fill="none" stroke="rgba(10,10,30,0.12)" stroke-width="2"/>
    <text x="${x + 86}" y="${y + 46}" font-family="${FONT}" font-size="27" font-weight="700" fill="#0A0A1A">${esc(title)}</text>
    <text x="${x + 86}" y="${y + 78}" font-family="${FONT}" font-size="21" font-weight="400" fill="rgba(10,10,30,0.5)">${esc(sub)}</text>
    <text x="${x + w - 26}" y="${y + 64}" font-family="${FONT}" font-size="34" font-weight="800" fill="${color}" text-anchor="end">${esc(big)}</text>
  </g>`;
}

function screenshot(headline, sub, cards, file) {
  const lines = headline.split('\n').map((l, i) =>
    `<tspan x="80" dy="${i === 0 ? 0 : 70}">${l}</tspan>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>${GRAD}</defs>
    <rect width="1080" height="1920" fill="#EEF0F7"/>
    <path d="M0 0 H1080 V760 Q540 880 0 760 Z" fill="url(#g)"/>
    ${mark(78, 96, 1.5)}
    <text x="190" y="170" font-family="${FONT}" font-size="44" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Promemo</text>
    <text font-family="${FONT}" font-size="62" font-weight="800" fill="#FFFFFF" letter-spacing="-1.5" y="330">${lines}</text>
    <text x="80" y="${330 + headline.split('\n').length * 70 + 20}" font-family="${FONT}" font-size="30" font-weight="500" fill="rgba(255,255,255,0.88)">${sub}</text>
    ${cards}
  </svg>`;
  return svgToPng(svg, 1080, 1920, file);
}

const cardsList =
  card(80, 900, 920, '#FF4757', 'IMU — Prima rata', '16 giugno 2026', '7gg') +
  card(80, 1040, 920, '#FFA502', 'Bollo auto', '12 luglio 2026', '23gg') +
  card(80, 1180, 920, '#2ED573', 'Dichiarazione 730', '30 settembre 2026', '95gg') +
  card(80, 1320, 920, '#6C63FF', 'IVA trimestrale', '16 agosto 2026', '54gg');

await screenshot('Tutte le scadenze\nitaliane, pronte', 'IMU, bollo, 730, IVA… già precompilate dal tuo profilo', cardsList, 'screenshot-1.png');

const cardsRemind =
  card(80, 980, 920, '#FF4757', 'Scade domani!', 'Promemoria · 09:00', '1g') +
  card(80, 1120, 920, '#FFA502', 'Revisione auto', 'Tra 3 settimane', '21gg');
await screenshot('Promemoria\nautomatici', 'Avvisi puntuali all\'orario che scegli tu. Mai più multe.', cardsRemind, 'screenshot-2.png');

const cardsF24 =
  card(80, 980, 920, '#6C63FF', 'F24 — TARI', 'Importo letto in automatico', '€142') +
  card(80, 1120, 920, '#2ED573', 'Foto bolletta', 'Allegato salvato sul device', 'JPG');
await screenshot('Acquisisci l\'F24\ncon una foto', 'Leggiamo importo e data e creiamo la scadenza per te.', cardsF24, 'screenshot-3.png');

const cardsPrivacy =
  card(80, 980, 920, '#2ED573', 'Documenti', 'Salvati solo sul tuo telefono', 'LOCAL') +
  card(80, 1120, 920, '#6C63FF', 'Backup e ripristino', 'Esporta i tuoi dati quando vuoi', 'JSON');
await screenshot('I tuoi dati\nrestano con te', 'Niente cloud per i documenti: privacy totale.', cardsPrivacy, 'screenshot-4.png');

console.log('\nFatto. Asset in store-assets/');
