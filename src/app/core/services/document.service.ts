import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import { DexieService } from '../../db/dexie.service';
import { Document } from '../models';

/**
 * Gestione documenti — esclusivamente LOCALE.
 * I file restano in IndexedDB + Filesystem sul dispositivo dell'utente.
 * Nessun upload o sincronizzazione verso il server (scelta di privacy).
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly db = inject(DexieService);

  readonly all = toSignal(
    from(liveQuery(() => this.db.documents.orderBy('updatedAt').reverse().toArray())),
    { initialValue: [] as Document[] },
  );

  // ── CRUD (solo locale) ──────────────────────────────────────────────────────

  async add(doc: Omit<Document, 'id'>): Promise<number> {
    return this.db.documents.add(doc);
  }

  async update(id: number, changes: Partial<Omit<Document, 'id'>>): Promise<void> {
    await this.db.documents.update(id, { ...changes, updatedAt: new Date() });
  }

  async remove(id: number): Promise<void> {
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
