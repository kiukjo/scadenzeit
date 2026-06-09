import { Injectable } from '@angular/core';
import { addMonths, addYears, isPast } from 'date-fns';
import catalogData from '../../catalog/scadenze-it.json';
import { CatalogDeadline, Deadline, DeadlineCategory, UserProfileType } from '../models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly catalog = catalogData as CatalogDeadline[];

  getAll(): CatalogDeadline[] {
    return this.catalog;
  }

  getById(id: string): CatalogDeadline | undefined {
    return this.catalog.find((e) => e.id === id);
  }

  getByCategory(category: DeadlineCategory): CatalogDeadline[] {
    return this.catalog.filter((e) => e.category === category);
  }

  /** Filtra le voci rilevanti per i profili dell'utente */
  getByProfile(profileTypes: UserProfileType[]): CatalogDeadline[] {
    return this.catalog.filter((e) =>
      e.appliesTo.some((p) => profileTypes.includes(p)),
    );
  }

  /**
   * Restituisce le voci con data fissa da importare automaticamente in onboarding.
   * Incluse: yearly/biennial con month+day, monthly con day.
   * Escluse: variable, e qualunque entry senza day.
   */
  getAutoImportable(profileTypes: UserProfileType[]): CatalogDeadline[] {
    return this.getByProfile(profileTypes).filter((e) => {
      if (e.recurrence === 'variable') return false;
      if (e.day == null) return false;
      if (e.recurrence === 'monthly') return true;   // solo day richiesto
      return e.month != null;                        // yearly/biennial: month+day
    });
  }

  /**
   * Calcola la prossima data di scadenza.
   * - monthly: prossima occorrenza del giorno X
   * - yearly:  ricorrenza annuale fissa (mese+giorno)
   * - variable / senza date: restituisce null
   */
  computeNextDueDate(entry: CatalogDeadline): Date | null {
    if (entry.day == null) return null;

    if (entry.recurrence === 'monthly') {
      const now = new Date();
      const candidate = new Date(now.getFullYear(), now.getMonth(), entry.day);
      return isPast(candidate) ? addMonths(candidate, 1) : candidate;
    }

    if (entry.month == null) return null;

    const candidate = new Date(new Date().getFullYear(), entry.month - 1, entry.day);
    return isPast(candidate) ? addYears(candidate, 1) : candidate;
  }

  /**
   * Costruisce una bozza di Deadline da una voce catalogo.
   * Per le voci "variable" la dueDate è impostata a oggi — va corretta dall'utente.
   */
  toDraft(entry: CatalogDeadline): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'> {
    return {
      catalogId:  entry.id,
      customName: entry.name,
      category:   entry.category,
      dueDate:    this.computeNextDueDate(entry) ?? new Date(),
      reminders:  [...entry.reminders],
      recurrence: entry.recurrence,
      completed:  false,
      notes:      entry.notes,
    };
  }
}
