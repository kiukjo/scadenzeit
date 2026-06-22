import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReviewService } from '../../core/services/review.service';

@Component({
  selector: 'app-review-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (review.visible()) {
      <div class="scrim" (click)="review.later()">
        <div class="card" (click)="$event.stopPropagation()">
          <div class="emoji">⭐️</div>
          <div class="title">Ti piace ScadenzaIT?</div>
          <div class="body">Se ti sta facendo risparmiare scadenze (e multe!), una recensione ci aiuta tantissimo. Bastano 10 secondi.</div>

          <div class="stars">
            @for (s of [1,2,3,4,5]; track s) {
              <button class="star" [class.on]="s <= hover()"
                (click)="review.rate()"
                (mouseenter)="hover.set(s)" (mouseleave)="hover.set(0)">★</button>
            }
          </div>

          <button class="cta" (click)="review.rate()">Lascia una recensione</button>
          <div class="links">
            <button (click)="review.later()">Più tardi</button>
            <span>·</span>
            <button (click)="review.never()">Non chiedere più</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .scrim { position: fixed; inset: 0; z-index: 130; display: flex; align-items: center; justify-content: center; padding: 28px; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); animation: scadit-fadeIn 200ms ease both; }
    .card { width: 100%; max-width: 360px; background: var(--confirm-bg, var(--modal-bg)); border: 1px solid var(--glass-border); border-radius: 24px; padding: 26px 22px 18px; text-align: center; animation: scadit-slideUp 360ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .emoji { font-size: 44px; }
    .title { font-size: 19px; font-weight: 800; margin-top: 8px; letter-spacing: -0.3px; }
    .body { font-size: 13.5px; color: var(--text-secondary); line-height: 1.55; margin: 8px 4px 16px; }
    .stars { display: flex; justify-content: center; gap: 6px; margin-bottom: 18px; }
    .star { background: none; border: none; font-size: 34px; line-height: 1; cursor: pointer; color: var(--glass-border); transition: transform 120ms ease, color 120ms ease; padding: 0; }
    .star.on { color: #FFC53D; }
    .star:active { transform: scale(1.25); }
    .cta { width: 100%; padding: 14px; border: none; border-radius: 14px; background: var(--accent-grad); color: #fff; font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 10px 24px rgba(108,99,255,0.4); }
    .links { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; }
    .links button { background: none; border: none; color: var(--text-tertiary); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 6px; }
    .links span { color: var(--text-tertiary); font-size: 12px; }
  `],
})
export class ReviewPromptComponent {
  readonly review = inject(ReviewService);
  readonly hover = signal(0);
}
