import { Injectable } from '@angular/core';
import { DeadlineCategory } from '../../../core/models';

export interface OcrParseResult {
  dueDate?: Date;
  amountCents?: number;
  entityName?: string;
  category?: DeadlineCategory;
  rawText: string;
}

/**
 * Estrae dati strutturati da testo libero OCR (bollette, avvisi di pagamento).
 *
 * NOTA: il testo grezzo viene fornito dal chiamante (Capacitor ML Kit Text
 * Recognition o qualsiasi altro motore OCR). Questo servizio è puro TypeScript,
 * testabile offline e indipendente dal provider OCR.
 */
@Injectable({ providedIn: 'root' })
export class OcrParserService {

  // ── Pattern regex ─────────────────────────────────────────────────────────

  private readonly DATE_PATTERNS = [
    // "scadenza: 15/06/2025" | "pagare entro il 15-06-2025"
    /(?:scad(?:enza)?|pagare\s+entro(?:\s+il)?|entro\s+il)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // "15/06/2025" da solo in un contesto di data
    /\b(\d{1,2}[\/\-]\d{2}[\/\-]\d{4})\b/,
  ];

  private readonly AMOUNT_PATTERNS = [
    // "importo: € 123,45" | "totale: 123.45" | "da pagare: 123,45"
    /(?:importo|totale|da\s+pagare|importo\s+da\s+pagare)[:\s€\s]*([\d]+[.,][\d]{2})/i,
    // "€ 123,45"
    /€\s*([\d]+[.,][\d]{2})/,
  ];

  private readonly ENTITY_PATTERNS: [RegExp, string, DeadlineCategory][] = [
    [/\bENEL\b/i,          'Enel Energia',       'casa'],
    [/\bENI\b/i,           'Eni gas e luce',      'casa'],
    [/\bITALGAS\b/i,       'Italgas',             'casa'],
    [/\bHERA\b/i,          'Hera',                'casa'],
    [/\bA2A\b/i,           'A2A Energia',         'casa'],
    [/\bACEA\b/i,          'ACEA',                'casa'],
    [/\bACQUEDOTTO\b/i,    'Acquedotto',          'casa'],
    [/\bIREN\b/i,          'Iren',                'casa'],
    [/\bINPS\b/i,          'INPS',                'lavoro'],
    [/\bINAIL\b/i,         'INAIL',               'lavoro'],
    [/\bACI\b/i,           'ACI',                 'veicoli'],
    [/\bIMU\b/i,           'IMU',                 'fisco'],
    [/\bTARI\b/i,          'TARI',                'fisco'],
    [/\bF24\b/i,           'F24',                 'fisco'],
    [/\bCOMUNE\s+DI\s+(\w+)/i, 'Comune',         'fisco'],
    [/\bRAI\b/i,           'Canone RAI',          'fisco'],
    [/\bASL\b/i,           'ASL',                 'sanita'],
  ];

  // ── API pubblica ──────────────────────────────────────────────────────────

  parse(rawText: string): OcrParseResult {
    return {
      rawText,
      dueDate:     this.extractDate(rawText),
      amountCents: this.extractAmount(rawText),
      ...this.extractEntity(rawText),
    };
  }

  // ── Helpers privati ───────────────────────────────────────────────────────

  private extractDate(text: string): Date | undefined {
    for (const pattern of this.DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const d = this.parseItalianDate(match[1]);
        if (d) return d;
      }
    }
    return undefined;
  }

  private extractAmount(text: string): number | undefined {
    for (const pattern of this.AMOUNT_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const normalized = match[1].replace('.', '').replace(',', '.');
        const val = parseFloat(normalized);
        if (!isNaN(val) && val > 0) return Math.round(val * 100);
      }
    }
    return undefined;
  }

  private extractEntity(text: string): { entityName?: string; category?: DeadlineCategory } {
    for (const [pattern, name, category] of this.ENTITY_PATTERNS) {
      if (pattern.test(text)) {
        // Per "COMUNE DI X" cattura il nome del comune
        if (name === 'Comune') {
          const m = text.match(/COMUNE\s+DI\s+(\w+)/i);
          return { entityName: m ? `Comune di ${m[1]}` : 'Comune', category };
        }
        return { entityName: name, category };
      }
    }
    return {};
  }

  /** Parsa date italiane: DD/MM/YYYY o DD-MM-YYYY o DD/MM/YY */
  private parseItalianDate(str: string): Date | null {
    const parts = str.split(/[\/\-]/);
    if (parts.length !== 3) return null;

    const day   = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year    = parseInt(parts[2], 10);

    // Anno a 2 cifre → 2000+
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) || day < 1 || day > 31 ? null : d;
  }
}
