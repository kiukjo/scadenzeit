import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Bottom navigation bar — visibile in tutte le schermate autenticate.
 * Nascosta su /auth e /onboarding (gestito da App).
 */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/deadlines" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
        <span class="nav-icon">📋</span>
        <small>Scadenze</small>
      </a>
      <a routerLink="/vehicles" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
        <span class="nav-icon">🚗</span>
        <small>Veicoli</small>
      </a>
      <a routerLink="/scan" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
        <span class="nav-icon">📷</span>
        <small>Scansiona</small>
      </a>
      <a routerLink="/documents" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
        <span class="nav-icon">📁</span>
        <small>Documenti</small>
      </a>
      <a routerLink="/settings" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
        <span class="nav-icon">⚙</span>
        <small>Impostazioni</small>
      </a>
    </nav>
  `,
})
export class NavComponent {}
