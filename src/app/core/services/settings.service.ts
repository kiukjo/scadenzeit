import { Injectable, inject, signal } from '@angular/core';
import { DexieService } from '../../db/dexie.service';
import { UserProfile } from '../models';

const PROFILE_KEY = 'user_profile';
const NOTIF_HOUR_KEY = 'notif_hour';
const WEEKLY_DIGEST_KEY = 'weekly_digest';
const DISMISSED_KEY = 'dismissed_catalog_ids';
const DEFAULT_NOTIF_HOUR = 9;

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly db = inject(DexieService);

  // Signal locale per il profilo — caricato una volta all'avvio
  readonly profile = signal<UserProfile | null>(null);

  /** Ora del giorno (0-23) in cui far scattare i promemoria */
  readonly notifHour = signal<number>(DEFAULT_NOTIF_HOUR);

  /** Riepilogo settimanale del lunedì abilitato */
  readonly weeklyDigest = signal<boolean>(false);

  /** catalogId che l'utente ha rimosso "per sempre" — non verranno ri-importati */
  readonly dismissedCatalogIds = signal<string[]>([]);

  async loadProfile(): Promise<void> {
    const row = await this.db.settings.where('key').equals(PROFILE_KEY).first();
    if (row) {
      this.profile.set(JSON.parse(row.value) as UserProfile);
    }
    const hour = await this.get<number>(NOTIF_HOUR_KEY);
    if (hour != null && hour >= 0 && hour <= 23) {
      this.notifHour.set(hour);
    }
    const digest = await this.get<boolean>(WEEKLY_DIGEST_KEY);
    if (digest != null) {
      this.weeklyDigest.set(digest);
    }
    const dismissed = await this.get<string[]>(DISMISSED_KEY);
    if (Array.isArray(dismissed)) {
      this.dismissedCatalogIds.set(dismissed);
    }
  }

  /** Segna una voce di catalogo come rimossa per sempre (non verrà ri-importata) */
  async dismissCatalogId(id: string): Promise<void> {
    const cur = this.dismissedCatalogIds();
    if (cur.includes(id)) return;
    const next = [...cur, id];
    this.dismissedCatalogIds.set(next);
    await this.set(DISMISSED_KEY, next);
  }

  /** Ripristina una voce precedentemente rimossa (es. quando viene ri-aggiunta) */
  async restoreCatalogId(id: string): Promise<void> {
    const next = this.dismissedCatalogIds().filter((x) => x !== id);
    this.dismissedCatalogIds.set(next);
    await this.set(DISMISSED_KEY, next);
  }

  async setNotifHour(hour: number): Promise<void> {
    this.notifHour.set(hour);
    await this.set(NOTIF_HOUR_KEY, hour);
  }

  async setWeeklyDigest(enabled: boolean): Promise<void> {
    this.weeklyDigest.set(enabled);
    await this.set(WEEKLY_DIGEST_KEY, enabled);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const existing = await this.db.settings.where('key').equals(PROFILE_KEY).first();
    const value = JSON.stringify(profile);

    if (existing?.id) {
      await this.db.settings.update(existing.id, { value });
    } else {
      await this.db.settings.add({ key: PROFILE_KEY, value });
    }
    this.profile.set(profile);
  }

  async get<T>(key: string): Promise<T | null> {
    const row = await this.db.settings.where('key').equals(key).first();
    return row ? (JSON.parse(row.value) as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const existing = await this.db.settings.where('key').equals(key).first();
    const serialized = JSON.stringify(value);
    if (existing?.id) {
      await this.db.settings.update(existing.id, { value: serialized });
    } else {
      await this.db.settings.add({ key, value: serialized });
    }
  }
}
