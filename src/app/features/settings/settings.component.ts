import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { CatalogService } from '../../core/services/catalog.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { BackupService } from '../../core/services/backup.service';
import { IcsService } from '../../core/services/ics.service';
import { DocumentService } from '../../core/services/document.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-settings',
  imports: [IconComponent],
  template: `
    <div class="screen">
      <header class="header">
        <h1 class="title">Impostazioni</h1>
        <p class="sub">Personalizza la tua esperienza</p>
      </header>

      <!-- ── Hero account card ───────────────────────────────────── -->
      <div class="pad">
        <div class="hero stagger" style="--i:0">
          <span class="avatar">{{ initials() }}</span>
          <div class="hero-info">
            <div class="hero-name">{{ displayName() }}</div>
            <div class="hero-email">{{ user()?.email ?? '—' }}</div>
            <div class="hero-plan">
              @if (memberSince()) {
                <span class="plan-since">Membro da {{ memberSince() }}</span>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- ── Privacy ─────────────────────────────────────────────── -->
      <div class="section-label">Privacy</div>
      <div class="pad">
        <div class="privacy-card stagger" style="--i:1">
          <span class="pc-icon"><app-icon name="shield" [size]="20" color="#2ED573" /></span>
          <div class="pc-body">
            <div class="pc-title">I tuoi dati restano sul tuo telefono</div>
            <div class="pc-sub">
              Scadenze e documenti sono salvati in locale. I documenti non lasciano mai il dispositivo.
            </div>
            <div class="pc-stats">
              <span><strong>{{ deadlineCount() }}</strong> scadenze</span>
              <span class="pc-dot">·</span>
              <span><strong>{{ documentCount() }}</strong> documenti</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Account group ───────────────────────────────────────── -->
      <div class="section-label">Account</div>
      <div class="pad">
        <div class="group stagger" style="--i:2">
          <div class="row">
            <span class="row-icon"><app-icon name="user" [size]="15" /></span>
            <div class="row-label">Profilo</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="mail" [size]="15" /></span>
            <div class="row-label">Email</div>
            <span class="row-trail">{{ emailShort() }}</span>
          </div>
        </div>
      </div>

      <!-- ── App group ───────────────────────────────────────────── -->
      <div class="section-label">App</div>
      <div class="pad">
        <div class="group stagger" style="--i:3">
          <!-- Theme toggle -->
          <div class="row">
            <span class="row-icon"><app-icon name="moon" [size]="15" /></span>
            <div class="row-label">Tema scuro</div>
            <button class="toggle-pill" type="button"
              [class.on]="theme() === 'dark'"
              (click)="themeService.toggle()">
              <span class="knob" [class.on]="theme() === 'dark'"></span>
            </button>
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="bell" [size]="15" /></span>
            <div class="row-label">Orario promemoria</div>
            <select class="hour-sel" [value]="notifHour()" (change)="onHourChange($event)">
              @for (h of hourOptions; track h) {
                <option [value]="h">{{ pad(h) }}:00</option>
              }
            </select>
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="globe" [size]="15" /></span>
            <div class="row-label">Lingua</div>
            <span class="row-trail">Italiano</span>
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="book" [size]="15" /></span>
            <div class="row-label">Centro assistenza</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row">
            <span class="row-icon"><app-icon name="info" [size]="15" /></span>
            <div class="row-label">Informazioni</div>
            <span class="row-trail">v 0.6.0</span>
          </div>
        </div>
      </div>

      <!-- ── Scadenze group ─────────────────────────────────────── -->
      <div class="section-label">Scadenze</div>
      <div class="pad">
        <div class="group stagger" style="--i:4">
          <div class="row" (click)="reimportCatalog()">
            <span class="row-icon"><app-icon name="refresh" [size]="15" /></span>
            <div class="row-label">Aggiorna scadenze dal profilo</div>
            @if (isReimporting()) {
              <span class="spin-sm"></span>
            } @else {
              <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
            }
          </div>
        </div>
        @if (reimportToast()) {
          <p class="toast-msg">{{ reimportToast() }}</p>
        }
      </div>

      <!-- ── Dati e backup ──────────────────────────────────────── -->
      <div class="section-label">Dati e backup</div>
      <div class="pad">
        <div class="group stagger" style="--i:5">
          <div class="row" (click)="exportBackup()">
            <span class="row-icon"><app-icon name="download" [size]="15" /></span>
            <div class="row-label">Esporta backup</div>
            <span class="row-trail">.json</span>
          </div>
          <div class="sep"></div>
          <div class="row" (click)="fileInput.click()">
            <span class="row-icon"><app-icon name="refresh" [size]="15" /></span>
            <div class="row-label">Ripristina da backup</div>
            <app-icon name="chevronRight" [size]="14" color="var(--text-tertiary)" />
          </div>
          <div class="sep"></div>
          <div class="row" (click)="exportIcs()">
            <span class="row-icon"><app-icon name="calendar" [size]="15" /></span>
            <div class="row-label">Esporta nel calendario</div>
            <span class="row-trail">.ics</span>
          </div>
        </div>
        <input #fileInput type="file" accept="application/json,.json" hidden (change)="onBackupFile($event)" />
        <p class="data-hint">Il backup include scadenze, veicoli e impostazioni. Trasferiscilo su un nuovo telefono per ritrovare tutto.</p>
        @if (dataToast()) {
          <p class="toast-msg">{{ dataToast() }}</p>
        }
      </div>

      <!-- ── Logout button ───────────────────────────────────────── -->
      <div class="pad">
        <button class="logout-btn" type="button" (click)="confirmOpen.set(true)">
          <app-icon name="logout" [size]="16" />
          Esci dall'account
        </button>
      </div>

      <p class="footer">
        Fatto in Italia con <span style="color:var(--danger)">♥</span> · ScadenzaIT
      </p>

      <!-- ── Confirm dialog ──────────────────────────────────────── -->
      @if (confirmOpen()) {
        <div class="modal-scrim" (click)="confirmOpen.set(false)">
          <div class="confirm slide-up" (click)="$event.stopPropagation()">
            <div class="confirm-icon">
              <app-icon name="logout" [size]="22" color="#FF4757" />
            </div>
            <div class="confirm-title">Vuoi davvero uscire?</div>
            <div class="confirm-body">
              Dovrai inserire di nuovo l'email e il codice OTP al prossimo accesso.
            </div>
            <div class="confirm-actions">
              <button class="btn-secondary" type="button" (click)="confirmOpen.set(false)">
                Annulla
              </button>
              <button class="btn-danger" type="button" [disabled]="isLoggingOut()" (click)="logout()">
                @if (isLoggingOut()) {
                  <span class="btn-spinner"></span>
                } @else {
                  Esci
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .screen {
      padding-bottom: 100px;
      animation: scadit-fadeIn 280ms ease both;
    }

    .stagger {
      opacity: 0;
      animation: scadit-slideUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: calc(var(--i, 0) * 50ms);
    }
    .slide-up { animation: scadit-slideUp 380ms cubic-bezier(0.2,0.8,0.2,1) both; }

    /* ── Header ── */
    .header { padding: 8px 20px 18px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }

    .pad { padding: 0 16px 18px; }
    .section-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--text-tertiary);
      padding: 4px 20px 8px;
    }

    /* ── Hero card ── */
    .hero {
      border-radius: var(--radius-lg); padding: 18px;
      display: flex; align-items: center; gap: 14px;
      background: linear-gradient(135deg, rgba(108,99,255,0.18), rgba(59,130,246,0.10));
      border: 1px solid rgba(108,99,255,0.30);
      box-shadow: 0 10px 28px rgba(108,99,255,0.18);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
    }
    .avatar {
      width: 56px; height: 56px; border-radius: 28px;
      background: var(--accent-grad);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: white; letter-spacing: 0.5px;
      box-shadow: 0 6px 16px rgba(108,99,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
      flex-shrink: 0;
    }
    .hero-name { font-size: 16px; font-weight: 700; }
    .hero-email { font-size: 12px; color: var(--text-secondary); margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
    .hero-plan { margin-top: 8px; display: inline-flex; align-items: center; gap: 5px; }
    .plan-badge {
      font-size: 10px; font-weight: 800; letter-spacing: 1px;
      padding: 3px 8px; border-radius: 6px;
      background: var(--plate-bg); color: var(--text-primary);
    }
    .plan-since { font-size: 11px; color: var(--text-secondary); font-weight: 500; }

    /* ── Privacy card ── */
    .privacy-card {
      border-radius: var(--radius); padding: 16px;
      display: flex; align-items: flex-start; gap: 12px;
      background: linear-gradient(135deg, rgba(46,213,115,0.12), rgba(46,213,115,0.04));
      border: 1px solid rgba(46,213,115,0.28);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
    }
    .pc-icon {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      background: rgba(46,213,115,0.12); border: 1px solid rgba(46,213,115,0.30);
      display: flex; align-items: center; justify-content: center;
    }
    .pc-body { flex: 1; min-width: 0; }
    .pc-title { font-size: 14px; font-weight: 700; letter-spacing: -0.1px; }
    .pc-sub { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-top: 4px; }
    .pc-stats { font-size: 12px; color: var(--text-secondary); margin-top: 10px; }
    .pc-stats strong { color: var(--text-primary); font-variant-numeric: tabular-nums; }
    .pc-dot { margin: 0 6px; color: var(--text-tertiary); }

    /* ── Row groups ── */
    .group {
      border-radius: var(--radius); overflow: hidden;
      background: var(--glass); backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
    }
    .row {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 14px; cursor: pointer; color: var(--text-primary);
    }
    .row-icon {
      width: 32px; height: 32px; border-radius: 10px;
      background: var(--icon-tile-bg); border: 1px solid var(--icon-tile-border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--text-secondary);
    }
    .row-label { flex: 1; font-size: 13.5px; font-weight: 500; }
    .row-trail { font-size: 12px; color: var(--text-secondary); }
    .sep {
      height: 1px; margin-left: 56px;
      background: rgba(255,255,255,0.06);
    }
    [data-theme="light"] .sep { background: rgba(10,10,30,0.07); }

    /* ── Toggle pill ── */
    .toggle-pill {
      width: 40px; height: 24px; border-radius: 12px;
      border: none; cursor: pointer; padding: 0;
      background: rgba(255,255,255,0.10);
      position: relative; transition: background 200ms ease; flex-shrink: 0;
    }
    [data-theme="light"] .toggle-pill { background: rgba(10,10,30,0.12); }
    .toggle-pill.on { background: var(--accent-grad); }
    .knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 9px;
      background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.35);
      transition: left 200ms cubic-bezier(0.2,0.8,0.2,1);
    }
    .knob.on { left: 19px; }

    .spin-sm{width:16px;height:16px;border-radius:50%;border:2px solid var(--glass-border);border-top-color:var(--accent);animation:scadit-spin .7s linear infinite;flex-shrink:0}
    .toast-msg{font-size:12px;color:var(--success);font-weight:600;text-align:center;margin:8px 0 0;animation:scadit-fadeIn 200ms ease both}
    .data-hint{font-size:11.5px;color:var(--text-tertiary);line-height:1.5;margin:8px 4px 0}
    .hour-sel{appearance:none;-webkit-appearance:none;background:var(--glass);border:1px solid var(--glass-border);border-radius:9px;padding:5px 12px;color:var(--text-primary);font-size:13px;font-weight:700;font-family:var(--font-mono);cursor:pointer}

    /* ── Logout ── */
    .logout-btn {
      width: 100%; padding: 14px; border-radius: 14px;
      border: 1px solid rgba(255,71,87,0.30);
      background: rgba(255,71,87,0.08);
      color: var(--danger); font-size: 14px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit;
    }

    .footer {
      text-align: center; font-size: 11px; color: var(--text-tertiary);
      padding: 4px 16px 20px; letter-spacing: 0.3px; margin: 0;
    }

    /* ── Confirm dialog ── */
    .modal-scrim {
      position: fixed; inset: 0; z-index: 80;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      animation: scadit-fadeIn 200ms ease both;
    }
    .confirm {
      width: 100%; background: var(--confirm-bg);
      border-radius: 22px; padding: 22px;
      border: 1px solid var(--glass-border);
      text-align: center; backdrop-filter: blur(20px);
    }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 18px;
      margin: 0 auto 12px;
      background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.30);
      display: flex; align-items: center; justify-content: center;
    }
    .confirm-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
    .confirm-body { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 18px; }
    .confirm-actions { display: flex; gap: 10px; }
    .btn-secondary {
      flex: 1; padding: 12px; border-radius: 14px;
      border: 1px solid var(--glass-border); background: var(--glass);
      color: var(--text-primary); font-size: 13.5px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-danger {
      flex: 1; padding: 12px; border-radius: 14px;
      border: none; cursor: pointer;
      background: linear-gradient(135deg, var(--danger), #B5333E);
      color: white; font-size: 13.5px; font-weight: 700;
      box-shadow: 0 8px 18px rgba(255,71,87,0.35);
      font-family: inherit;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: scadit-spin 0.8s linear infinite;
    }
  `],
})
export class SettingsComponent {
  private readonly authService     = inject(SupabaseAuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly catalogService  = inject(CatalogService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly backupService   = inject(BackupService);
  private readonly icsService      = inject(IcsService);
  private readonly documentService = inject(DocumentService);
  readonly         themeService    = inject(ThemeService);
  private readonly router          = inject(Router);

  readonly user           = this.authService.user;
  readonly profile        = this.settingsService.profile;
  readonly theme          = this.themeService.theme;

  readonly isLoggingOut   = signal(false);
  readonly confirmOpen    = signal(false);
  readonly isReimporting  = signal(false);
  readonly reimportToast  = signal<string | null>(null);
  readonly dataToast      = signal<string | null>(null);

  readonly deadlineCount = computed(() => this.deadlineService.all().length);
  readonly documentCount = computed(() => this.documentService.all().length);

  readonly notifHour    = this.settingsService.notifHour;
  readonly hourOptions  = [7, 8, 9, 10, 12, 14, 18, 20, 21];

  pad(h: number): string {
    return String(h).padStart(2, '0');
  }

  async onHourChange(ev: Event): Promise<void> {
    const hour = parseInt((ev.target as HTMLSelectElement).value, 10);
    if (isNaN(hour)) return;
    await this.settingsService.setNotifHour(hour);
    // Ripianifica tutte le notifiche con il nuovo orario
    await this.notifScheduler.scheduleAll(this.deadlineService.all());
    this.showDataToast(`✓ Promemoria spostati alle ${this.pad(hour)}:00`);
  }

  readonly emailShort = computed(() => {
    const email = this.user()?.email ?? '';
    return email.split('@')[0] || '—';
  });

  readonly displayName = computed(() => {
    const email = this.profile()?.email ?? this.user()?.email ?? '';
    return email.split('@')[0] || 'Utente';
  });

  readonly initials = computed(() => {
    const name = this.displayName();
    return name.slice(0, 2).toUpperCase();
  });

  readonly memberSince = computed(() => {
    const createdAt = this.user()?.created_at;
    if (!createdAt) return null;
    const d = new Date(createdAt);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}/${d.getFullYear()}`;
  });

  async reimportCatalog(): Promise<void> {
    const profileTypes = this.profile()?.profileTypes;
    if (!profileTypes?.length || this.isReimporting()) return;
    this.isReimporting.set(true);
    try {
      const importable = this.catalogService.getAutoImportable(profileTypes);
      const existingIds = new Set(
        this.deadlineService.all().map(d => d.catalogId).filter(Boolean)
      );
      const missing = importable.filter(e => !existingIds.has(e.id));
      for (const entry of missing) {
        const draft    = this.catalogService.toDraft(entry);
        const deadline = DeadlineService.build(draft);
        const id       = await this.deadlineService.add(deadline);
        const saved    = await this.deadlineService.getById(id);
        if (saved) await this.notifScheduler.scheduleReminders(saved);
      }
      const n = missing.length;
      this.reimportToast.set(
        n > 0 ? `✓ ${n} scadenz${n === 1 ? 'a aggiunta' : 'e aggiunte'}!`
               : '✓ Tutto aggiornato — nessuna novità'
      );
      setTimeout(() => this.reimportToast.set(null), 3500);
    } finally {
      this.isReimporting.set(false);
    }
  }

  // ── Backup / Ripristino / Calendario ─────────────────────────

  async exportBackup(): Promise<void> {
    const json = await this.backupService.exportAll();
    const date = new Date().toISOString().slice(0, 10);
    this.download(`scadenzait-backup-${date}.json`, json, 'application/json');
    this.showDataToast('✓ Backup esportato');
  }

  async onBackupFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const r = await this.backupService.importAll(text);
      const tot = r.deadlines + r.vehicles + r.documents;
      this.showDataToast(
        tot > 0
          ? `✓ Ripristinati: ${r.deadlines} scadenze, ${r.vehicles} veicoli, ${r.documents} documenti`
          : '✓ Tutto già presente — nessun nuovo dato',
      );
    } catch (e) {
      this.showDataToast(`⚠ ${(e as Error).message}`);
    } finally {
      input.value = '';
    }
  }

  exportIcs(): void {
    const active = this.deadlineService.all().filter((d) => !d.completed);
    if (!active.length) {
      this.showDataToast('Nessuna scadenza da esportare');
      return;
    }
    const ics = this.icsService.buildCalendar(active);
    const date = new Date().toISOString().slice(0, 10);
    this.download(`scadenze-${date}.ics`, ics, 'text/calendar');
    this.showDataToast(`✓ ${active.length} scadenze esportate`);
  }

  private download(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private showDataToast(msg: string): void {
    this.dataToast.set(msg);
    setTimeout(() => this.dataToast.set(null), 4000);
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    try {
      await this.authService.signOut();
      this.confirmOpen.set(false);
      await this.router.navigate(['/auth']);
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
