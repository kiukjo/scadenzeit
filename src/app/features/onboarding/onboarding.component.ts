import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { CatalogService } from '../../core/services/catalog.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { UserProfile, UserProfileType } from '../../core/models';

interface ProfileOption {
  type: UserProfileType;
  label: string;
  description: string;
  icon: string;
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    type: 'dipendente',
    label: 'Lavoratore dipendente',
    description: '730, CU, esenzioni fiscali, documenti personali',
    icon: '💼',
  },
  {
    type: 'autonomo',
    label: 'Autonomo / Partita IVA',
    description: 'IVA trimestrale, INPS, INAIL, albo professionale',
    icon: '🧾',
  },
  {
    type: 'proprietario_casa',
    label: 'Proprietario di casa',
    description: 'IMU, TARI, cedolare secca, caldaia, condominio',
    icon: '🏠',
  },
];

@Component({
  selector: 'app-onboarding',
  imports: [],
  template: `
    <div class="onboarding-page">
      <div class="onboarding-logo">ScadenzaIT</div>
      <h2>Ciao, benvenuto!</h2>
      <p class="onboarding-subtitle">
        Seleziona il tuo profilo — pre-compileremo le scadenze più importanti per te.<br>
        <small style="color:var(--text-muted)">Puoi selezionarne più di uno.</small>
      </p>

      <div class="profile-grid">
        @for (option of profileOptions; track option.type) {
          <button
            class="profile-card"
            [attr.data-selected]="isSelected(option.type)"
            (click)="toggle(option.type)"
          >
            <span class="profile-icon">{{ option.icon }}</span>
            <span class="profile-name">{{ option.label }}</span>
            <span class="profile-desc">{{ option.description }}</span>
          </button>
        }
      </div>

      <button
        class="btn-start"
        [disabled]="!canProceed() || isLoading()"
        (click)="complete()"
      >
        @if (isLoading()) {
          <span style="display:flex;align-items:center;gap:10px;justify-content:center">
            <span style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block"></span>
            Configurazione in corso…
          </span>
        } @else {
          Inizia →
        }
      </button>
    </div>
  `,
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
      const profile: UserProfile = {
        isPremium: false,
        profileTypes: this.selectedTypes(),
      };
      await this.settingsService.saveProfile(profile);

      const entries = this.catalogService
        .getByProfile(this.selectedTypes())
        .filter((e) => e.recurrence !== 'variable');

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
