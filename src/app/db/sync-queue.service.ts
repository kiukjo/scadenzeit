import { Injectable, inject } from '@angular/core';
import { DexieService } from './dexie.service';
import { SyncQueueItem, SyncEntityType, SyncOperation } from '../core/models';

const MAX_RETRIES = 3;

@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private readonly db = inject(DexieService);

  /** Accoda un'operazione da sincronizzare quando torna la connessione */
  async enqueue(
    entityType: SyncEntityType,
    entityUuid: string,
    operation: SyncOperation,
    payload: object,
  ): Promise<void> {
    await this.db.syncQueue.add({
      entityType,
      entityUuid,
      operation,
      payload: JSON.stringify(payload),
      createdAt: new Date(),
      retries: 0,
    });
  }

  /** Restituisce tutti gli item in coda, ordinati per data creazione */
  getPending(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue.orderBy('createdAt').toArray();
  }

  /** Rimuove un item dopo sync riuscito */
  async dequeue(id: number): Promise<void> {
    await this.db.syncQueue.delete(id);
  }

  /** Incrementa il contatore retry; rimuove se supera il massimo */
  async incrementRetry(id: number, currentRetries: number): Promise<void> {
    if (currentRetries + 1 >= MAX_RETRIES) {
      await this.db.syncQueue.delete(id);
    } else {
      await this.db.syncQueue.update(id, { retries: currentRetries + 1 });
    }
  }

  async clearAll(): Promise<void> {
    await this.db.syncQueue.clear();
  }
}
