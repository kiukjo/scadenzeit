import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import { addYears, addMonths } from 'date-fns';
import { DexieService } from '../../db/dexie.service';
import { SyncQueueService } from '../../db/sync-queue.service';
import { Deadline, DeadlineRecurrence } from '../models';

@Injectable({ providedIn: 'root' })
export class DeadlineService {
  private readonly db = inject(DexieService);
  private readonly syncQueue = inject(SyncQueueService);

  // Signal reattivo — si aggiorna automaticamente a ogni modifica IndexedDB
  readonly all = toSignal(
    from(liveQuery(() => this.db.deadlines.orderBy('dueDate').toArray())),
    { initialValue: [] as Deadline[] },
  );

  readonly upcoming = toSignal(
    from(
      liveQuery(() =>
        this.db.deadlines
          .where('completed')
          .equals(0) // Dexie indicizza boolean come 0/1
          .sortBy('dueDate'),
      ),
    ),
    { initialValue: [] as Deadline[] },
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async add(deadline: Omit<Deadline, 'id'>): Promise<number> {
    const id = await this.db.deadlines.add(deadline);
    await this.syncQueue.enqueue('deadline', deadline.uuid, 'create', deadline);
    return id;
  }

  async update(id: number, changes: Partial<Omit<Deadline, 'id'>>): Promise<void> {
    const updated = { ...changes, updatedAt: new Date() };
    await this.db.deadlines.update(id, updated);

    const deadline = await this.db.deadlines.get(id);
    if (deadline) {
      await this.syncQueue.enqueue('deadline', deadline.uuid, 'update', deadline);
    }
  }

  async remove(id: number): Promise<void> {
    const deadline = await this.db.deadlines.get(id);
    if (deadline) {
      await this.syncQueue.enqueue('deadline', deadline.uuid, 'delete', { uuid: deadline.uuid });
    }
    await this.db.deadlines.delete(id);
  }

  async markCompleted(id: number): Promise<void> {
    await this.update(id, { completed: true });
  }

  async markUncompleted(id: number): Promise<void> {
    await this.update(id, { completed: false });
  }

  /**
   * Segna una scadenza come pagata/completata.
   * Se è ricorrente (yearly/monthly/biennial) crea automaticamente
   * l'occorrenza successiva e la restituisce (per ri-pianificare le notifiche).
   * Per scadenze "once"/"variable" restituisce null.
   */
  async complete(id: number): Promise<Deadline | null> {
    const current = await this.getById(id);
    if (!current) return null;

    await this.markCompleted(id);

    const nextDate = DeadlineService.rollDate(new Date(current.dueDate), current.recurrence);
    if (!nextDate) return null;

    const next = DeadlineService.build({
      catalogId:   current.catalogId,
      customName:  current.customName,
      category:    current.category,
      dueDate:     nextDate,
      amountCents: current.amountCents,
      reminders:   current.reminders,
      recurrence:  current.recurrence,
      completed:   false,
      notes:       current.notes,
      vehicleId:   current.vehicleId,
    });

    const newId = await this.add(next);
    return (await this.getById(newId)) ?? null;
  }

  /** Calcola la data della prossima occorrenza per una ricorrenza. null se non ricorrente. */
  private static rollDate(date: Date, recurrence: DeadlineRecurrence): Date | null {
    switch (recurrence) {
      case 'yearly':   return addYears(date, 1);
      case 'biennial': return addYears(date, 2);
      case 'monthly':  return addMonths(date, 1);
      default:         return null; // once, variable
    }
  }

  getById(id: number): Promise<Deadline | undefined> {
    return this.db.deadlines.get(id);
  }

  getByCategory(category: Deadline['category']): Promise<Deadline[]> {
    return this.db.deadlines.where('category').equals(category).sortBy('dueDate');
  }

  getByVehicle(vehicleId: string): Promise<Deadline[]> {
    return this.db.deadlines.where('vehicleId').equals(vehicleId).toArray();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Genera un UUID v4 usando la Web Crypto API nativa */
  static newUuid(): string {
    return crypto.randomUUID();
  }

  /** Costruisce una Deadline pronta per il salvataggio */
  static build(partial: Omit<Deadline, 'id' | 'uuid' | 'updatedAt'>): Omit<Deadline, 'id'> {
    return {
      ...partial,
      uuid: DeadlineService.newUuid(),
      updatedAt: new Date(),
    };
  }
}
