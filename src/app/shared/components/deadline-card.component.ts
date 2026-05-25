import { Component, input, output, computed } from '@angular/core';
import { Deadline } from '../../core/models';
import { ItalianDatePipe } from '../pipes/italian-date.pipe';
import { ImportoEuroPipe } from '../pipes/importo-euro.pipe';

export type UrgencyLevel = 'overdue' | 'urgent' | 'warning' | 'safe';

@Component({
  selector: 'app-deadline-card',
  imports: [ItalianDatePipe, ImportoEuroPipe],
  template: `
    <div [attr.data-urgency]="urgency()">
      <div class="card-header">
        <span class="category-badge">{{ deadline().category }}</span>
        <span class="urgency-label">{{ urgencyLabel() }}</span>
      </div>

      <h3 class="card-title">{{ deadline().customName }}</h3>

      <div class="card-meta">
        <span>{{ deadline().dueDate | italianDate }}</span>
        @if (deadline().amountCents) {
          <span>{{ deadline().amountCents | importoEuro }}</span>
        }
      </div>

      @if (deadline().notes) {
        <p class="card-notes">{{ deadline().notes }}</p>
      }

      <div class="card-actions">
        <button (click)="onComplete.emit(deadline().id!)">
          {{ deadline().completed ? 'Riapri' : 'Completata' }}
        </button>
        <button (click)="onDelete.emit(deadline().id!)">Elimina</button>
      </div>
    </div>
  `,
})
export class DeadlineCardComponent {
  readonly deadline = input.required<Deadline>();

  readonly onComplete = output<number>();
  readonly onDelete = output<number>();

  readonly daysLeft = computed(() => {
    const d = new Date(this.deadline().dueDate);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  });

  readonly urgency = computed((): UrgencyLevel => {
    const days = this.daysLeft();
    if (days < 0) return 'overdue';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'warning';
    return 'safe';
  });

  readonly urgencyLabel = computed((): string => {
    const days = this.daysLeft();
    if (days < 0) return `Scaduta ${Math.abs(days)} giorni fa`;
    if (days === 0) return 'Scade oggi!';
    if (days === 1) return 'Scade domani!';
    if (days <= 7) return `Scade tra ${days} giorni`;
    if (days <= 30) return `Scade tra ${days} giorni`;
    return `Scade tra ${days} giorni`;
  });
}
