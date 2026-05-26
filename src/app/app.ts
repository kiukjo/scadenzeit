import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';
import { DeadlineService } from './core/services/deadline.service';
import { NotificationSchedulerService } from './core/services/notification-scheduler.service';
import { SupabaseAuthService } from './core/services/supabase-auth.service';
import { SyncService } from './core/services/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly settings       = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly authService     = inject(SupabaseAuthService);
  private readonly syncService     = inject(SyncService);

  constructor() {
    // Avvia una sync ogni volta che l'utente effettua il login
    // (effect si riesegue quando `session` cambia da null → valore)
    effect(() => {
      const session = this.authService.session();
      if (session) {
        // Fire-and-forget: non blocca il rendering
        this.syncService.sync().catch(console.error);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Carica il profilo utente da IndexedDB
    await this.settings.loadProfile();

    // Richiedi permesso notifiche (no-op se già concesso)
    await this.notifScheduler.requestPermission();

    // Rischedula le notifiche per tutte le scadenze attive
    // (necessario al riavvio — le notifiche non persistono tra reinstallazioni)
    const deadlines = this.deadlineService.all();
    await this.notifScheduler.scheduleAll(deadlines);
  }
}
