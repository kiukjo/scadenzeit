import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'dark' | 'light'>('dark');

  constructor() {
    // Restore from localStorage
    const saved = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('theme') as 'dark' | 'light' | null)
      : null;
    if (saved) this.theme.set(saved);

    // Apply to <html data-theme="…"> on every change
    effect(() => {
      const t = this.theme();
      document.documentElement.dataset['theme'] = t;
      try { localStorage.setItem('theme', t); } catch {}
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
