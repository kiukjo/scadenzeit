import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline, DeadlineCategory } from '../../core/models';

type UrgencyKey = 'overdue' | 'critical' | 'warning' | 'safe';
interface Urgency { key: UrgencyKey; color: string; }

const CATEGORY_ORDER: DeadlineCategory[] = ['fisco', 'lavoro', 'casa', 'veicoli', 'sanita', 'documenti'];

const CAT_META: Record<string, { icon: string; label: string; color: string }> = {
  fisco:     { icon: 'shield',   label: 'Fisco & Tasse', color: '#6C63FF' },
  lavoro:    { icon: 'book',     label: 'Lavoro',        color: '#3B82F6' },
  casa:      { icon: 'home',     label: 'Casa',          color: '#2ED573' },
  veicoli:   { icon: 'car',      label: 'Veicoli',       color: '#FFA502' },
  sanita:    { icon: 'calendar', label: 'Sanità',        color: '#FF6B81' },
  documenti: { icon: 'idCard',   label: 'Documenti',     color: '#7BED9F' },
};

const IT_MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const IT_MONTHS_LONG  = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                          'luglio','agosto','settembre','ottobre','novembre','dicembre'];
const IT_DAYS = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

@Component({
  selector: 'app-deadlines',
  imports: [IconComponent],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <header class="header">
        <div>
          <h1 class="greeting">{{ userName() }} <span class="wave">👋</span></h1>
          <p class="sub">{{ todayLabel() }}</p>
        </div>
        <button class="bell" type="button" aria-label="Notifiche">
          <app-icon name="bell" [size]="17" />
          @if (hasOverdue()) { <span class="bell-dot"></span> }
        </button>
      </header>

      <!-- ── Stats strip ── -->
      @if (catalogAll().length > 0) {
        <div class="stats">
          <div class="stat" [class.danger]="overdueCount() > 0">
            <span class="stat-n">{{ overdueCount() }}</span>
            <span class="stat-l">scadute</span>
          </div>
          <div class="stat-sep"></div>
          <div class="stat" [class.warn]="criticalCount() > 0">
            <span class="stat-n">{{ criticalCount() }}</span>
            <span class="stat-l">urgenti</span>
          </div>
          <div class="stat-sep"></div>
          <div class="stat">
            <span class="stat-n">{{ catalogAll().length }}</span>
            <span class="stat-l">totali</span>
          </div>
        </div>
      }

      <!-- ── Next-up banner ── -->
      @if (nextUp(); as next) {
        <div class="banner-wrap">
          <div class="banner">
            <div class="banner-ico"><app-icon name="calendar" [size]="18" /></div>
            <div class="banner-body">
              <div class="banner-lbl">Prossima scadenza</div>
              <div class="banner-name">{{ next.name }}</div>
              <div class="banner-days">fra {{ next.days }} {{ next.days === 1 ? 'giorno' : 'giorni' }}</div>
            </div>
            @if (next.amount) { <div class="banner-amt">€{{ next.amount }}</div> }
          </div>
        </div>
      }

      <!-- ── Empty state ── -->
      @if (catalogAll().length === 0) {
        <div class="empty">
          <span class="empty-emoji">📋</span>
          <div class="empty-title">Nessuna scadenza importata</div>
          <div class="empty-sub">
            Le scadenze vengono importate automaticamente in base al profilo selezionato durante l'accesso.
          </div>
        </div>
      }

      <!-- ── Category sections ── -->
      @for (g of byCategory(); track g.cat; let gi = $index) {
        <div class="section">

          <!-- Section header -->
          <div class="sec-hdr">
            <span class="sec-ico"
              [style.background]="g.color + '1A'"
              [style.borderColor]="g.color + '40'">
              <app-icon [name]="g.icon" [size]="14" [color]="g.color" />
            </span>
            <span class="sec-title">{{ g.label }}</span>
            <span class="sec-count">{{ g.items.length }}</span>
          </div>

          <!-- Deadline cards -->
          @for (d of g.items; track d.id; let i = $index) {
            <div class="swipe-row stagger"
              [style.--i]="gi * 5 + i"
              [class.swiped]="swipedId() === d.id">

              <div class="swipe-del" (click)="onDelete(d, $event)">
                <app-icon name="trash" [size]="20" color="#fff" />
              </div>

              <div class="card"
                [class.pulse]="isUrgentPulse(d)"
                (click)="toggleSwipe(d.id)">
                <span class="u-bar"
                  [style.background]="urgencyOf(d).color"
                  [style.boxShadow]="'0 0 8px ' + urgencyOf(d).color + '80'">
                </span>
                <div class="c-body">
                  <div class="c-name">{{ d.customName }}</div>
                  <div class="c-date">{{ formatDate(d) }}</div>
                  @if (vehicleLabel(d)) {
                    <div class="c-vehicle">{{ vehicleLabel(d) }}</div>
                  }
                </div>
                <div class="c-right">
                  <div class="c-days" [style.color]="urgencyOf(d).color">{{ absDays(d) }}</div>
                  <div class="c-label" [style.color]="urgencyOf(d).color">
                    {{ daysUntil(d) < 0 ? 'fa' : 'gg' }}
                  </div>
                  @if (amountEur(d)) {
                    <div class="c-amt">€{{ amountEur(d) }}</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Footer ── -->
      @if (catalogAll().length > 0) {
        <p class="footer-note">
          Scadenze importate automaticamente dal tuo profilo
        </p>
      }

    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .screen { padding-bottom: 110px; animation: scadit-fadeIn 280ms ease both; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 20px 14px; }
    .greeting { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .wave { font-family: 'Apple Color Emoji','Segoe UI Emoji',sans-serif; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; text-transform: capitalize; }
    .bell { width: 38px; height: 38px; border-radius: 12px; background: var(--glass); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; color: var(--text-primary); }
    .bell-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 4px; background: var(--danger); box-shadow: 0 0 6px var(--danger); animation: scadit-badgePulse 1.6s ease-in-out infinite; }
    .stats { display: flex; align-items: center; padding: 0 20px 16px; gap: 0; }
    .stat { flex: 1; text-align: center; }
    .stat-n { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
    .stat-l { display: block; font-size: 10px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.6px; margin-top: 2px; }
    .stat.danger .stat-n { color: var(--danger); }
    .stat.warn .stat-n { color: var(--warning); }
    .stat-sep { width: 1px; height: 36px; background: var(--glass-border); flex-shrink: 0; }
    .banner-wrap { padding: 0 16px 14px; }
    .banner { border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(108,99,255,0.16), rgba(59,130,246,0.08)); border: 1px solid rgba(108,99,255,0.24); backdrop-filter: blur(20px); animation: scadit-slideUp 400ms cubic-bezier(0.2,0.8,0.2,1) 60ms both; }
    .banner-ico { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.10); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .banner-body { flex: 1; min-width: 0; }
    .banner-lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-tertiary); }
    .banner-name { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .banner-days { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
    .banner-amt { font-size: 15px; font-weight: 800; color: var(--danger); flex-shrink: 0; }
    .empty { text-align: center; padding: 60px 32px; animation: scadit-fadeIn 400ms ease both; }
    .empty-emoji { font-size: 56px; display: block; margin-bottom: 16px; animation: scadit-float 3s ease-in-out infinite; }
    .empty-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .empty-sub { font-size: 13px; color: var(--text-secondary); line-height: 1.55; max-width: 260px; margin: 0 auto; }
    .section { padding: 0 16px 4px; }
    .sec-hdr { display: flex; align-items: center; gap: 8px; padding: 12px 0 8px; }
    .sec-ico { width: 26px; height: 26px; border-radius: 8px; border: 1px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sec-title { font-size: 11.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-secondary); flex: 1; }
    .sec-count { font-size: 11px; font-weight: 700; color: var(--text-tertiary); }
    .swipe-row { position: relative; margin-bottom: 8px; opacity: 0; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) forwards; animation-delay: calc(var(--i,0) * 35ms); }
    .swipe-del { position: absolute; right: 0; top: 0; bottom: 0; width: 80px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--danger), #B5333E); border-radius: var(--radius); cursor: pointer; }
    .swipe-row.swiped .card { transform: translateX(-88px); }
    .card { position: relative; transition: transform 220ms cubic-bezier(0.2,0.8,0.2,1); border-radius: var(--radius); padding: 13px 14px 13px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; background: var(--glass); backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%); border: 1px solid var(--glass-border); overflow: hidden; }
    .card.pulse { animation: scadit-urgencyPulse 1.8s ease-in-out infinite; }
    .u-bar { position: absolute; left: 0; top: 10px; bottom: 10px; width: 4px; border-radius: 4px; }
    .c-body { flex: 1; min-width: 0; }
    .c-name { font-size: 14.5px; font-weight: 600; color: var(--text-primary); line-height: 1.25; }
    .c-date { font-size: 11.5px; color: var(--text-tertiary); margin-top: 4px; letter-spacing: 0.2px; }
    .c-vehicle { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
    .c-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 48px; }
    .c-days { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; }
    .c-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    .c-amt { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 4px; font-variant-numeric: tabular-nums; }
    .footer-note { text-align: center; font-size: 11.5px; color: var(--text-tertiary); padding: 12px 20px 4px; }
  `],
})
export class DeadlinesComponent {
  private readonly deadlineService  = inject(DeadlineService);
  private readonly vehicleService   = inject(VehicleService);
  private readonly settings         = inject(SettingsService);
  private readonly notifScheduler   = inject(NotificationSchedulerService);
  private readonly router           = inject(Router);

  readonly swipedId = signal<number | null>(null);
  private readonly today = new Date();

  // ── Computed signals ─────────────────────────────────────────

  readonly userName = computed(() => {
    const email = this.settings.profile()?.email ?? '';
    return email.split('@')[0] || 'Utente';
  });

  readonly todayLabel = computed(() => {
    const d = this.today;
    return `${IT_DAYS[d.getDay()]}, ${d.getDate()} ${IT_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly vehicleMap = computed(() => {
    const map = new Map<string, string>();
    for (const v of this.vehicleService.all()) {
      const label = [v.marca, v.modello].filter(Boolean).join(' ') + (v.targa ? ` · ${v.targa}` : '');
      map.set(v.uuid, label);
    }
    return map;
  });

  /** Solo scadenze da catalogo (importate automaticamente), non completate, ordinate per data */
  readonly catalogAll = computed(() =>
    this.deadlineService.all()
      .filter(d => !d.completed && d.catalogId != null)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  readonly overdueCount  = computed(() => this.catalogAll().filter(d => this.daysUntil(d) < 0).length);
  readonly criticalCount = computed(() => this.catalogAll().filter(d => { const n = this.daysUntil(d); return n >= 0 && n < 7; }).length);
  readonly hasOverdue    = computed(() => this.overdueCount() > 0);

  readonly nextUp = computed(() => {
    const upcoming = this.catalogAll().filter(d => this.daysUntil(d) >= 0);
    if (!upcoming.length) return null;
    const d = upcoming[0];
    return {
      name:   d.customName,
      days:   this.daysUntil(d),
      amount: d.amountCents ? (d.amountCents / 100).toFixed(2) : null,
    };
  });

  /** Scadenze raggruppate per categoria, nell'ordine definito da CATEGORY_ORDER */
  readonly byCategory = computed(() => {
    const groups = new Map<string, Deadline[]>();
    for (const d of this.catalogAll()) {
      if (!groups.has(d.category)) groups.set(d.category, []);
      groups.get(d.category)!.push(d);
    }
    return CATEGORY_ORDER
      .filter(cat => groups.has(cat))
      .map(cat => ({ cat, items: groups.get(cat)!, ...CAT_META[cat] }));
  });

  // ── Template helpers ─────────────────────────────────────────

  vehicleLabel(d: Deadline): string {
    return d.vehicleId ? (this.vehicleMap().get(d.vehicleId) ?? '') : '';
  }

  formatDate(d: Deadline): string {
    const date = new Date(d.dueDate);
    return `${String(date.getDate()).padStart(2, '0')} ${IT_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  }

  amountEur(d: Deadline): string {
    return d.amountCents ? (d.amountCents / 100).toFixed(2) : '';
  }

  daysUntil(d: Deadline): number {
    const target = new Date(d.dueDate);
    const now    = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return Math.ceil((+target - +now) / 86400000);
  }

  absDays(d: Deadline): number { return Math.abs(this.daysUntil(d)); }

  urgencyOf(d: Deadline): Urgency {
    const days = this.daysUntil(d);
    if (days < 0)  return { key: 'overdue',  color: '#FF4757' };
    if (days < 7)  return { key: 'critical', color: '#FF4757' };
    if (days < 30) return { key: 'warning',  color: '#FFA502' };
    return            { key: 'safe',     color: '#2ED573' };
  }

  isUrgentPulse(d: Deadline): boolean {
    const days = this.daysUntil(d);
    return days >= 0 && days < 3;
  }

  // ── Interactions ─────────────────────────────────────────────

  toggleSwipe(id: number | undefined): void {
    if (id == null) return;
    this.swipedId.set(this.swipedId() === id ? null : id);
  }

  async onDelete(d: Deadline, e: Event): Promise<void> {
    e.stopPropagation();
    this.swipedId.set(null);
    if (d.id == null) return;
    await this.notifScheduler.cancelReminders(d);
    await this.deadlineService.remove(d.id);
  }

  openAdd(): void {
    this.router.navigate(['/deadlines/new']);
  }
}
