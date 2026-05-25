import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Deadline, Document, Vehicle, SyncQueueItem } from '../core/models';

// Tipo chiave-valore per settings e profilo utente
export interface AppSetting {
  id?: number;
  key: string;
  value: string; // JSON serializzato
}

@Injectable({ providedIn: 'root' })
export class DexieService extends Dexie {
  deadlines!: Table<Deadline, number>;
  documents!: Table<Document, number>;
  vehicles!: Table<Vehicle, number>;
  settings!: Table<AppSetting, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('scadenzait_db');

    this.version(1).stores({
      // Campi indicizzati (non serve elencare tutti — solo quelli su cui si fa query/sort)
      deadlines: '++id, uuid, dueDate, category, completed, vehicleId, updatedAt',
      documents: '++id, uuid, updatedAt',
      vehicles:  '++id, uuid, &targa, updatedAt',  // &targa = unique
      settings:  '++id, &key',                      // &key = unique
      syncQueue: '++id, entityType, entityUuid, createdAt',
    });
  }
}
