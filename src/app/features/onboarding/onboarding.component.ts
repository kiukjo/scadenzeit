import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { CatalogService } from '../../core/services/catalog.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { UserProfile, UserProfileType } from '../../core/models';
import { BrandLogoComponent } from '../../shared/components/icon.component';

interface ProfileOption {
  type: UserProfileType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const PROFILE_OPTIONS: ProfileOption[] = [
  { type: 'dipendente',        label: 'Lavoratore dipendente', description: '730, CU, esenzioni fiscali, documenti personali',          icon: '💼', color: '#6C63FF' },
  { type: 'autonomo',          label: 'Autonomo / Partita IVA', description: 'IVA trimestrale, INPS, INAIL, albo professionale',         icon: '🧾', color: '#3B82F6' },
  { type: 'proprietario_casa', label: 'Proprietario di casa',   description: 'IMU, TARI, cedolare secca, caldaia, condominio',           icon: '🏠', color: '#2ED573' },
  { type: 'genitore',          label: 'Genitore / Famiglia',    description: 'Iscrizioni scuola, assegno unico, mensa, bonus nido INPS', icon: '👨‍👩‍👧', color: '#A29BFE' },
];

@Component({
  selector: 'app-onboarding',
  imports: [BrandLogoComponent],
  template: `
    <div class="screen">

      <!-- Logo -->
      <div class="logo-wrap">
        <div class="logo-tile"><app-brand-logo [size]="38" /></div>
        <span class="brand">Scadenza<span class="grad">IT</span></span>
      </div>

      <!-- Hero -->
      <h1 class="title">Ciao, benvenuto!</h1>
      <p class="sub">Seleziona il tuo profilo — pre-compileremo le scadenze più importanti per te.</p>
      <p class="hint">Puoi selezionarne più di uno</p>

      <!-- Profile cards -->
      <div class="cards">
        @for (opt of profileOptions; track opt.type; let i = $index) {
          <div class="stagger" [style.--i]="i">
            <button class="card" [class.sel]="isSelected(opt.type)" (click)="toggle(opt.type)">
              <span class="ico"
                [style.background]="opt.color + '1A'"
                [style.borderColor]="opt.color + '40'">
                {{ opt.icon }}
              </span>
              <div class="info">
                <span class="name">{{ opt.label }}</span>
                <span class="desc">{{ opt.description }}</span>
              </div>
              <span class="chk" [class.on]="isSelected(opt.type)">✓</span>
            </button>
          </div>
        }
      </div>

      <!-- CTA -->
      <button class="cta" [disabled]="!canProceed() || isLoading()" (click)="complete()">
        @if (isLoading()) {
          <span class="spin"></span>Configurazione in corso…
        } @else {
          Inizia
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        }
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--bg-primary); overflow-y: auto; }
    .screen { min-height: 100dvh; padding: 36px 20px 44px; display: flex; flex-direction: column; animation: scadit-fadeIn 280ms ease both; }
    .logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; animation: scadit-slideUp 380ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .logo-tile { width: 46px; height: 46px; border-radius: 13px; background: var(--accent-grad); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(108,99,255,0.45); }
    .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.4px; }
    .grad { background: var(--accent-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .sub { font-size: 14px; color: var(--text-secondary); line-height: 1.55; animation: scadit-slideUp 440ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .hint { font-size: 12px; color: var(--text-tertiary); font-weight: 600; margin: 6px 0 24px; }
    .cards { display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .stagger { opacity: 0; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) forwards; animation-delay: calc(var(--i,0) * 80ms + 200ms); }
    .card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: var(--radius); background: var(--glass); border: 1.5px solid var(--glass-border); backdrop-filter: blur(20px); cursor: pointer; text-align: left; transition: all 200ms ease; font-family: inherit; color: var(--text-primary); }
    .card.sel { border-color: var(--accent); background: rgba(108,99,255,0.06); box-shadow: 0 0 0 3px rgba(108,99,255,0.12); }
    .ico { width: 50px; height: 50px; border-radius: 13px; border: 1px solid; font-size: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; }
    .name { display: block; font-size: 15px; font-weight: 700; margin-bottom: 3px; }
    .desc { display: block; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
    .chk { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--glass-border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: transparent; transition: all 200ms ease; }
    .chk.on { background: var(--accent); border-color: var(--accent); color: white; }
    .cta { margin-top: 28px; border: none; padding: 16px; border-radius: var(--radius); background: var(--accent-grad); color: white; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 12px 28px rgba(108,99,255,0.40); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; transition: opacity 200ms ease; }
    .cta:disabled { opacity: 0.45; cursor: not-allowed; }
    .spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: scadit-spin 700ms linear infinite; display: inline-block; }
  `],
})
export class OnboardingComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly catalogService  = inject(CatalogService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly router          = inject(Router);

  readonly profileOptions  = PROFILE_OPTIONS;
  readonly selectedTypes   = signal<UserProfileType[]>([]);
  readonly isLoading       = signal(false);
  readonly canProceed      = computed(() => this.selectedTypes().length > 0);

  isSelected(type: UserProfileType): boolean {
    return this.selectedTypes().includes(type);
  }

  toggle(type: UserProfileType): void {
    const current = this.selectedTypes();
    this.selectedTypes.set(
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );
  }

  async complete(): Promise<void> {
    if (!this.canProceed() || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const profile: UserProfile = { profileTypes: this.selectedTypes() };
      await this.settingsService.saveProfile(profile);

      // Usa getAutoImportable: solo voci con data fissa nota (no "variable", no senza month/day)
      const dismissed = this.settingsService.dismissedCatalogIds();
      const entries = this.catalogService
        .getAutoImportable(this.selectedTypes())
        .filter((e) => !dismissed.includes(e.id));

      for (const entry of entries) {
        const draft    = this.catalogService.toDraft(entry);
        const deadline = DeadlineService.build(draft);
        const id       = await this.deadlineService.add(deadline);
        const saved    = await this.deadlineService.getById(id);
        if (saved) await this.notifScheduler.scheduleReminders(saved);
      }

      await this.router.navigate(['/deadlines']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
