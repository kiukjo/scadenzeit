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
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    type: 'dipendente',
    label: 'Lavoratore dipendente',
    description: '730, CU, esenzioni, documenti personali',
  },
  {
    type: 'autonomo',
    label: 'Autonomo / Partita IVA',
    description: 'IVA trimestrale, INPS, INAIL, albo professionale',
  },
  {
    type: 'proprietario_casa',
    label: 'Proprietario di casa',
    description: 'IMU, TARI, cedolare secca, caldaia, condominio',
  },
];

@Component({
  selector: 'app-onboarding',
  imports: [],
  template: `
    <div class="onboarding-container">
      <h1>Benvenuto in ScadenzaIT</h1>
      <p>Seleziona il tuo profilo per ricevere le scadenze più rilevanti.</p>
      <p><small>Puoi selezionare più profili.</small></p>

      <div class="profile-options">
        @for (option of profileOptions; track option.type) {
          <button
            [attr.aria-pressed]="isSelected(option.type)"
            [attr.data-selected]="isSelected(option.type)"
            (click)="toggle(option.type)"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.description }}</span>
          </button>
        }
      </div>

      <button
        [disabled]="!canProceed() || isLoading()"
        (click)="complete()"
      >
        @if (isLoading()) {
          Configurazione in corso…
        } @else {
          Inizia →
        }
      </button>
    </div>
  `,
})
export class OnboardingComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly catalogService = inject(CatalogService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler = inject(NotificationSchedulerService);
  private readonly router = inject(Router);

  readonly profileOptions = PROFILE_OPTIONS;
  readonly selectedTypes = signal<UserProfileType[]>([]);
  readonly isLoading = signal(false);

  readonly canProceed = computed(() => this.selectedTypes().length > 0);

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
      // Salva il profilo
      const profile: UserProfile = {
        isPremium: false,
        profileTypes: this.selectedTypes(),
      };
      await this.settingsService.saveProfile(profile);

      // Popola le scadenze dal catalogo (solo voci con data calcolabile)
      const entries = this.catalogService
        .getByProfile(this.selectedTypes())
        .filter((e) => e.recurrence !== 'variable');

      for (const entry of entries) {
        const draft = this.catalogService.toDraft(entry);
        const deadline = DeadlineService.build(draft);
        const id = await this.deadlineService.add(deadline);
        const saved = await this.deadlineService.getById(id);
        if (saved) await this.notifScheduler.scheduleReminders(saved);
      }

      await this.router.navigate(['/deadlines']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
