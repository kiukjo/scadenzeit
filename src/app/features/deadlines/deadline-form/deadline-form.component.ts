import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../../core/services/deadline.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { DeadlineFormService } from '../../../core/services/deadline-form.service';
import { NotificationSchedulerService } from '../../../core/services/notification-scheduler.service';
import { SettingsService } from '../../../core/services/settings.service';
import { DeadlineCategory, DeadlineRecurrence } from '../../../core/models';
import { PremiumGateComponent } from '../../../shared/components/premium-gate.component';
import { FREE_TIER } from '../../../core/constants/free-tier.constants';

const CATEGORIES: { value: DeadlineCategory; label: string }[] = [
  { value: 'fisco',     label: 'Fisco' },
  { value: 'veicoli',   label: 'Veicoli' },
  { value: 'sanita',    label: 'Salute' },
  { value: 'documenti', label: 'Documenti' },
  { value: 'casa',      label: 'Casa' },
  { value: 'lavoro',    label: 'Lavoro' },
];

const RECURRENCES: { value: DeadlineRecurrence; label: string }[] = [
  { value: 'once',     label: 'Una tantum' },
  { value: 'monthly',  label: 'Mensile' },
  { value: 'yearly',   label: 'Annuale' },
  { value: 'biennial', label: 'Biennale' },
];

const REMINDER_OPTIONS = [1, 3, 7, 14, 30, 60, 90, 180];

@Component({
  selector: 'app-deadline-form',
  imports: [PremiumGateComponent],
  template: `
    <div class="deadline-form-page">
      <header class="page-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Indietro
        </button>
        <h1>Nuova scadenza</h1>
      </header>

      @if (isAtLimit()) {
        <app-premium-gate type="deadlines" />
      } @else {

        @if (preset()) {
          <div class="preset-banner">
            <span>Suggerito: <strong>{{ preset()!.category }}</strong></span>
            <button (click)="applyPreset()">Applica</button>
          </div>
        }

        <form class="form-card" (submit)="$event.preventDefault(); save()">

          <div class="form-group">
            <label>Nome scadenza *</label>
            <input
              class="input"
              type="text"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
              placeholder="es. Bolletta Enel, IMU prima rata…"
              required
            />
          </div>

          <div class="form-group">
            <label>Categoria</label>
            <select
              class="select"
              [value]="category()"
              (change)="category.set($any($event.target).value)"
            >
              @for (cat of categories; track cat.value) {
                <option [value]="cat.value">{{ cat.label }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Data scadenza *</label>
            <input
              class="input"
              type="date"
              [value]="dueDate()"
              (input)="dueDate.set($any($event.target).value)"
              required
            />
          </div>

          <div class="form-group">
            <label>Importo (€) — opzionale</label>
            <input
              class="input"
              type="number"
              min="0"
              step="0.01"
              [value]="amountStr()"
              (input)="amountStr.set($any($event.target).value)"
              placeholder="0,00"
            />
          </div>

          <div class="form-group">
            <label>Ricorrenza</label>
            <select
              class="select"
              [value]="recurrence()"
              (change)="recurrence.set($any($event.target).value)"
            >
              @for (r of recurrences; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Reminder</label>
            <div class="reminder-grid">
              @for (days of reminderOptions; track days) {
                <button
                  type="button"
                  class="reminder-chip"
                  [class.selected]="hasReminder(days)"
                  (click)="toggleReminder(days)"
                >
                  {{ days === 1 ? '1 giorno' : days + 'g' }}
                </button>
              }
            </div>
          </div>

          <div class="form-group">
            <label>Note — opzionale</label>
            <textarea
              class="textarea"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              rows="3"
              placeholder="Note aggiuntive…"
            ></textarea>
          </div>

          <button type="submit" class="btn-save" [disabled]="!isValid() || isSaving()">
            @if (isSaving()) {
              <span style="display:flex;align-items:center;gap:10px;justify-content:center">
                <span style="width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block"></span>
                Salvataggio…
              </span>
            } @else {
              Salva scadenza
            }
          </button>

        </form>

      } <!-- end @if isAtLimit -->
    </div>
  `,
})
export class DeadlineFormComponent {
  private readonly deadlineService = inject(DeadlineService);
  private readonly catalogService  = inject(CatalogService);
  private readonly formService     = inject(DeadlineFormService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly settingsService = inject(SettingsService);
  private readonly router          = inject(Router);

  readonly name       = signal('');
  readonly category   = signal<DeadlineCategory>('fisco');
  readonly dueDate    = signal('');
  readonly amountStr  = signal('');
  readonly recurrence = signal<DeadlineRecurrence>('once');
  readonly reminderDays = signal<number[]>([7, 1]);
  readonly notes      = signal('');
  readonly isSaving   = signal(false);

  readonly isAtLimit = computed(() => {
    if (this.settingsService.profile()?.isPremium) return false;
    return this.deadlineService.all().length >= FREE_TIER.MAX_DEADLINES;
  });

  constructor() {
    const state = history.state as {
      draft?: Partial<{
        customName: string;
        dueDate: Date | string;
        amountCents: number;
        category: DeadlineCategory;
        recurrence: DeadlineRecurrence;
        notes: string;
      }>
    };
    const draft = state?.draft;
    if (draft) {
      if (draft.customName) this.name.set(draft.customName);
      if (draft.category)   this.category.set(draft.category);
      if (draft.recurrence) this.recurrence.set(draft.recurrence);
      if (draft.notes)      this.notes.set(draft.notes);
      if (draft.dueDate) {
        const d = draft.dueDate instanceof Date ? draft.dueDate : new Date(draft.dueDate);
        if (!isNaN(d.getTime())) this.dueDate.set(this.toDateInputValue(d));
      }
      if (draft.amountCents && draft.amountCents > 0) {
        this.amountStr.set((draft.amountCents / 100).toFixed(2));
      }
    }
  }

  readonly categories    = CATEGORIES;
  readonly recurrences   = RECURRENCES;
  readonly reminderOptions = REMINDER_OPTIONS;

  readonly preset = computed(() => this.formService.suggestPreset(this.name()));

  readonly amountCents = computed(() => {
    const val = parseFloat(this.amountStr().replace(',', '.'));
    return isNaN(val) || val <= 0 ? undefined : Math.round(val * 100);
  });

  readonly isValid = computed(
    () => this.name().trim().length > 0 && this.dueDate().length > 0,
  );

  applyPreset(): void {
    const p = this.preset();
    if (!p) return;
    this.category.set(p.category);
    this.reminderDays.set([...p.reminders]);
    if (p.recurrence) this.recurrence.set(p.recurrence);
  }

  hasReminder(days: number): boolean {
    return this.reminderDays().includes(days);
  }

  toggleReminder(days: number): void {
    const current = this.reminderDays();
    this.reminderDays.set(
      current.includes(days)
        ? current.filter((d) => d !== days)
        : [...current, days].sort((a, b) => b - a),
    );
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const deadline = DeadlineService.build({
        customName:  this.name().trim(),
        category:    this.category(),
        dueDate:     new Date(this.dueDate()),
        amountCents: this.amountCents(),
        recurrence:  this.recurrence(),
        reminders:   this.reminderDays().length > 0 ? this.reminderDays() : [7, 1],
        completed:   false,
        notes:       this.notes().trim() || undefined,
      });

      const id    = await this.deadlineService.add(deadline);
      const saved = await this.deadlineService.getById(id);
      if (saved) await this.notifScheduler.scheduleReminders(saved);

      await this.router.navigate(['/deadlines']);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/deadlines']);
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
