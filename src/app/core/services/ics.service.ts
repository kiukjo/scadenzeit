import { Injectable } from '@angular/core';
import { Deadline } from '../models';

/**
 * Genera un file iCalendar (.ics) dalle scadenze, importabile in
 * Google Calendar, Apple Calendar, Outlook, ecc.
 * Ogni scadenza diventa un evento "tutto il giorno" con promemoria (VALARM).
 */
@Injectable({ providedIn: 'root' })
export class IcsService {
  buildCalendar(deadlines: Deadline[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ScadenzaIT//Scadenze IT//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Scadenze ScadenzaIT',
    ];

    const stamp = formatStamp(new Date());

    for (const d of deadlines) {
      const start = formatDateOnly(new Date(d.dueDate));
      const end = formatDateOnly(addOneDay(new Date(d.dueDate)));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${d.uuid}@scadenzait`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      lines.push(`DTEND;VALUE=DATE:${end}`);
      lines.push(`SUMMARY:${escapeText(d.customName)}`);

      const desc = buildDescription(d);
      if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);

      // Un promemoria per ogni giorno di anticipo configurato
      for (const days of d.reminders ?? []) {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:${escapeText(d.customName)}`);
        lines.push(`TRIGGER:-P${days}D`);
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────

function buildDescription(d: Deadline): string {
  const parts: string[] = [];
  if (d.amountCents) parts.push(`Importo: € ${(d.amountCents / 100).toFixed(2)}`);
  if (d.notes) parts.push(d.notes);
  parts.push('— da ScadenzaIT');
  return parts.join('\\n');
}

/** YYYYMMDD per eventi tutto-il-giorno */
function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** YYYYMMDDTHHMMSSZ per DTSTAMP */
function formatStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function addOneDay(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + 1);
  return out;
}

/** Escape secondo RFC 5545 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
