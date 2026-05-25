export type SyncEntityType = 'deadline' | 'document' | 'vehicle';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id?: number;              // PK auto-increment IndexedDB
  entityType: SyncEntityType;
  entityUuid: string;
  operation: SyncOperation;
  payload: string;          // JSON serializzato dell'entità
  createdAt: Date;
  retries: number;          // tentativi falliti (max 3)
}
