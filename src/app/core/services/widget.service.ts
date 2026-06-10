import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Deadline } from '../models';

/**
 * Scrive i dati della prossima scadenza in Preferences (SharedPreferences
 * "CapacitorStorage"), così il widget home screen Android può leggerli.
 * No-op fuori da Android.
 */
@Injectable({ providedIn: 'root' })
export class WidgetService {
  async update(deadlines: Deadline[]): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcoming = deadlines
      .filter((d) => !d.completed)
      .map((d) => ({ d, due: new Date(d.dueDate) }))
      .filter((x) => !isNaN(x.due.getTime()))
      .sort((a, b) => a.due.getTime() - b.due.getTime());

    const next = upcoming.find((x) => x.due >= today) ?? upcoming[0] ?? null;

    await Preferences.set({ key: 'widget_count', value: String(upcoming.length) });

    if (next) {
      await Preferences.set({ key: 'widget_title', value: next.d.customName });
      await Preferences.set({ key: 'widget_due', value: toYmd(next.due) });
    } else {
      await Preferences.remove({ key: 'widget_title' });
      await Preferences.remove({ key: 'widget_due' });
    }
  }
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
