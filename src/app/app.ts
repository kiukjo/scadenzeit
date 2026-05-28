import { Component, OnInit, inject, effect, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SettingsService } from './core/services/settings.service';
import { DeadlineService } from './core/services/deadline.service';
import { NotificationSchedulerService } from './core/services/notification-scheduler.service';
import { SupabaseAuthService } from './core/services/supabase-auth.service';
import { SyncService } from './core/services/sync.service';
import { ThemeService } from './core/services/theme.service';
import { NavComponent } from './shared/components/nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent],
  template: `
    <router-outlet />
    @if (showNav()) {
      <app-nav />
    }
  `,
})
export class App implements OnInit {
  private readonly settings        = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly authService     = inject(SupabaseAuthService);
  private readonly syncService     = inject(SyncService);
  private readonly router          = inject(Router);
  // ThemeService si auto-inizializza (applica data-theme all'avvio)
  private readonly _theme          = inject(ThemeService);

  // URL corrente come Signal — usato per decidere se mostrare la nav
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: '/' },
  );

  // Mostra la bottom nav solo nelle schermate autenticate
  readonly showNav = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/auth') && !url.startsWith('/onboarding');
  });

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
