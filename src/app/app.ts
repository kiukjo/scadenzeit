import { Component, OnInit, inject, effect, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SettingsService } from './core/services/settings.service';
import { DeadlineService } from './core/services/deadline.service';
import { NotificationSchedulerService } from './core/services/notification-scheduler.service';
import { SupabaseAuthService } from './core/services/supabase-auth.service';
import { SyncService } from './core/services/sync.service';
import { WidgetService } from './core/services/widget.service';
import { ThemeService } from './core/services/theme.service';
import { NavComponent } from './shared/components/nav.component';
import { ToastComponent } from './shared/components/toast.component';
import { ReviewPromptComponent } from './shared/components/review-prompt.component';
import { ReviewService } from './core/services/review.service';
import { AdsService } from './core/services/ads.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent, ToastComponent, ReviewPromptComponent],
  template: `
    <router-outlet />
    @if (showNav()) {
      <app-nav />
    }
    <app-toast />
    <app-review-prompt />
  `,
})
export class App implements OnInit {
  private readonly settings        = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly authService     = inject(SupabaseAuthService);
  private readonly syncService     = inject(SyncService);
  private readonly widgetService   = inject(WidgetService);
  private readonly review          = inject(ReviewService);
  private readonly ads             = inject(AdsService);
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
    return !url.startsWith('/auth') && !url.startsWith('/onboarding') && !url.startsWith('/intro');
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

    // Aggiorna i dati del widget home screen a ogni variazione delle scadenze
    effect(() => {
      const deadlines = this.deadlineService.all();
      this.widgetService.update(deadlines).catch(console.error);
    });

    // Annuncio interstitial su transizioni naturali (riepilogo/calendario),
    // con cap di frequenza interno. Mai su intro/auth/onboarding.
    effect(() => {
      const url = this.currentUrl();
      if (url.startsWith('/dashboard') || url.startsWith('/calendar')) {
        this.ads.maybeShowInterstitial().catch(() => {});
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Carica il profilo utente da IndexedDB
    await this.settings.loadProfile();

    // Richiedi permesso notifiche (no-op se già concesso) e crea il canale Android
    await this.notifScheduler.requestPermission();
    await this.notifScheduler.createChannel();

    // Rischedula le notifiche per tutte le scadenze attive
    // (necessario al riavvio — le notifiche non persistono tra reinstallazioni)
    const deadlines = this.deadlineService.all();
    await this.notifScheduler.scheduleAll(deadlines);

    // Ripristina il riepilogo settimanale se attivo
    if (this.settings.weeklyDigest()) {
      await this.notifScheduler.setWeeklyDigest(true);
    }

    // Prompt recensione (solo per utenti già onboardati)
    this.review.registerOpen(!!this.settings.profile());
  }
}
