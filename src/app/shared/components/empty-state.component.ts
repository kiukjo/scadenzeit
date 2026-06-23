import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <span class="empty-icon">{{ icon() }}</span>
      <div class="empty-title">{{ title() }}</div>
      <div class="empty-subtitle">{{ subtitle() }}</div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 64px 32px 40px;
      animation: scadit-fadeIn 320ms ease both;
    }
    .empty-icon {
      font-size: 60px;
      line-height: 1;
      margin-bottom: 18px;
      animation: scadit-float 3s ease-in-out infinite;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .empty-subtitle {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.55;
      max-width: 280px;
    }
  `],
})
export class EmptyStateComponent {
  readonly title    = input('Nessuna scadenza');
  readonly subtitle = input('Aggiungi la tua prima scadenza con il pulsante +');
  readonly icon     = input('📋');
}
