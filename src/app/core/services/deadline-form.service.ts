import { Injectable } from '@angular/core';
import { DeadlineCategory, DeadlineRecurrence } from '../models';

export interface DeadlinePreset {
  category: DeadlineCategory;
  reminders: number[];
  recurrence?: DeadlineRecurrence;
}

/**
 * Mappa keyword (lowercase) → preset suggerito.
 * Usata dal form manuale per pre-compilare categoria e reminder
 * quando l'utente digita il nome dell'ente/scadenza.
 */
const KEYWORD_PRESETS: Record<string, DeadlinePreset> = {
  // Utenze casa
  enel:        { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  eni:         { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  italgas:     { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  hera:        { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  a2a:         { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  acea:        { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  acquedotto:  { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  gas:         { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  luce:        { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  bolletta:    { category: 'casa', reminders: [7, 1], recurrence: 'monthly' },
  // Casa
  affitto:     { category: 'casa', reminders: [15, 7, 1], recurrence: 'monthly' },
  condominio:  { category: 'casa', reminders: [15, 7] },
  caldaia:     { category: 'casa', reminders: [60, 30, 15], recurrence: 'yearly' },
  // Fisco
  imu:         { category: 'fisco', reminders: [30, 15, 7, 1], recurrence: 'yearly' },
  tari:        { category: 'fisco', reminders: [15, 7, 1], recurrence: 'yearly' },
  isee:        { category: 'fisco', reminders: [30, 15, 7], recurrence: 'yearly' },
  irpef:       { category: 'fisco', reminders: [30, 15, 7, 1], recurrence: 'yearly' },
  f24:         { category: 'fisco', reminders: [15, 7, 1] },
  comune:      { category: 'fisco', reminders: [15, 7, 1] },
  agenzia:     { category: 'fisco', reminders: [30, 15, 7] },
  730:         { category: 'fisco', reminders: [60, 30, 7, 1], recurrence: 'yearly' },
  canone:      { category: 'fisco', reminders: [30, 15, 7], recurrence: 'yearly' },
  // Veicoli
  bollo:       { category: 'veicoli', reminders: [30, 15, 7, 1], recurrence: 'yearly' },
  revisione:   { category: 'veicoli', reminders: [60, 30, 7], recurrence: 'biennial' },
  assicurazione: { category: 'veicoli', reminders: [30, 15, 7, 3], recurrence: 'yearly' },
  rc:          { category: 'veicoli', reminders: [30, 15, 7, 3], recurrence: 'yearly' },
  patente:     { category: 'veicoli', reminders: [180, 90, 30] },
  // Lavoro
  inps:        { category: 'lavoro', reminders: [15, 7, 1] },
  inail:       { category: 'lavoro', reminders: [15, 7, 1], recurrence: 'yearly' },
  fattura:     { category: 'lavoro', reminders: [3, 1], recurrence: 'monthly' },
  albo:        { category: 'lavoro', reminders: [60, 30, 15], recurrence: 'yearly' },
  // Salute
  medico:      { category: 'sanita', reminders: [30, 15, 7] },
  visita:      { category: 'sanita', reminders: [30, 15, 7] },
  tessera:     { category: 'sanita', reminders: [180, 90, 30] },
  esenzione:   { category: 'sanita', reminders: [30, 15] },
  // Documenti
  passaporto:  { category: 'documenti', reminders: [180, 90, 30] },
  carta:       { category: 'documenti', reminders: [180, 90, 30] },
  identita:    { category: 'documenti', reminders: [180, 90, 30] },
  permesso:    { category: 'documenti', reminders: [180, 90, 60, 30] },
};

@Injectable({ providedIn: 'root' })
export class DeadlineFormService {

  /**
   * Cerca un preset in base al testo libero inserito dall'utente.
   * Restituisce il primo match trovato o null.
   */
  suggestPreset(input: string): DeadlinePreset | null {
    const normalized = input.toLowerCase().trim();
    for (const [keyword, preset] of Object.entries(KEYWORD_PRESETS)) {
      if (normalized.includes(keyword)) {
        return preset;
      }
    }
    return null;
  }

  /**
   * Restituisce tutti i preset disponibili raggruppati per categoria.
   * Utile per il dropdown del form.
   */
  getPresetsByCategory(): Record<DeadlineCategory, DeadlinePreset> {
    return KEYWORD_PRESETS as unknown as Record<DeadlineCategory, DeadlinePreset>;
  }
}
