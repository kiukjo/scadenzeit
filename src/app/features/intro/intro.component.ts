import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { BrandLogoComponent } from '../../shared/components/icon.component';

interface Slide {
  emoji: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🔔',
    title: 'Mai più scadenze dimenticate',
    body: 'ScadenzaIT tiene sotto controllo tasse, bollo, documenti e tutte le scadenze importanti della tua vita.',
    accent: '#6C63FF',
  },
  {
    emoji: '🇮🇹',
    title: 'Le scadenze italiane, già pronte',
    body: 'Scegli il tuo profilo e l\'app pre-compila IMU, 730, IVA, INPS, bollo auto e molto altro — con le date corrette.',
    accent: '#3B82F6',
  },
  {
    emoji: '🔒',
    title: 'Promemoria puntuali. Dati tuoi.',
    body: 'Notifiche all\'orario che preferisci e tutti i dati salvati solo sul tuo telefono. Niente account a pagamento, niente sorprese.',
    accent: '#2ED573',
  },
];

const INTRO_SEEN_KEY = 'scadenzait_intro_seen';

@Component({
  selector: 'app-intro',
  imports: [BrandLogoComponent],
  template: `
    <div class="screen">

      <div class="topbar">
        <div class="logo-wrap">
          <div class="logo-tile"><app-brand-logo [size]="26" /></div>
          <span class="brand">Scadenza<span class="grad">IT</span></span>
        </div>
        @if (!isLast()) {
          <button class="skip" (click)="finish()">Salta</button>
        }
      </div>

      <div class="stage">
        @for (s of slides; track s.title) {
          @if (slides[index()] === s) {
            <div class="slide" [style.--accent]="s.accent">
              <div class="emoji-tile" [style.background]="s.accent + '1A'" [style.borderColor]="s.accent + '40'">
                <span class="emoji">{{ s.emoji }}</span>
              </div>
              <h1 class="title">{{ s.title }}</h1>
              <p class="body">{{ s.body }}</p>
            </div>
          }
        }
      </div>

      <div class="dots">
        @for (s of slides; track s.title; let i = $index) {
          <span class="dot" [class.on]="i === index()"></span>
        }
      </div>

      <button class="cta" (click)="next()">
        {{ isLast() ? 'Inizia' : 'Avanti' }}
      </button>

    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--bg-primary); }
    .screen { min-height: 100dvh; padding: 20px 24px calc(env(safe-area-inset-bottom,0px) + 28px); display: flex; flex-direction: column; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding-top: env(safe-area-inset-top,0px); }
    .logo-wrap { display: flex; align-items: center; gap: 9px; }
    .logo-tile { width: 34px; height: 34px; border-radius: 10px; background: var(--accent-grad); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(108,99,255,0.4); }
    .brand { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }
    .grad { background: var(--accent-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .skip { background: none; border: none; color: var(--text-tertiary); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 6px; }
    .stage { flex: 1; display: flex; align-items: center; justify-content: center; }
    .slide { text-align: center; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .emoji-tile { width: 110px; height: 110px; border-radius: 32px; border: 1px solid; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; }
    .emoji { font-size: 56px; line-height: 1; }
    .title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 14px; line-height: 1.2; }
    .body { font-size: 15px; color: var(--text-secondary); line-height: 1.6; max-width: 320px; margin: 0 auto; }
    .dots { display: flex; gap: 8px; justify-content: center; margin: 28px 0; }
    .dot { width: 8px; height: 8px; border-radius: 4px; background: var(--glass-border); transition: all 240ms ease; }
    .dot.on { width: 22px; background: var(--accent); }
    .cta { border: none; padding: 16px; border-radius: 16px; background: var(--accent-grad); color: white; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 12px 28px rgba(108,99,255,0.4); font-family: inherit; }
  `],
})
export class IntroComponent {
  private readonly router = inject(Router);

  readonly slides = SLIDES;
  readonly index  = signal(0);
  readonly isLast = computed(() => this.index() === this.slides.length - 1);

  next(): void {
    if (this.isLast()) {
      this.finish();
    } else {
      this.index.update((i) => i + 1);
    }
  }

  finish(): void {
    try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* ignore */ }
    this.router.navigate(['/auth']);
  }
}
