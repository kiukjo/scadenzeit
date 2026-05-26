import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FREE_TIER } from '../../core/constants/free-tier.constants';

/**
 * Banner mostrato quando l'utente free raggiunge il limite di scadenze o documenti.
 * Si usa direttamente nei form al posto del contenuto quando isAtLimit = true.
 */
@Component({
  selector: 'app-premium-gate',
  imports: [RouterLink],
  template: `
    <div class="premium-gate">
      <div class="premium-gate-icon">🔒</div>
      <h2>Limite piano gratuito raggiunto</h2>

      @if (type() === 'deadlines') {
        <p>
          Hai raggiunto le <strong>{{ maxDeadlines }} scadenze</strong> incluse nel piano gratuito.
        </p>
      } @else {
        <p>
          Hai raggiunto i <strong>{{ maxDocuments }} documenti</strong> inclusi nel piano gratuito.
        </p>
      }

      <p class="premium-gate-sub">
        Passa a <strong>ScadenzaIT Premium</strong> per scadenze e documenti illimitati,
        sync multi-dispositivo e nessuna pubblicità.
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
