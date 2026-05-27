import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { DeadlineCardComponent } from '../../shared/components/deadline-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { Deadline, DeadlineCategory } from '../../core/models';

type FilterTab = 'upcoming' | 'completed' | DeadlineCategory;

@Component({
  selector: 'app-deadlines',
  imports: [RouterLink, DeadlineCardComponent, EmptyStateComponent],
  template: `
    <div class="deadlines-page">
      <header class="page-header">
        <h1>Scadenze</h1>
        <a routerLink="new" class="fab" aria-label="Aggiungi scadenza">+</a>
      </header>

      <!-- Urgency summary strip -->
      @if (overdue().length > 0) {
        <div style="
          margin: 0 0 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(255,77,109,.10);
          border: 1px solid rgba(255,77,109,.25);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: .85rem;
          color: var(--color-overdue);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <strong>{{ overdue().length }} {{ overdue().length === 1 ? 'scadenza scaduta' : 'scadenze scadute' }}</strong>
        </div>
      }

      <!-- Filter tabs -->
      <nav class="filter-tabs">
        @for (tab of tabs; track tab.value) {
          <button
            [attr.data-active]="activeTab() === tab.value"
            (click)="activeTab.set(tab.value)"
          >
            {{ tab.label }}
            @if (tab.count() > 0) {
              <span class="badge">{{ tab.count() }}</span>
            }
          </button>
        }
      </nav>

      <!-- Lista scadenze -->
      <div class="deadline-list">
        @if (filtered().length === 0) {
          <app-empty-state
            [title]="emptyTitle()"
            [subtitle]="emptySubtitle()"
            icon="📅"
          />
        } @else {
          @for (deadline of filtered(); track deadline.id; let i = $index) {
            <div [style.animation-delay]="(i * 40) + 'ms'">
              <app-deadline-card
                [deadline]="deadline"
                (onComplete)="toggleComplete($event)"
                (onDelete)="remove($event)"
              />
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class DeadlinesComponent {
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);

  readonly activeTab = signal<FilterTab>('upcoming');
  private readonly all = this.deadlineService.all;

  readonly upcoming = computed(() =>
    this.all()
      .filter((d) => !d.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  readonly completed = computed(() =>
    this.all().filter((d) => d.completed),
  );

  readonly overdue = computed(() =>
    this.upcoming().filter((d) => new Date(d.dueDate) < new Date()),
  );

  readonly tabs = [
    {
      value: 'upcoming' as FilterTab,
      label: 'In scadenza',
      count: computed(() => this.upcoming().length),
    },
    {
      value: 'completed' as FilterTab,
      label: 'Completate',
      count: computed(() => this.completed().length),
    },
  ];

  readonly filtered = computed((): Deadline[] => {
    switch (this.activeTab()) {
      case 'upcoming':  return this.upcoming();
      case 'completed': return this.completed();
      default:          return this.all();
    }
  });

  readonly emptyTitle = computed(() =>
    this.activeTab() === 'completed'
      ? 'Nessuna completata'
      : 'Tutto in regola!',
  );

  readonly emptySubtitle = computed(() =>
    this.activeTab() === 'completed'
      ? 'Completa una scadenza per vederla qui'
      : 'Aggiungi una scadenza con il pulsante +',
  );

  async toggleComplete(id: number): Promise<void> {
    const deadline = await this.deadlineService.getById(id);
    if (!deadline) return;
    await this.deadlineService.update(id, { completed: !deadline.completed });
    const updated = await this.deadlineService.getById(id);
    if (updated) await this.notifScheduler.scheduleReminders(updated);
  }

  async remove(id: number): Promise<void> {
    const deadline = await this.deadlineService.getById(id);
    if (deadline) await this.notifScheduler.cancelReminders(deadline);
    await this.deadlineService.remove(id);
  }
}
