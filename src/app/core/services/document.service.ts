import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import { DexieService } from '../../db/dexie.service';
import { SyncQueueService } from '../../db/sync-queue.service';
import { Document } from '../models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly db = inject(DexieService);
  private readonly syncQueue = inject(SyncQueueService);

  readonly all = toSignal(
    from(liveQuery(() => this.db.documents.orderBy('updatedAt').reverse().toArray())),
    { initialValue: [] as Document[] },
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async add(doc: Omit<Document, 'id'>): Promise<number> {
    const id = await this.db.documents.add(doc);
    // Il sync del documento avviene solo dopo l'upload su R2 (flusso separato)
    return id;
  }

  async update(id: number, changes: Partial<Omit<Document, 'id'>>): Promise<void> {
    await this.db.documents.update(id, { ...changes, updatedAt: new Date() });
    const doc = await this.db.documents.get(id);
    if (doc?.r2Key) {
      // Sincronizza solo se già su R2 (ha senso aggiornare i metadati)
      await this.syncQueue.enqueue('document', doc.uuid, 'update', doc);
    }
  }

  async remove(id: number): Promise<void> {
    const doc = await this.db.documents.get(id);
    if (doc) {
      await this.syncQueue.enqueue('document', doc.uuid, 'delete', { uuid: doc.uuid, r2Key: doc.r2Key });
    }
    await this.db.documents.delete(id);
  }

  getById(id: number): Promise<Document | undefined> {
    return this.db.documents.get(id);
  }

  static newUuid(): string {
    return crypto.randomUUID();
  }

  static build(partial: Omit<Document, 'id' | 'uuid' | 'updatedAt'>): Omit<Document, 'id'> {
    return {
      ...partial,
      uuid: DocumentService.newUuid(),
      updatedAt: new Date(),
    };
  }
}
