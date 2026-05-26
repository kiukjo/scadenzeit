import { Injectable, inject } from '@angular/core';
import { DexieService } from '../../db/dexie.service';
import { SupabaseService } from './supabase.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SettingsService } from './settings.service';
import { Deadline, Vehicle } from '../models';

/**
 * Sincronizzazione bidirezionale tra IndexedDB (Dexie) e Supabase PostgreSQL.
 *
 * Strategia:
 *  - Push: upsert di tutti i record locali su Supabase (conflict key = uuid)
 *  - Pull: fetch dei record modificati dopo l'ultima sync, merge in Dexie
 *  - Conflitti: last-write-wins su `updated_at`
 *  - Chiamato da App.ts all'avvio e dopo ogni login
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly db     = inject(DexieService);
  private readonly sb     = inject(SupabaseService).client;
  private readonly auth   = inject(SupabaseAuthService);
  private readonly settings = inject(SettingsService);

  /** Esegue push + pull per scadenze e veicoli. No-op se non loggato. */
  async sync(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;

    const lastSyncRaw = await this.settings.get<string>('lastSyncAt');
    const lastSync    = lastSyncRaw ? new Date(lastSyncRaw) : new Date(0);

    await Promise.all([
      this.pushDeadlines(),
      this.pushVehicles(),
      this.pullDeadlines(lastSync),
      this.pullVehicles(lastSync),
    ]);

    await this.settings.set('lastSyncAt', new Date().toISOString());
  }

  // ── Push ──────────────────────────────────────────────────────────────────

  private async pushDeadlines(): Promise<void> {
    const local  = await this.db.deadlines.toArray();
    if (!local.length) return;
    const userId = this.auth.user()!.id;

    const rows = local.map((d) => ({
      user_id:     userId,
      uuid:        d.uuid,
      catalog_id:  d.catalogId ?? null,
      custom_name: d.customName,
      category:    d.category,
      due_date:    d.dueDate instanceof Date ? d.dueDate.toISOString() : d.dueDate,
      amount_cents: d.amountCents ?? null,
      recurrence:  d.recurrence,
      reminders:   d.reminders,
      completed:   d.completed,
      vehicle_id:  d.vehicleId ?? null,
      notes:       d.notes ?? null,
      updated_at:  d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    }));

    await this.sb
      .from('deadlines')
      .upsert(rows, { onConflict: 'uuid', ignoreDuplicates: false });
  }

  private async pushVehicles(): Promise<void> {
    const local  = await this.db.vehicles.toArray();
    if (!local.length) return;
    const userId = this.auth.user()!.id;

    const rows = local.map((v) => ({
      user_id:          userId,
      uuid:             v.uuid,
      targa:            v.targa,
      marca:            v.marca ?? null,
      modello:          v.modello ?? null,
      kw:               v.kw ?? null,
      regione_code:     v.regioneCode ?? null,
      immat_date:       v.immatDate ? toDateStr(v.immatDate) : null,
      ultima_revisione: v.ultimaRevisione ? toDateStr(v.ultimaRevisione) : null,
      assic_expiry:     v.assicExpiry ? toDateStr(v.assicExpiry) : null,
      updated_at:       v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
    }));

    await this.sb
      .from('vehicles')
      .upsert(rows, { onConflict: 'uuid', ignoreDuplicates: false });
  }

  // ── Pull ──────────────────────────────────────────────────────────────────

  private async pullDeadlines(since: Date): Promise<void> {
    const { data, error } = await this.sb
      .from('deadlines')
      .select('*')
      .gt('updated_at', since.toISOString());

    if (error || !data?.length) return;

    await this.db.transaction('rw', this.db.deadlines, async () => {
      for (const row of data) {
        const existing = await this.db.deadlines
          .where('uuid')
          .equals(row.uuid)
          .first();

        const remoteUpdated = new Date(row.updated_at);

        // Merge solo se il record remoto è più recente
        if (existing && existing.updatedAt >= remoteUpdated) continue;

        const local: Omit<Deadline, 'id'> = {
          uuid:        row.uuid,
          catalogId:   row.catalog_id ?? undefined,
          customName:  row.custom_name,
          category:    row.category,
          dueDate:     new Date(row.due_date),
          amountCents: row.amount_cents ?? undefined,
          recurrence:  row.recurrence,
          reminders:   row.reminders ?? [],
          completed:   row.completed,
          vehicleId:   row.vehicle_id ?? undefined,
          notes:       row.notes ?? undefined,
          updatedAt:   remoteUpdated,
        };

        if (existing?.id !== undefined) {
          await this.db.deadlines.update(existing.id, local);
        } else {
          await this.db.deadlines.add(local);
        }
      }
    });
  }

  private async pullVehicles(since: Date): Promise<void> {
    const { data, error } = await this.sb
      .from('vehicles')
      .select('*')
      .gt('updated_at', since.toISOString());

    if (error || !data?.length) return;

    await this.db.transaction('rw', this.db.vehicles, async () => {
      for (const row of data) {
        const existing = await this.db.vehicles
          .where('uuid')
          .equals(row.uuid)
          .first();

        const remoteUpdated = new Date(row.updated_at);
        if (existing && existing.updatedAt >= remoteUpdated) continue;

        const local: Omit<Vehicle, 'id'> = {
          uuid:            row.uuid,
          targa:           row.targa,
          marca:           row.marca ?? undefined,
          modello:         row.modello ?? undefined,
          kw:              row.kw ?? undefined,
          regioneCode:     row.regione_code ?? undefined,
          immatDate:       row.immat_date ? new Date(row.immat_date) : undefined,
          ultimaRevisione: row.ultima_revisione ? new Date(row.ultima_revisione) : undefined,
          assicExpiry:     row.assic_expiry ? new Date(row.assic_expiry) : undefined,
          updatedAt:       remoteUpdated,
        };

        if (existing?.id !== undefined) {
          await this.db.vehicles.update(existing.id, local);
        } else {
          await this.db.vehicles.add(local);
        }
      }
    });
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function toDateStr(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().substring(0, 10); // YYYY-MM-DD
}
