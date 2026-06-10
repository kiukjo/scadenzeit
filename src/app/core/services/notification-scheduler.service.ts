import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { subDays } from 'date-fns';
import { Deadline } from '../models';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class NotificationSchedulerService {
  private readonly settings = inject(SettingsService);

  /** Richiede il permesso notifiche (da chiamare al primo avvio) */
  async requestPermission(): Promise<boolean> {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }

  /** Crea il canale notifiche (obbligatorio su Android 8+). No-op altrove. */
  async createChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await LocalNotifications.createChannel({
        id: 'scadenze',
        name: 'Scadenze',
        description: 'Promemoria delle tue scadenze',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    } catch {
      // canale già esistente o API non disponibile — ignora
    }
  }

  /** Cancella i reminder esistenti e ne schedula di nuovi per la scadenza */
  async scheduleReminders(deadline: Deadline): Promise<void> {
    if (!deadline.id) return;
    await this.cancelReminders(deadline);
    if (deadline.completed) return;

    const now = new Date();
    const hour = this.settings.notifHour();

    const notifications = deadline.reminders
      .map((days, idx) => {
        const rawDate = subDays(new Date(deadline.dueDate), days);
        const notifDate = this.toWorkday(rawDate);
        notifDate.setHours(hour, 0, 0, 0); // orario promemoria scelto dall'utente

        // Non schedulare date già passate
        if (notifDate <= now) return null;

        return {
          id: this.buildNotifId(deadline.id!, idx),
          title: deadline.customName,
          body: this.buildBody(days),
          schedule: { at: notifDate },
          extra: { deadlineId: deadline.id, uuid: deadline.uuid },
          smallIcon: 'ic_notification',
          channelId: 'scadenze',
        };
      })
      .filter((n) => n !== null);

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  /** Cancella tutti i reminder di una scadenza */
  async cancelReminders(deadline: Deadline): Promise<void> {
    if (!deadline.id) return;
    const ids = deadline.reminders.map((_, idx) => ({
      id: this.buildNotifId(deadline.id!, idx),
    }));
    try {
      await LocalNotifications.cancel({ notifications: ids });
    } catch {
      // Ignora se le notifiche non esistono ancora
    }
  }

  /** Schedula i reminder per una lista di scadenze (es. all'avvio dell'app) */
  async scheduleAll(deadlines: Deadline[]): Promise<void> {
    for (const deadline of deadlines) {
      await this.scheduleReminders(deadline);
    }
  }

  private readonly WEEKLY_DIGEST_ID = 999001;

  /**
   * Abilita/disabilita il riepilogo settimanale: una notifica ricorrente
   * il lunedì mattina all'orario promemoria scelto.
   */
  async setWeeklyDigest(enabled: boolean): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: this.WEEKLY_DIGEST_ID }] });
    } catch {
      // nessuna notifica esistente — ignora
    }
    if (!enabled) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: this.WEEKLY_DIGEST_ID,
        title: 'Scadenze della settimana',
        body: 'Dai un\'occhiata a cosa scade questa settimana 👀',
        schedule: { on: { weekday: 2, hour: this.settings.notifHour(), minute: 0 }, allowWhileIdle: true },
        smallIcon: 'ic_notification',
        channelId: 'scadenze',
      }],
    });
  }

  // ── Logica interna ────────────────────────────────────────────────────────

  /**
   * Logica smart anti-weekend: le scadenze fisco/lavoro non notificano
   * di sabato o domenica — vengono anticipate al venerdì precedente.
   */
  private toWorkday(date: Date): Date {
    const day = date.getDay(); // 0 = domenica, 6 = sabato
    if (day === 0) return subDays(date, 2); // domenica → venerdì
    if (day === 6) return subDays(date, 1); // sabato → venerdì
    return date;
  }

  private buildBody(daysLeft: number): string {
    if (daysLeft === 0) return 'Scade oggi!';
    if (daysLeft === 1) return 'Scade domani!';
    if (daysLeft <= 7) return `Scade tra ${daysLeft} giorni`;
    if (daysLeft <= 30) return `Scade tra ${daysLeft} giorni`;
    return `Scade tra ${daysLeft} giorni — inizia a prepararti`;
  }

  /**
   * ID notifica deterministico: deadlineId * 100 + reminderIndex.
   * Supporta fino a 100 reminder per scadenza senza collisioni.
   */
  private buildNotifId(deadlineId: number, reminderIdx: number): number {
    return deadlineId * 100 + reminderIdx;
  }
}
