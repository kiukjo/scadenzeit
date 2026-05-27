import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { DocumentService } from '../../core/services/document.service';
import { FREE_TIER } from '../../core/constants/free-tier.constants';

@Component({
  selector: 'app-settings',
  imports: [],
  template: `
    <div class="settings-page">
      <header class="page-header">
        <h1>Impostazioni</h1>
      </header>

      <!-- Account -->
      <section class="settings-section">
        <h2>Account</h2>
        @if (user()) {
          <div class="settings-row">
            <span class="settings-label">Email</span>
            <span class="settings-value" style="font-size:.85rem;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              {{ user()!.email }}
            </span>
          </div>
        }
        <div class="settings-row">
          <span class="settings-label">Piano</span>
          <span class="settings-value" [attr.data-premium]="isPremium()">
            {{ isPremium() ? '⭐ Premium' : 'Gratuito' }}
          </span>
        </div>
      </section>

      <!-- Utilizzo -->
      <section class="settings-section">
        <h2>Utilizzo</h2>
        <div class="settings-row">
          <span class="settings-label">Scadenze</span>
          <span class="settings-value" [attr.data-at-limit]="deadlineAtLimit()">
            {{ deadlineCount() }} / {{ isPremium() ? '∞' : maxDeadlines }}
          </span>
        </div>
        <div class="settings-row">
          <span class="settings-label">Documenti</span>
          <span class="settings-value" [attr.data-at-limit]="documentAtLimit()">
            {{ documentCount() }} / {{ isPremium() ? '∞' : maxDocuments }}
          </span>
        </div>
      </section>

      <!-- Premium upsell -->
      @if (!isPremium()) {
        <section class="settings-premium-banner">
          <h2>ScadenzaIT Premium</h2>
          <ul>
            <li>Scadenze e documenti illimitati</li>
            <li>Sync su tutti i dispositivi</li>
            <li>Nessuna pubblicità</li>
          </ul>
          <button class="btn-premium" (click)="showComingSoon.set(true)">
            Passa a Premium
          </button>
          @if (showComingSoon()) {
            <p class="coming-soon">Prossimamente disponibile su Google Play!</p>
          }
        </section>
      }

      <!-- Profilo -->
      @if (profileTypes().length > 0) {
        <section class="settings-section">
          <h2>Profilo</h2>
          @for (type of profileTypes(); track type) {
            <div class="settings-row">
              <span class="settings-label">{{ profileLabel(type) }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-safe)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          }
        </section>
      }

      <!-- Sync -->
      <section class="settings-section">
        <h2>Sincronizzazione</h2>
        <div class="settings-row">
          <span class="settings-label">Ultima sync</span>
          <span class="settings-value">{{ lastSyncLabel() }}</span>
        </div>
      </section>

      <!-- Logout -->
      <section class="settings-section">
        <div style="padding:12px 16px">
          <button
            class="btn-logout"
            (click)="logout()"
            [disabled]="isLoggingOut()"
          >
            @if (isLoggingOut()) {
              <span style="display:flex;align-items:center;gap:8px;justify-content:center">
                <span style="width:14px;height:14px;border:2px solid rgba(255,77,109,.3);border-top-color:var(--color-overdue);border-radius:50%;animation:spin .8s linear infinite;display:inline-block"></span>
                Uscita in corso…
              </span>
            } @else {
              Esci dall'account
            }
          </button>
        </div>
      </section>

      <p class="app-version">ScadenzaIT v0.4.0</p>
    </div>
  `,
})
export class SettingsComponent {
  private readonly authService     = inject(SupabaseAuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly documentService = inject(DocumentService);
  private readonly router          = inject(Router);

  readonly user           = this.authService.user;
  readonly profile        = this.settingsService.profile;
  readonly isLoggingOut   = signal(false);
  readonly showComingSoon = signal(false);

  readonly maxDeadlines = FREE_TIER.MAX_DEADLINES;
  readonly maxDocuments = FREE_TIER.MAX_DOCUMENTS;

  readonly isPremium    = computed(() => this.profile()?.isPremium ?? false);
  readonly profileTypes = computed(() => this.profile()?.profileTypes ?? []);
  readonly deadlineCount = computed(() => this.deadlineService.all().length);
  readonly documentCount = computed(() => this.documentService.all().length);

  readonly deadlineAtLimit = computed(
    () => !this.isPremium() && this.deadlineCount() >= this.maxDeadlines,
  );
  readonly documentAtLimit = computed(
    () => !this.isPremium() && this.documentCount() >= this.maxDocuments,
  );

  readonly lastSyncLabel = computed(() =>
    this.profile() ? 'Sincronizzato' : 'Mai sincronizzato',
  );

  profileLabel(type: string): string {
    const map: Record<string, string> = {
      dipendente:        'Lavoratore dipendente',
      autonomo:          'Autonomo / Partita IVA',
      proprietario_casa: 'Proprietario di casa',
    };
    return map[type] ?? type;
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    try {
      await this.authService.signOut();
      await this.router.navigate(['/auth']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
