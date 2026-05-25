import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <p class="empty-title">{{ title() }}</p>
      <p class="empty-subtitle">{{ subtitle() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input('Nessuna scadenza');
  readonly subtitle = input('Aggiungi la tua prima scadenza con il pulsante +');
}
