import { Injectable, signal } from '@angular/core';

export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void | Promise<void>;
  variant: 'default' | 'success' | 'danger';
}

/**
 * Snackbar globale con azione opzionale (es. "Annulla").
 * Un solo toast alla volta; quello nuovo sostituisce il precedente.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastData | null>(null);

  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(
    message: string,
    opts: {
      actionLabel?: string;
      action?: () => void | Promise<void>;
      variant?: ToastData['variant'];
      duration?: number;
    } = {},
  ): void {
    if (this.timer) clearTimeout(this.timer);

    const id = ++this.seq;
    this.current.set({
      id,
      message,
      actionLabel: opts.actionLabel,
      action: opts.action,
      variant: opts.variant ?? 'default',
    });

    const duration = opts.duration ?? (opts.action ? 5000 : 3000);
    this.timer = setTimeout(() => this.dismiss(id), duration);
  }

  /** Esegue l'azione associata (es. undo) e chiude il toast. */
  async runAction(): Promise<void> {
    const t = this.current();
    if (!t?.action) return;
    if (this.timer) clearTimeout(this.timer);
    this.current.set(null);
    await t.action();
  }

  dismiss(id?: number): void {
    if (id != null && this.current()?.id !== id) return;
    if (this.timer) clearTimeout(this.timer);
    this.current.set(null);
  }
}

/** Vibrazione leggera (Web Vibration API — funziona in WebView Android). No-op se non supportata. */
export function haptic(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supportato — ignora */
  }
}
