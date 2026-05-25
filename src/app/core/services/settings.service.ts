import { Injectable, inject, signal } from '@angular/core';
import { DexieService } from '../../db/dexie.service';
import { UserProfile } from '../models';

const PROFILE_KEY = 'user_profile';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly db = inject(DexieService);

  // Signal locale per il profilo — caricato una volta all'avvio
  readonly profile = signal<UserProfile | null>(null);

  async loadProfile(): Promise<void> {
    const row = await this.db.settings.where('key').equals(PROFILE_KEY).first();
    if (row) {
      this.profile.set(JSON.parse(row.value) as UserProfile);
    }
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
