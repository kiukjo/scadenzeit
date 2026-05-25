import { Injectable } from '@angular/core';
import enteMap from '../../../catalog/ente-map.json';
import { Deadline } from '../../../core/models';

type EnteMap = Record<string, string>;

/**
 * Parser del formato CBill (standard ABI).
 * Formato: CBILL|<codice_ente>|<codice_avviso_18>|<importo_cents>|<YYYYMMDD>|<IBAN>|<causale>
 */
@Injectable({ providedIn: 'root' })
export class CbillParserService {
  private readonly enteMap = enteMap as unknown as EnteMap;

  parse(raw: string): Partial<Omit<Deadline, 'id'>> | null {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('CBILL')) return null;

    const parts = trimmed.split('|');
    // Formato minimo: CBILL + 6 campi
    if (parts.length < 7) return null;

    const [, ente, codice, importoStr, dataStr, iban, causale] = parts;

    const dueDate = this.parseDate(dataStr);
    if (!dueDate) return null;

    const amountCents = this.parseImporto(importoStr);
    const customName = this.buildName(causale, ente);

    return {
      customName,
      category: 'fisco',
      dueDate,
      amountCents,
      reminders: [7, 1],
      recurrence: 'once',
      completed: false,
      notes: `Codice avviso: ${codice} | IBAN: ${iban}`,
    };
  }

  /** Verifica se una stringa è un CBill valido */
  isCbill(raw: string): boolean {
    return raw.trim().startsWith('CBILL') && raw.split('|').length >= 7;
  }

  // ── Helpers privati ───────────────────────────────────────────────────────

  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.length !== 8) return null;
    const year  = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1; // 0-based
    const day   = parseInt(dateStr.slice(6, 8), 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  private parseImporto(importoStr: string): number | undefined {
    const n = parseInt(importoStr, 10);
    return isNaN(n) || n <= 0 ? undefined : n;
  }

  private buildName(causale: string | undefined, enteCode: string): string {
    if (causale?.trim()) return causale.trim();
    const enteName = this.resolveEnte(enteCode);
    return enteName ? `Pagamento ${enteName}` : `Pagamento CBill`;
  }

  private resolveEnte(code: string): string | null {
    if (!code) return null;
    const upper = code.toUpperCase();
    // Cerca corrispondenza esatta o per prefisso
    return this.enteMap[upper] ?? null;
  }
}
