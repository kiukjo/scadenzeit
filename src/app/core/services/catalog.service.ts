import { Injectable } from '@angular/core';
import { addYears, isPast } from 'date-fns';
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
   * Calcola la prossima data di scadenza per voci con month/day fissi.
   * Se la data di quest'anno è già passata restituisce quella dell'anno prossimo.
   * Restituisce null per voci "variable" che richiedono input utente.
   */
  computeNextDueDate(entry: CatalogDeadline): Date | null {
    if (entry.month == null || entry.day == null) return null;

    const candidate = new Date(new Date().getFullYear(), entry.month - 1, entry.day);
    return isPast(candidate) ? addYears(candidate, 1) : candidate;
  }

  /**
   * Costruisce una bozza di Deadline da una voce catalogo.
   * Per le voci "variable" la dueDate è impostata a oggi — va corretta dall'utente.
   */
  toDraft(entry: CatalogDeadline): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'> {
    return {
      catalogId: entry.id,
      customName: entry.name,
      category: entry.category,
      dueDate: this.computeNextDueDate(entry) ?? new Date(),
      reminders: [...entry.reminders],
      recurrence: entry.recurrence,
      completed: false,
      notes: entry.notes,
    };
  }
}
