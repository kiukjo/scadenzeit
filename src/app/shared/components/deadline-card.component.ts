import { Component, input, output, computed } from '@angular/core';
import { Deadline } from '../../core/models';
import { ItalianDatePipe } from '../pipes/italian-date.pipe';
import { ImportoEuroPipe } from '../pipes/importo-euro.pipe';

export type UrgencyLevel = 'overdue' | 'urgent' | 'warning' | 'safe';

const CATEGORY_LABELS: Record<string, string> = {
  fisco:      'Fisco',
  veicoli:    'Veicoli',
  sanita:     'Salute',
  documenti:  'Documenti',
  casa:       'Casa',
  lavoro:     'Lavoro',
};

@Component({
  selector: 'app-deadline-card',
  imports: [ItalianDatePipe, ImportoEuroPipe],
  template: `
    <div class="deadline-card" [attr.data-urgency]="urgency()">
      <div class="card-top">
        <span class="category-pill">{{ categoryLabel() }}</span>
        <span class="urgency-chip">{{ urgencyLabel() }}</span>
      </div>

      <h3 class="card-title">{{ deadline().customName }}</h3>

      <div class="card-meta">
        <span>{{ deadline().dueDate | italianDate }}</span>
        @if (deadline().amountCents) {
          <span class="card-amount">{{ deadline().amountCents | importoEuro }}</span>
        }
      </div>

      @if (deadline().notes) {
        <p class="card-notes">{{ deadline().notes }}</p>
      }

      <div class="card-actions">
        <button (click)="onComplete.emit(deadline().id!)">
          {{ deadline().completed ? '↩ Riapri' : '✓ Completata' }}
        </button>
        <button (click)="onDelete.emit(deadline().id!)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class DeadlineCardComponent {
  readonly deadline   = input.required<Deadline>();
  readonly onComplete = output<number>();
  readonly onDelete   = output<number>();

  readonly categoryLabel = computed(() =>
    CATEGORY_LABELS[this.deadline().category] ?? this.deadline().category,
  );

  readonly daysLeft = computed(() => {
    const d = new Date(this.deadline().dueDate);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  });

  readonly urgency = computed((): UrgencyLevel => {
    const days = this.daysLeft();
    if (days < 0)   return 'overdue';
    if (days <= 7)  return 'urgent';
    if (days <= 30) return 'warning';
    return 'safe';
  });

  readonly urgencyLabel = computed((): string => {
    const days = this.daysLeft();
    if (days < 0)   return `Scaduta ${Math.abs(days)}g fa`;
    if (days === 0) return 'Scade oggi!';
    if (days === 1) return 'Domani!';
    if (days <= 7)  return `Tra ${days} giorni`;
    if (days <= 30) return `Tra ${days} giorni`;
    return `${days} giorni`;
  });
}
