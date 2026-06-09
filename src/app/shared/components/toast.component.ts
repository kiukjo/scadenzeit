import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.current(); as t) {
      <div class="toast" [class.success]="t.variant === 'success'" [class.danger]="t.variant === 'danger'">
        <span class="msg">{{ t.message }}</span>
        @if (t.actionLabel) {
          <button class="act" type="button" (click)="toast.runAction()">{{ t.actionLabel }}</button>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      left: 0; right: 0;
      bottom: calc(76px + env(safe-area-inset-bottom, 0px));
      z-index: 120;
      display: flex; justify-content: center;
      padding: 0 16px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      max-width: 480px; width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 13px 14px 13px 18px;
      border-radius: 14px;
      background: var(--toast-bg, rgba(28,28,40,0.96));
      border: 1px solid var(--glass-border);
      box-shadow: 0 12px 32px rgba(0,0,0,0.4);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      animation: scadit-toastIn 320ms cubic-bezier(0.2,0.8,0.2,1) both;
    }
    .toast.success { border-color: rgba(46,213,115,0.4); }
    .toast.danger { border-color: rgba(255,71,87,0.4); }
    .msg { flex: 1; font-size: 13.5px; font-weight: 500; color: #fff; line-height: 1.35; }
    [data-theme="light"] .toast { background: rgba(30,30,46,0.97); }
    .act {
      flex-shrink: 0; border: none; cursor: pointer;
      background: transparent; color: var(--accent-2, #8B86FF);
      font-size: 13.5px; font-weight: 800; font-family: inherit;
      padding: 6px 10px; border-radius: 9px; letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    .act:active { background: rgba(255,255,255,0.08); }
    @keyframes scadit-toastIn {
      from { opacity: 0; transform: translateY(18px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
