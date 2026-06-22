/**
 * Festività nazionali italiane, calcolate in locale (nessuna API).
 * Date fisse + Lunedì dell'Angelo (Pasquetta) derivato dalla Pasqua.
 */

/** Domenica di Pasqua per l'anno dato (algoritmo di Meeus/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function md(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Festività fisse nazionali (MM-DD). */
const FIXED = new Set([
  '01-01', // Capodanno
  '01-06', // Epifania
  '04-25', // Liberazione
  '05-01', // Festa dei lavoratori
  '06-02', // Festa della Repubblica
  '08-15', // Ferragosto
  '11-01', // Ognissanti
  '12-08', // Immacolata
  '12-25', // Natale
  '12-26', // Santo Stefano
]);

const easterMondayCache = new Map<number, string>();

/** True se la data è una festività nazionale italiana (no patroni locali). */
export function isItalianHoliday(date: Date): boolean {
  const key = md(date);
  if (FIXED.has(key)) return true;

  const year = date.getFullYear();
  let em = easterMondayCache.get(year);
  if (!em) {
    const easter = easterSunday(year);
    const mon = new Date(easter);
    mon.setDate(mon.getDate() + 1); // Lunedì dell'Angelo
    em = md(mon);
    easterMondayCache.set(year, em);
  }
  return key === em;
}
