/**
 * icon.component.ts
 * ScadenzaIT — Custom SVG line icon set + brand logo.
 * Usage: <app-icon name="bell" [size]="20" />
 *        <app-brand-logo [size]="56" />
 */
import { Component, ChangeDetectionStrategy, inject, computed, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export const ICON_PATHS: Record<string, string> = {
  bell: `
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10 21a2 2 0 0 0 4 0"/>`,
  alarm: `
    <path d="M4 6.5C4 4.5 5.3 3 7 3"/>
    <path d="M20 6.5C20 4.5 18.7 3 17 3"/>
    <circle cx="12" cy="14" r="7"/>
    <path d="M12 14V9.5"/>
    <path d="M12 14l3 1.5"/>
    <path d="M6.5 20.5l-2 2"/>
    <path d="M17.5 20.5l2 2"/>`,
  calendar: `
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 10h18"/>
    <path d="M8 3v4M16 3v4"/>
    <circle cx="8" cy="14" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="14" r="0.8" fill="currentColor" stroke="none"/>`,
  car: `
    <path d="M5 17h14M5 17v-4l2-5h10l2 5v4M5 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M16 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2"/>
    <circle cx="8" cy="14.5" r="1"/>
    <circle cx="16" cy="14.5" r="1"/>`,
  scooter: `
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="18" r="3"/>
    <path d="M9 18h6M6 15V8a2 2 0 0 1 2-2h3l2 4h2a3 3 0 0 1 3 3v5"/>
    <path d="M11 6l-3-3"/>`,
  bike: `
    <circle cx="6" cy="17" r="3"/>
    <circle cx="18" cy="17" r="3"/>
    <path d="M6 17l4-9h5l-3 9M14 8l-2-4h-3"/>`,
  home: `
    <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>`,
  building: `
    <rect x="4" y="3" width="16" height="18" rx="1"/>
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>`,
  document: `
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <path d="M14 3v6h6"/>
    <path d="M8 13h8M8 17h5"/>`,
  idCard: `
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <circle cx="9" cy="12" r="2.5"/>
    <path d="M14 11h4M14 14h3"/>
    <path d="M5.5 17c.7-1.5 2-2.3 3.5-2.3s2.8.8 3.5 2.3"/>`,
  shield: `
    <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/>
    <path d="M9 12l2 2 4-4"/>`,
  wrench: `
    <path d="M15.5 3.5a4 4 0 0 0-4.5 5l-7.5 7.5a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0L15 12.5a4 4 0 0 0 5-4.5l-2.5 2.5-2.5-2.5z"/>`,
  pin: `
    <path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/>
    <circle cx="12" cy="10" r="2.5"/>`,
  camera: `
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
    <circle cx="12" cy="13.5" r="3.5"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18"/>`,
  check: `<path d="M5 12l5 5L20 7"/>`,
  chevronRight: `<path d="M9 6l6 6-6 6"/>`,
  chevronDown: `<path d="M6 9l6 6 6-6"/>`,
  chevronLeft: `<path d="M15 6l-6 6 6 6"/>`,
  trash: `
    <path d="M4 7h16"/>
    <path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/>
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
    <path d="M10 11v7M14 11v7"/>`,
  refresh: `
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
    <path d="M3 21v-5h5"/>`,
  image: `
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <circle cx="9" cy="10" r="1.5"/>
    <path d="M21 16l-5-5-9 9"/>`,
  flash: `<path d="M13 3L4 14h7l-1 7 9-11h-7z"/>`,
  sparkle: `
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/>
    <path d="M19 17l.7 2L22 19.7l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/>`,
  dots: `
    <circle cx="6" cy="12" r="1.4"/>
    <circle cx="12" cy="12" r="1.4"/>
    <circle cx="18" cy="12" r="1.4"/>`,
  download: `
    <path d="M12 4v12"/>
    <path d="M7 11l5 5 5-5"/>
    <path d="M5 20h14"/>`,
  settings: `
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
  user: `
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/>`,
  mail: `
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M3 7l9 7 9-7"/>`,
  key: `
    <circle cx="8" cy="15" r="4"/>
    <path d="M11 12l9-9M16 7l3 3M14 9l3 3"/>`,
  fingerprint: `
    <path d="M5 12a7 7 0 0 1 14 0v1"/>
    <path d="M8 12a4 4 0 0 1 8 0v3"/>
    <path d="M12 12v5M9 19c.5 1 1 2 2 2M15 19c-.5 1-1 2-2 2"/>`,
  moon: `<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>`,
  sun: `
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>`,
  globe: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18"/>`,
  book: `
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5"/>
    <path d="M4 4.5v18"/>
    <path d="M8 7h8M8 11h6"/>`,
  info: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 11v5M12 8v.01"/>`,
  logout: `
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/>
    <path d="M10 17l-5-5 5-5"/>
    <path d="M5 12h12"/>`,
  heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  chart: `
    <path d="M3 3v17a1 1 0 0 0 1 1h17"/>
    <path d="M7 15l3.5-4 3 2.5L19 7"/>`,
  euro: `
    <path d="M18 7a6 6 0 1 0 0 10"/>
    <path d="M4 11h8M4 14h7"/>`,
  users: `
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
};

export type IconName = keyof typeof ICON_PATHS;

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()" [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="color() || 'currentColor'"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round" stroke-linejoin="round"
      [innerHTML]="inner()"
      aria-hidden="true"
      style="display:block;flex-shrink:0;">
    </svg>
  `,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name        = input.required<string>();
  readonly size        = input<number>(20);
  readonly color       = input<string | undefined>(undefined);
  readonly strokeWidth = input<number>(1.75);

  readonly inner = computed((): SafeHtml => {
    const raw = ICON_PATHS[this.name()] ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });
}

// ─── Brand logo (alarm clock with red notification dot) ───────
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()" [attr.height]="size()"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style="display:block;overflow:visible;">
      <defs>
        <linearGradient id="bl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFFFFF"/>
          <stop offset="1" stop-color="#E8EAFF"/>
        </linearGradient>
        <linearGradient id="bl-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F4F5FA"/>
          <stop offset="1" stop-color="#D9DCF0"/>
        </linearGradient>
        <linearGradient id="bl-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FF6B7A"/>
          <stop offset="1" stop-color="#FF4757"/>
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="18" ry="2.5" fill="rgba(0,0,0,0.18)"/>
      <path d="M28 8 a4 4 0 0 1 8 0" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <path d="M12 17 C12 11, 15 8, 19 8 C22 8, 24.5 10, 25 13" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M52 17 C52 11, 49 8, 45 8 C42 8, 39.5 10, 39 13" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M14 49 L9 56" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M50 49 L55 56" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="32" cy="34" r="20" fill="url(#bl-body)"/>
      <circle cx="32" cy="34" r="16" fill="url(#bl-face)"/>
      <rect x="31.2" y="20" width="1.6" height="3.6" rx="0.8" fill="#6C63FF"/>
      <rect x="44.4" y="33.2" width="3.6" height="1.6" rx="0.8" fill="#9DA3C0"/>
      <rect x="31.2" y="44.4" width="1.6" height="3.6" rx="0.8" fill="#9DA3C0"/>
      <rect x="16" y="33.2" width="3.6" height="1.6" rx="0.8" fill="#9DA3C0"/>
      <path d="M32 34 L32 25" stroke="#0A0A1A" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 34 L41.5 38" stroke="#3B82F6" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="34" r="2" fill="#0A0A1A"/>
      <circle cx="32" cy="34" r="0.8" fill="#FFFFFF"/>
      <circle cx="50" cy="18" r="7" fill="url(#bl-dot)" stroke="#FFFFFF" stroke-width="2.5"/>
    </svg>
  `,
})
export class BrandLogoComponent {
  readonly size = input<number>(56);
}
