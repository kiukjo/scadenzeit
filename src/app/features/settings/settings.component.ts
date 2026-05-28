import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { DocumentService } from '../../core/services/document.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon.component';
import { FREE_TIER } from '../../core/constants/free-tier.constants';

@Component({
  selector: 'app-settings',
  imports: [IconComponent],
  template: `
    <div class="screen">
      <header class="header">
        <h1 class="title">Impostazioni</h1>
        <p class="sub">Personalizza la tua esperienza</p>
      </header>

      <!-- ── Hero account card ───────────────────────────────────── -->
      <div class="pad">
        <div class="hero stagger" style="--i:0">
          <span class="avatar">{{ initials() }}</span>
          <div class="hero-info">
            <div class="hero-name">{{ displayName() }}</div>
            <div class="hero-email">{{ user()?.email ?? '—' }}</div>
            <div class="hero-plan">
              <span class="plan-badge">{{ isPremium() ? 'PREMIUM' : 'FREE' }}</span>
              @if (memberSince()) {
                <span class="plan-since">· Membro da {{ memberSince() }}</span>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- ── Utilizzo ────────────────────────────────────────────── -->
      <div class="section-label">Utilizzo</div>
      <div class="pad">
        <div class="usage-card stagger" style="--i:1">
          <div class="usage-row">
            <div class="usage-label">Scadenze attive</div>
            <div class="usage-counter">
              <span>{{ deadlineCount() }}</span>
              <span class="mute"> / {{ isPremium() ? '∞' : maxDeadlines }}</span>
            </div>
          </div>
          <div class="progress">
            <span class="bar" [style.width.%]="deadlineProgressPct()"></span>
          </div>

          @if (!isPremium()) {
            <p class="upgrade-hint">
              Passa a <span class="grad">PREMIUM</span> per scadenze e documenti illimitati, sync su tutti i dispositivi.
            </p>
            <button class="upgrade-btn shimmer" type="button"
              (click)="showComingSoon.set(!showComingSoon())">
              <app-icon name="sparkle" [size]="16" color="#fff" />
              Sblocca Premium · € 2,99/mese
            </button>
            @if (showComingSoon()) {
              <p class="coming-soon">🎉 Prossimamente disponibile su Google Play!</p>
            }
          }
        </div>
      </div>

      <!-- ── Account group ───────────────────────────────────────── -->
      <div class="section-label">Account</div>
      <div class="pad">
        <div class="group stagger" style="--i:2">
          <div class="row">
            <span class="row-icon"><app-icon name="user" [size]="15" /></span>
            <div class="row-label">Profilo</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="mail" [size]="15" /></span>
            <div class="row-label">Email</div>
            <span class="row-trail">{{ emailShort() }}</span>
          </div>
        </div>
      </div>

      <!-- ── App group ───────────────────────────────────────────── -->
      <div class="section-label">App</div>
      <div class="pad">
        <div class="group stagger" style="--i:3">
          <!-- Theme toggle -->
          <div class="row">
            <span class="row-icon"><app-icon name="moon" [size]="15" /></span>
            <div class="row-label">Tema scuro</div>
            <button class="toggle-pill" type="button"
              [class.on]="theme() === 'dark'"
              (click)="themeService.toggle()">
              <span class="knob" [class.on]="theme() === 'dark'"></span>
            </button>
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="globe" [size]="15" /></span>
            <div class="row-label">Lingua</div>
            <span class="row-trail">Italiano</span>
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="download" [size]="15" /></span>
            <div class="row-label">Esporta dati</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="book" [size]="15" /></span>
            <div class="row-label">Centro assistenza</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="info" [size]="15" /></span>
            <div class="row-label">Informazioni</div>
            <span class="row-trail">v 0.4.0</span>
          </div>
        </div>
      </div>

      <!-- ── Logout button ───────────────────────────────────────── -->
      <div class="pad">
        <button class="logout-btn" type="button" (click)="confirmOpen.set(true)">
          <app-icon name="logout" [size]="16" />
          Esci dall'account
        </button>
      </div>

      <p class="footer">
        Fatto in Italia con <span style="color:var(--danger)">♥</span> · ScadenzaIT
      </p>

      <!-- ── Confirm dialog ──────────────────────────────────────── -->
      @if (confirmOpen()) {
        <div class="modal-scrim" (click)="confirmOpen.set(false)">
          <div class="confirm slide-up" (click)="$event.stopPropagation()">
            <div class="confirm-icon">
              <app-icon name="logout" [size]="22" color="#FF4757" />
            </div>
            <div class="confirm-title">Vuoi davvero uscire?</div>
            <div class="confirm-body">
              Dovrai inserire di nuovo l'email e il codice OTP al prossimo accesso.
            </div>
            <div class="confirm-actions">
              <button class="btn-secondary" type="button" (click)="confirmOpen.set(false)">
                Annulla
              </button>
              <button class="btn-danger" type="button" [disabled]="isLoggingOut()" (click)="logout()">
                @if (isLoggingOut()) {
                  <span class="btn-spinner"></span>
                } @else {
                  Esci
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .screen {
      padding-bottom: 100px;
      animation: scadit-fadeIn 280ms ease both;
    }

    .stagger {
      opacity: 0;
      animation: scadit-slideUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: calc(var(--i, 0) * 50ms);
    }
    .slide-up { animation: scadit-slideUp 380ms cubic-bezier(0.2,0.8,0.2,1) both; }

    /* ── Header ── */
    .header { padding: 8px 20px 18px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }

    .pad { padding: 0 16px 18px; }
    .section-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--text-tertiary);
      padding: 4px 20px 8px;
    }

    /* ── Hero card ── */
    .hero {
      border-radius: var(--radius-lg); padding: 18px;
      display: flex; align-items: center; gap: 14px;
      background: linear-gradient(135deg, rgba(108,99,255,0.18), rgba(59,130,246,0.10));
      border: 1px solid rgba(108,99,255,0.30);
      box-shadow: 0 10px 28px rgba(108,99,255,0.18);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
    }
    .avatar {
      width: 56px; height: 56px; border-radius: 28px;
      background: var(--accent-grad);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: white; letter-spacing: 0.5px;
      box-shadow: 0 6px 16px rgba(108,99,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
      flex-shrink: 0;
    }
    .hero-name { font-size: 16px; font-weight: 700; }
    .hero-email { font-size: 12px; color: var(--text-secondary); margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
    .hero-plan { margin-top: 8px; display: inline-flex; align-items: center; gap: 5px; }
    .plan-badge {
      font-size: 10px; font-weight: 800; letter-spacing: 1px;
      padding: 3px 8px; border-radius: 6px;
      background: var(--plate-bg); color: var(--text-primary);
    }
    .plan-since { font-size: 11px; color: var(--text-secondary); font-weight: 500; }

    /* ── Usage card ── */
    .usage-card {
      border-radius: var(--radius); padding: 16px;
      background: var(--glass); backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
    }
    .usage-row {
      display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px;
    }
    .usage-label { font-size: 13px; font-weight: 600; }
    .usage-counter { font-size: 13px; font-family: var(--font-mono); font-weight: 700; }
    .usage-counter .mute { color: var(--text-tertiary); }
    .progress {
      height: 8px; border-radius: 4px;
      background: rgba(255,255,255,0.07); overflow: hidden;
    }
    [data-theme="light"] .progress { background: rgba(10,10,30,0.08); }
    .bar {
      display: block; height: 100%;
      background: var(--accent-grad); border-radius: 4px;
      box-shadow: 0 0 12px rgba(108,99,255,0.5);
      transition: width 600ms cubic-bezier(0.2,0.8,0.2,1);
    }
    .upgrade-hint { font-size: 11.5px; color: var(--text-secondary); margin: 10px 0 0; }
    .grad {
      background: var(--accent-grad);
      -webkit-background-clip: text; background-clip: text;
      color: transparent; font-weight: 700;
    }
    .upgrade-btn {
      margin-top: 12px; width: 100%; padding: 12px;
      border: none; border-radius: 14px;
      background: var(--accent-grad); color: white;
      font-size: 13.5px; font-weight: 700; cursor: pointer;
      box-shadow: 0 8px 20px rgba(108,99,255,0.35);
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      font-family: inherit; position: relative; overflow: hidden;
    }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: scadit-shimmer 2.8s ease-in-out infinite; pointer-events: none;
    }
    .coming-soon {
      font-size: 12px; color: var(--success); text-align: center;
      margin-top: 8px; font-weight: 600;
    }

    /* ── Row groups ── */
    .group {
      border-radius: var(--radius); overflow: hidden;
      background: var(--glass); backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
    }
    .row {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 14px; cursor: pointer; color: var(--text-primary);
    }
    .row-icon {
      width: 32px; height: 32px; border-radius: 10px;
      background: var(--icon-tile-bg); border: 1px solid var(--icon-tile-border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--text-secondary);
    }
    .row-label { flex: 1; font-size: 13.5px; font-weight: 500; }
    .row-trail { font-size: 12px; color: var(--text-secondary); }
    .sep {
      height: 1px; margin-left: 56px;
      background: rgba(255,255,255,0.06);
    }
    [data-theme="light"] .sep { background: rgba(10,10,30,0.07); }

    /* ── Toggle pill ── */
    .toggle-pill {
      width: 40px; height: 24px; border-radius: 12px;
      border: none; cursor: pointer; padding: 0;
      background: rgba(255,255,255,0.10);
      position: relative; transition: background 200ms ease; flex-shrink: 0;
    }
    [data-theme="light"] .toggle-pill { background: rgba(10,10,30,0.12); }
    .toggle-pill.on { background: var(--accent-grad); }
    .knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 9px;
      background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.35);
      transition: left 200ms cubic-bezier(0.2,0.8,0.2,1);
    }
    .knob.on { left: 19px; }

    /* ── Logout ── */
    .logout-btn {
      width: 100%; padding: 14px; border-radius: 14px;
      border: 1px solid rgba(255,71,87,0.30);
      background: rgba(255,71,87,0.08);
      color: var(--danger); font-size: 14px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit;
    }

    .footer {
      text-align: center; font-size: 11px; color: var(--text-tertiary);
      padding: 4px 16px 20px; letter-spacing: 0.3px; margin: 0;
    }

    /* ── Confirm dialog ── */
    .modal-scrim {
      position: fixed; inset: 0; z-index: 80;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      animation: scadit-fadeIn 200ms ease both;
    }
    .confirm {
      width: 100%; background: var(--confirm-bg);
      border-radius: 22px; padding: 22px;
      border: 1px solid var(--glass-border);
      text-align: center; backdrop-filter: blur(20px);
    }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 18px;
      margin: 0 auto 12px;
      background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.30);
      display: flex; align-items: center; justify-content: center;
    }
    .confirm-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
    .confirm-body { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 18px; }
    .confirm-actions { display: flex; gap: 10px; }
    .btn-secondary {
      flex: 1; padding: 12px; border-radius: 14px;
      border: 1px solid var(--glass-border); background: var(--glass);
      color: var(--text-primary); font-size: 13.5px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-danger {
      flex: 1; padding: 12px; border-radius: 14px;
      border: none; cursor: pointer;
      background: linear-gradient(135deg, var(--danger), #B5333E);
      color: white; font-size: 13.5px; font-weight: 700;
      box-shadow: 0 8px 18px rgba(255,71,87,0.35);
      font-family: inherit;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: scadit-spin 0.8s linear infinite;
    }
  `],
})
export class SettingsComponent {
  private readonly authService     = inject(SupabaseAuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly documentService = inject(DocumentService);
  readonly         themeService    = inject(ThemeService);
  private readonly router          = inject(Router);

  readonly user           = this.authService.user;
  readonly profile        = this.settingsService.profile;
  readonly theme          = this.themeService.theme;

  readonly isLoggingOut   = signal(false);
  readonly confirmOpen    = signal(false);
  readonly showComingSoon = signal(false);

  readonly maxDeadlines = FREE_TIER.MAX_DEADLINES;

  readonly isPremium = computed(() => this.profile()?.isPremium ?? false);

  readonly deadlineCount = computed(() => this.deadlineService.all().length);

  readonly deadlineProgressPct = computed(() => {
    if (this.isPremium()) return 0;
    return Math.min(100, (this.deadlineCount() / this.maxDeadlines) * 100);
  });

  readonly emailShort = computed(() => {
    const email = this.user()?.email ?? '';
    return email.split('@')[0] || '—';
  });

  readonly displayName = computed(() => {
    const email = this.profile()?.email ?? this.user()?.email ?? '';
    return email.split('@')[0] || 'Utente';
  });

  readonly initials = computed(() => {
    const name = this.displayName();
    return name.slice(0, 2).toUpperCase();
  });

  readonly memberSince = computed(() => {
    const createdAt = this.user()?.created_at;
    if (!createdAt) return null;
    const d = new Date(createdAt);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}/${d.getFullYear()}`;
  });

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    try {
      await this.authService.signOut();
      this.confirmOpen.set(false);
      await this.router.navigate(['/auth']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
