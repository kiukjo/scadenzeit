import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FREE_TIER } from '../../core/constants/free-tier.constants';

@Component({
  selector: 'app-premium-gate',
  imports: [RouterLink],
  template: `
    <div class="premium-gate">
      <div class="gate-icon">🔒</div>
      <h3>Limite piano gratuito</h3>

      @if (type() === 'deadlines') {
        <p>
          Hai raggiunto le <strong>{{ maxDeadlines }} scadenze</strong>
          incluse nel piano gratuito.
        </p>
      } @else {
        <p>
          Hai raggiunto i <strong>{{ maxDocuments }} documenti</strong>
          inclusi nel piano gratuito.
        </p>
      }

      <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:20px">
        Passa a Premium per scadenze illimitate, sync multi-dispositivo e nessuna pubblicità.
      </p>

      <a routerLink="/settings" class="btn-premium">
        Scopri Premium →
      </a>
    </div>
  `,
})
export class PremiumGateComponent {
  readonly type = input.required<'deadlines' | 'documents'>();

  readonly maxDeadlines = FREE_TIER.MAX_DEADLINES;
  readonly maxDocuments = FREE_TIER.MAX_DOCUMENTS;
}
