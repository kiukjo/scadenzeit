import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../../core/services/deadline.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { DeadlineFormService } from '../../../core/services/deadline-form.service';
import { NotificationSchedulerService } from '../../../core/services/notification-scheduler.service';
import { DeadlineCategory, DeadlineRecurrence } from '../../../core/models';

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
  imports: [],
  template: `
    <div class="deadline-form-page">
      <header class="page-header">
        <button (click)="goBack()">← Indietro</button>
        <h1>Nuova scadenza</h1>
      </header>

      <!-- Suggerimento preset -->
      @if (preset()) {
        <div class="preset-banner">
          <span>Suggerito: <strong>{{ preset()!.category }}</strong></span>
          <button (click)="applyPreset()">Applica</button>
        </div>
      }

      <form (submit)="$event.preventDefault(); save()">

        <!-- Nome / ente -->
        <label>
          Nome scadenza *
          <input
            type="text"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
            placeholder="es. Bolletta Enel, IMU prima rata…"
            required
          />
        </label>

        <!-- Categoria -->
        <label>
          Categoria
          <select
            [value]="category()"
            (change)="category.set($any($event.target).value)"
          >
            @for (cat of categories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
        </label>

        <!-- Data scadenza -->
        <label>
          Data scadenza *
          <input
            type="date"
            [value]="dueDate()"
            (input)="dueDate.set($any($event.target).value)"
            required
          />
        </label>

        <!-- Importo -->
        <label>
          Importo (€) — opzionale
          <input
            type="number"
            min="0"
            step="0.01"
            [value]="amountStr()"
            (input)="amountStr.set($any($event.target).value)"
            placeholder="0,00"
          />
        </label>

        <!-- Ricorrenza -->
        <label>
          Ricorrenza
          <select
            [value]="recurrence()"
            (change)="recurrence.set($any($event.target).value)"
          >
            @for (r of recurrences; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
        </label>

        <!-- Reminder -->
        <fieldset>
          <legend>Reminder (giorni prima)</legend>
          @for (days of reminderOptions; track days) {
            <label>
              <input
                type="checkbox"
                [checked]="hasReminder(days)"
                (change)="toggleReminder(days)"
              />
              {{ days === 1 ? '1 giorno' : days + ' giorni' }}
            </label>
          }
        </fieldset>

        <!-- Note -->
        <label>
          Note — opzionale
          <textarea
            [value]="notes()"
            (input)="notes.set($any($event.target).value)"
            rows="3"
            placeholder="Note aggiuntive…"
          ></textarea>
        </label>

        <button type="submit" [disabled]="!isValid() || isSaving()">
          @if (isSaving()) { Salvataggio… } @else { Salva scadenza }
        </button>
      </form>
    </div>
  `,
})
export class DeadlineFormComponent {
  private readonly deadlineService = inject(DeadlineService);
  private readonly catalogService = inject(CatalogService);
  private readonly formService = inject(DeadlineFormService);
  private readonly notifScheduler = inject(NotificationSchedulerService);
  private readonly router = inject(Router);

  // ── Campi form come signal ─────────────────────────────────────────────────
  readonly name = signal('');
  readonly category = signal<DeadlineCategory>('fisco');
  readonly dueDate = signal('');
  readonly amountStr = signal('');
  readonly recurrence = signal<DeadlineRecurrence>('once');
  readonly reminderDays = signal<number[]>([7, 1]);
  readonly notes = signal('');
  readonly isSaving = signal(false);

  constructor() {
    // Pre-popola il form se navigato dallo scanner (QR/CBill o OCR)
    const state = history.state as { draft?: Partial<{ customName: string; dueDate: Date | string; amountCents: number; category: DeadlineCategory; recurrence: DeadlineRecurrence; notes: string }> };
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

  // ── Dati statici ──────────────────────────────────────────────────────────
  readonly categories = CATEGORIES;
  readonly recurrences = RECURRENCES;
  readonly reminderOptions = REMINDER_OPTIONS;

  // ── Stato derivato ────────────────────────────────────────────────────────
  readonly preset = computed(() => this.formService.suggestPreset(this.name()));

  readonly amountCents = computed(() => {
    const val = parseFloat(this.amountStr().replace(',', '.'));
    return isNaN(val) || val <= 0 ? undefined : Math.round(val * 100);
  });

  readonly isValid = computed(
    () => this.name().trim().length > 0 && this.dueDate().length > 0,
  );

  // ── Azioni ────────────────────────────────────────────────────────────────

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
        customName: this.name().trim(),
        category: this.category(),
        dueDate: new Date(this.dueDate()),
        amountCents: this.amountCents(),
        recurrence: this.recurrence(),
        reminders: this.reminderDays().length > 0 ? this.reminderDays() : [7, 1],
        completed: false,
        notes: this.notes().trim() || undefined,
      });

      const id = await this.deadlineService.add(deadline);
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

  /** Converte una Date nel formato YYYY-MM-DD richiesto da <input type="date"> */
  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
