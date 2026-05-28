import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from './icon.component';

const TABS = [
  { route: '/deadlines', icon: 'bell',     label: 'Scadenze',     primary: false },
  { route: '/vehicles',  icon: 'car',      label: 'Veicoli',      primary: false },
  { route: '/scan',      icon: 'camera',   label: 'Scansiona',    primary: true  },
  { route: '/documents', icon: 'document', label: 'Documenti',    primary: false },
  { route: '/settings',  icon: 'settings', label: 'Impostazioni', primary: false },
];

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="bnav">
      <div class="bnav-row">
        @for (tab of tabs; track tab.route) {
          @if (tab.primary) {
            <!-- Raised camera/scan tab -->
            <a [routerLink]="tab.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: false }"
               class="bnav-cell primary"
               [attr.aria-label]="tab.label">
              <span class="bubble">
                <app-icon [name]="tab.icon" [size]="22" color="#FFFFFF" />
              </span>
            </a>
          } @else {
            <a [routerLink]="tab.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: false }"
               class="bnav-cell"
               [attr.aria-label]="tab.label">
              <app-icon [name]="tab.icon" [size]="20" />
              <span class="bnav-label">{{ tab.label }}</span>
              <span class="bnav-underline"></span>
            </a>
          }
        }
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      left: 0; right: 0; bottom: 0;
      z-index: 50;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .bnav {
      background: var(--bottom-nav-bg);
      backdrop-filter: blur(30px) saturate(160%);
      -webkit-backdrop-filter: blur(30px) saturate(160%);
      border-top: 1px solid var(--glass-border);
    }
    .bnav-row {
      height: 64px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      align-items: stretch;
      padding: 0 6px;
    }
    .bnav-cell {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      position: relative;
      opacity: 0.6;
      transition: opacity 180ms ease;
      color: var(--text-secondary);
      text-decoration: none;
    }
    .bnav-cell.active {
      opacity: 1;
      color: var(--text-primary);
    }
    .bnav-cell.active .bnav-label { font-weight: 600; }
    .bnav-label {
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .bnav-underline {
      position: absolute;
      bottom: 6px;
      width: 0;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      transition: width 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .bnav-cell.active .bnav-underline { width: 22px; }

    /* Primary (scan) tab */
    .bnav-cell.primary {
      opacity: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .bubble {
      width: 52px;
      height: 52px;
      border-radius: 18px;
      background: var(--accent-grad);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -18px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow:
        0 10px 22px rgba(108, 99, 255, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .bnav-cell.primary:active .bubble { transform: scale(0.91); }
  `],
})
export class NavComponent {
  readonly tabs = TABS;
}
