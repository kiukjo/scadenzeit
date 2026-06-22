import { Injectable, inject } from '@angular/core';
import { DexieService } from '../../db/dexie.service';
import { Deadline, Vehicle, Document } from '../models';

interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  data: {
    deadlines: Deadline[];
    vehicles: Vehicle[];
    documents: Document[];
    settings: { key: string; value: string }[];
  };
}

export interface ImportResult {
  deadlines: number;
  vehicles: number;
  documents: number;
}

/**
 * Backup e ripristino di TUTTI i dati locali su file JSON.
 * Fondamentale perché l'app è local-first: è l'unico modo per
 * trasferire i dati su un nuovo telefono.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly db = inject(DexieService);

  /** Serializza tutti i dati locali in una stringa JSON. */
  async exportAll(): Promise<string> {
    const [deadlines, vehicles, documents, settings] = await Promise.all([
      this.db.deadlines.toArray(),
      this.db.vehicles.toArray(),
      this.db.documents.toArray(),
      this.db.settings.toArray(),
    ]);

    const payload: BackupPayload = {
      app: 'Promemo',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        deadlines,
        vehicles,
        documents,
        settings: settings.map((s) => ({ key: s.key, value: s.value })),
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Importa un backup JSON. Strategia merge: aggiunge solo i record con
   * uuid non già presente (non sovrascrive i dati esistenti).
   */
  async importAll(json: string): Promise<ImportResult> {
    let parsed: BackupPayload;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('File non leggibile (JSON non valido)');
    }

    if ((parsed?.app !== 'Promemo' && parsed?.app !== 'ScadenzaIT') || !parsed.data) {
      throw new Error('Non è un file di backup di Promemo');
    }

    const result: ImportResult = { deadlines: 0, vehicles: 0, documents: 0 };
    const d = parsed.data;

    // ── Scadenze ──
    if (Array.isArray(d.deadlines)) {
      for (const raw of d.deadlines) {
        const exists = await this.db.deadlines.where('uuid').equals(raw.uuid).first();
        if (exists) continue;
        const { id: _id, ...rest } = raw as Deadline & { id?: number };
        await this.db.deadlines.add(reviveDeadline(rest));
        result.deadlines++;
      }
    }

    // ── Veicoli ──
    if (Array.isArray(d.vehicles)) {
      for (const raw of d.vehicles) {
        const exists = await this.db.vehicles.where('uuid').equals(raw.uuid).first();
        if (exists) continue;
        const { id: _id, ...rest } = raw as Vehicle & { id?: number };
        await this.db.vehicles.add(reviveVehicle(rest));
        result.vehicles++;
      }
    }

    // ── Documenti (metadati; i file locali potrebbero non esistere sul nuovo device) ──
    if (Array.isArray(d.documents)) {
      for (const raw of d.documents) {
        const exists = await this.db.documents.where('uuid').equals(raw.uuid).first();
        if (exists) continue;
        const { id: _id, ...rest } = raw as Document & { id?: number };
        await this.db.documents.add(reviveDocument(rest));
        result.documents++;
      }
    }

    // ── Impostazioni / profilo ──
    if (Array.isArray(d.settings)) {
      for (const s of d.settings) {
        const exists = await this.db.settings.where('key').equals(s.key).first();
        if (exists) {
          await this.db.settings.update(exists.id!, { value: s.value });
        } else {
          await this.db.settings.add({ key: s.key, value: s.value });
        }
      }
    }

    return result;
  }
}

// ── Revival date (JSON le serializza come stringhe ISO) ──────────────────────

function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? undefined : d;
}

function reviveDeadline(d: Omit<Deadline, 'id'>): Omit<Deadline, 'id'> {
  return {
    ...d,
    dueDate: toDate(d.dueDate) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
    syncedAt: toDate(d.syncedAt),
  };
}

function reviveVehicle(v: Omit<Vehicle, 'id'>): Omit<Vehicle, 'id'> {
  return {
    ...v,
    immatDate: toDate(v.immatDate),
    ultimaRevisione: toDate(v.ultimaRevisione),
    assicExpiry: toDate(v.assicExpiry),
    updatedAt: toDate(v.updatedAt) ?? new Date(),
  };
}

function reviveDocument(doc: Omit<Document, 'id'>): Omit<Document, 'id'> {
  return {
    ...doc,
    updatedAt: toDate(doc.updatedAt) ?? new Date(),
  };
}
