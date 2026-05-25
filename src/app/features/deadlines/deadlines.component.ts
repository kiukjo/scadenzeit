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
        <h1>Le tue scadenze</h1>
        <a routerLink="new" class="btn-add">+ Aggiungi</a>
      </header>

      <!-- Filtri tab -->
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
            subtitle="Aggiungi una scadenza con il pulsante +"
          />
        } @else {
          @for (deadline of filtered(); track deadline.id) {
            <app-deadline-card
              [deadline]="deadline"
              (onComplete)="toggleComplete($event)"
              (onDelete)="remove($event)"
            />
          }
        }
      </div>
    </div>
  `,
})
export class DeadlinesComponent {
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler = inject(NotificationSchedulerService);

  readonly activeTab = signal<FilterTab>('upcoming');

  // Tutte le scadenze dal signal reattivo di DeadlineService
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
    { value: 'upcoming' as FilterTab,  label: 'In scadenza', count: computed(() => this.upcoming().length) },
    { value: 'completed' as FilterTab, label: 'Completate',  count: computed(() => this.completed().length) },
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
      ? 'Nessuna scadenza completata'
      : 'Nessuna scadenza in arrivo',
  );

  async toggleComplete(id: number): Promise<void> {
    const deadline = await this.deadlineService.getById(id);
    if (!deadline) return;

    await this.deadlineService.update(id, { completed: !deadline.completed });

    // Rischedula (o cancella) le notifiche
    const updated = await this.deadlineService.getById(id);
    if (updated) await this.notifScheduler.scheduleReminders(updated);
  }

  async remove(id: number): Promise<void> {
    const deadline = await this.deadlineService.getById(id);
    if (deadline) await this.notifScheduler.cancelReminders(deadline);
    await this.deadlineService.remove(id);
  }
}
