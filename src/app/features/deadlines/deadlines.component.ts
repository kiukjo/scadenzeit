import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline } from '../../core/models';

type UrgencyKey = 'overdue' | 'critical' | 'warning' | 'safe';
interface Urgency { key: UrgencyKey; color: string; label: string; }
type FilterKey = 'all' | UrgencyKey;

const CATEGORY_ICON: Record<string, string> = {
  veicoli:   'car',
  fisco:     'shield',
  documenti: 'idCard',
  casa:      'home',
  sanita:    'calendar',
  lavoro:    'book',
};

const CATEGORY_LABEL: Record<string, string> = {
  veicoli:   'Veicoli',
  fisco:     'Fisco',
  documenti: 'Documenti',
  casa:      'Casa',
  sanita:    'Sanità',
  lavoro:    'Lavoro',
};

const IT_MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const IT_MONTHS_LONG  = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                          'luglio','agosto','settembre','ottobre','novembre','dicembre'];
const IT_DAYS         = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

@Component({
  selector: 'app-deadlines',
  imports: [IconComponent],
  template: `
    <div class="screen">
      <!-- ── Header ──────────────────────────────────────────────── -->
      <header class="header">
        <div>
          <h1 class="greeting">Ciao {{ userName() }} <span class="wave">👋</span></h1>
          <p class="sub">{{ todayLabel() }}</p>
        </div>
        <button class="bell" type="button" aria-label="Notifiche">
          <app-icon name="bell" [size]="17" />
          @if (hasOverdue()) {
            <span class="bell-dot"></span>
          }
        </button>
      </header>

      <!-- ── Next-up banner ──────────────────────────────────────── -->
      @if (nextUp(); as next) {
        <div class="banner-wrap">
          <div class="banner">
            <div class="banner-icon">
              <app-icon name="calendar" [size]="20" />
            </div>
            <div class="banner-body">
              <div class="banner-label">Prossima scadenza</div>
              <div class="banner-title">
                {{ next.name }} — fra {{ next.days }} {{ next.days === 1 ? 'giorno' : 'giorni' }}
              </div>
            </div>
            @if (next.amountEur) {
              <div class="banner-amount">€ {{ next.amountEur }}</div>
            }
          </div>
        </div>
      }

      <!-- ── Filter chips ────────────────────────────────────────── -->
      <div class="chips" role="tablist">
        @for (c of chips(); track c.key) {
          <button type="button" role="tab"
            class="chip"
            [class.active]="filter() === c.key"
            (click)="filter.set(c.key)">
            @if (c.dot) {
              <span class="chip-dot" [style.background]="c.dot" [style.box-shadow]="'0 0 6px ' + c.dot"></span>
            }
            {{ c.label }}
            <span class="chip-count">{{ c.count }}</span>
          </button>
        }
      </div>

      <!-- ── Empty state ─────────────────────────────────────────── -->
      @if (filtered().length === 0) {
        <div class="empty">
          <div class="empty-glow">
            <span style="font-size:58px;line-height:1">🎉</span>
          </div>
          <div class="empty-title">
            {{ filter() === 'all' ? 'Tutto in regola!' : 'Nessuna scadenza qui' }}
          </div>
          <div class="empty-sub">
            {{ filter() === 'all'
              ? 'Non hai scadenze in vista. Aggiungine una per non dimenticarla mai più.'
              : 'Prova a cambiare il filtro.' }}
          </div>
          @if (filter() === 'all') {
            <button class="primary-btn shimmer" type="button" (click)="openAdd()">
              Aggiungi scadenza
            </button>
          }
        </div>
      }

      <!-- ── Deadline cards ──────────────────────────────────────── -->
      @if (filtered().length > 0) {
        <div class="list">
          @for (d of filtered(); track d.id; let i = $index) {
            <div class="swipe-row stagger"
              [style.--i]="i"
              [class.swiped]="swipedId() === d.id">

              <!-- Trash action (revealed on swipe) -->
              <div class="swipe-action" (click)="onDelete(d, $event)">
                <app-icon name="trash" [size]="22" color="#fff" />
              </div>

              <!-- Card -->
              <div class="card"
                [class.pulse]="isUrgentPulse(d)"
                [style.box-shadow]="'0 6px 22px ' + urgencyOf(d).color + '1F'"
                (click)="toggleSwipe(d.id)">

                <span class="urgency-bar"
                  [style.background]="'linear-gradient(180deg,' + urgencyOf(d).color + ',' + urgencyOf(d).color + 'AA)'"
                  [style.box-shadow]="'0 0 12px ' + urgencyOf(d).color + '80'">
                </span>

                <div class="card-icon">
                  <app-icon [name]="iconOf(d)" [size]="22" />
                </div>

                <div class="card-body">
                  <div class="card-title">{{ d.customName }}</div>
                  <div class="card-vehicle">{{ vehicleLabel(d) }}</div>
                  <div class="card-date">{{ formatDate(d) }}</div>
                </div>

                <div class="card-right">
                  <div class="days-wrap">
                    <div class="days" [style.color]="urgencyOf(d).color">{{ absDays(d) }}</div>
                    <div class="days-label" [style.color]="urgencyOf(d).color">
                      {{ daysUntil(d) < 0 ? 'gg fa' : 'giorni' }}
                    </div>
                  </div>
                  @if (amountEur(d)) {
                    <div class="amount">€ {{ amountEur(d) }}</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── FAB ─────────────────────────────────────────────────── -->
      <button class="fab" type="button" aria-label="Aggiungi scadenza"
        (click)="openAdd()">
        <app-icon name="plus" [size]="26" color="#fff" [strokeWidth]="2.2" />
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .screen {
      padding-bottom: 100px;
      animation: scadit-fadeIn 280ms ease both;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px 18px;
    }
    .greeting {
      font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0;
    }
    .wave {
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
      line-height: 1;
    }
    .sub {
      font-size: 13px; color: var(--text-secondary);
      margin: 2px 0 0; text-transform: capitalize;
    }
    .bell {
      width: 38px; height: 38px;
      border-radius: 12px;
      background: var(--glass);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      position: relative; cursor: pointer;
      color: var(--text-primary);
    }
    .bell-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px; border-radius: 4px;
      background: var(--danger); box-shadow: 0 0 6px var(--danger);
      animation: scadit-badgePulse 1.6s ease-in-out infinite;
    }

    /* ── Banner ── */
    .banner-wrap { padding: 0 16px 14px; }
    .banner {
      border-radius: var(--radius);
      padding: 14px 16px;
      display: flex; align-items: center; gap: 14px;
      background: linear-gradient(135deg, rgba(108,99,255,0.18), rgba(59,130,246,0.10));
      border: 1px solid rgba(108,99,255,0.25);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      animation: scadit-slideUp 400ms cubic-bezier(0.2,0.8,0.2,1) 60ms both;
    }
    .banner-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(255,255,255,0.10);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .banner-body { flex: 1; min-width: 0; }
    .banner-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.4px; text-transform: uppercase;
      color: var(--text-secondary);
    }
    .banner-title { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .banner-amount {
      font-size: 14px; font-weight: 800;
      color: var(--danger); font-variant-numeric: tabular-nums;
    }

    /* ── Chips ── */
    .chips {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 0 16px 16px; scrollbar-width: none;
    }
    .chips::-webkit-scrollbar { display: none; }
    .chip {
      flex-shrink: 0; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 13px; border-radius: 100px;
      border: 1px solid var(--glass-border);
      background: var(--glass); backdrop-filter: blur(20px);
      color: var(--text-primary); font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: all 180ms ease; font-family: inherit;
    }
    .chip.active { border-color: transparent; background: var(--accent-grad); color: white; }
    .chip-dot { width: 6px; height: 6px; border-radius: 3px; }
    .chip-count {
      font-size: 10.5px; font-weight: 700;
      padding: 1px 6px; border-radius: 8px;
      background: rgba(255,255,255,0.07);
    }
    .chip.active .chip-count { background: rgba(255,255,255,0.22); }

    /* ── Empty state ── */
    .empty {
      text-align: center; padding: 36px 32px;
      animation: scadit-fadeIn 400ms ease both;
    }
    .empty-glow {
      width: 110px; height: 110px; margin: 0 auto 18px; border-radius: 50%;
      background: radial-gradient(circle at 50% 50%, rgba(108,99,255,0.20), transparent 65%);
      display: flex; align-items: center; justify-content: center;
      animation: scadit-float 3s ease-in-out infinite;
    }
    .empty-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .empty-sub {
      font-size: 13px; color: var(--text-secondary);
      line-height: 1.5; max-width: 260px; margin: 0 auto 20px;
    }

    /* ── List + swipe cards ── */
    .list { padding-bottom: 8px; }

    .swipe-row {
      position: relative; margin: 0 16px 12px;
      opacity: 0;
      animation: scadit-slideUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: calc(var(--i, 0) * 50ms);
    }
    .swipe-action {
      position: absolute; right: 0; top: 0; bottom: 0; width: 84px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--danger), #B5333E);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .swipe-row.swiped .card { transform: translateX(-92px); }

    .card {
      position: relative;
      transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
      border-radius: var(--radius);
      padding: 14px 16px 14px 22px;
      display: flex; align-items: stretch; gap: 14px;
      cursor: pointer;
      background: var(--glass);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      border: 1px solid var(--glass-border);
      overflow: hidden;
    }
    .card.pulse { animation: scadit-urgencyPulse 1.8s ease-in-out infinite; }

    .urgency-bar {
      position: absolute; left: 0; top: 10px; bottom: 10px;
      width: 4px; border-radius: 4px;
    }
    .card-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--icon-tile-bg); border: 1px solid var(--icon-tile-border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .card-body { flex: 1; min-width: 0; }
    .card-title {
      font-size: 15px; font-weight: 600;
      color: var(--text-primary); letter-spacing: -0.1px; line-height: 1.2;
    }
    .card-vehicle {
      font-size: 12px; color: var(--text-secondary); margin-top: 3px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .card-date {
      font-size: 11px; color: var(--text-tertiary); margin-top: 6px; letter-spacing: 0.3px;
    }
    .card-right {
      display: flex; flex-direction: column;
      align-items: flex-end; justify-content: space-between; min-width: 64px;
    }
    .days-wrap { text-align: right; }
    .days { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; }
    .days-label {
      font-size: 9.5px; font-weight: 600;
      letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px;
    }
    .amount {
      font-size: 13px; font-weight: 700;
      color: var(--text-primary); font-variant-numeric: tabular-nums;
    }

    /* ── FAB ── */
    .fab {
      position: fixed;
      right: 18px; bottom: 82px;
      width: 58px; height: 58px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.18);
      background: var(--accent-grad); color: white;
      cursor: pointer; z-index: 20;
      display: flex; align-items: center; justify-content: center;
      box-shadow:
        0 12px 28px rgba(108,99,255,0.45),
        0 4px 12px rgba(59,130,246,0.30),
        inset 0 1px 0 rgba(255,255,255,0.25);
      animation: scadit-slideUp 500ms cubic-bezier(0.2,0.8,0.2,1) 200ms both;
    }
    .fab:active { transform: scale(0.93); }

    /* ── Primary button ── */
    .primary-btn {
      border: none; cursor: pointer;
      padding: 12px 22px; border-radius: 14px;
      background: var(--accent-grad); color: white;
      font-size: 14px; font-weight: 600; font-family: inherit;
      box-shadow: 0 8px 20px rgba(108,99,255,0.35);
      position: relative; overflow: hidden;
    }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: scadit-shimmer 2.8s ease-in-out infinite;
      pointer-events: none;
    }
  `],
})
export class DeadlinesComponent {
  private readonly deadlineService  = inject(DeadlineService);
  private readonly vehicleService   = inject(VehicleService);
  private readonly settings         = inject(SettingsService);
  private readonly notifScheduler   = inject(NotificationSchedulerService);
  private readonly router           = inject(Router);

  readonly filter    = signal<FilterKey>('all');
  readonly swipedId  = signal<number | null>(null);
  private readonly today = new Date();

  // ── Derived signals ──────────────────────────────────────────

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
      const label = [v.marca, v.modello].filter(Boolean).join(' ') + (v.targa ? ` — ${v.targa}` : '');
      map.set(v.uuid, label);
    }
    return map;
  });

  // Only active (non-completed) deadlines sorted by date
  readonly upcoming = computed(() =>
    this.deadlineService.all()
      .filter(d => !d.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  readonly filtered = computed((): Deadline[] => {
    const f = this.filter();
    const items = this.upcoming();
    if (f === 'all') return items;
    return items.filter(d => this.urgencyOf(d).key === f);
  });

  readonly chips = computed(() => {
    const all = this.upcoming();
    const count = (k: UrgencyKey) => all.filter(d => this.urgencyOf(d).key === k).length;
    return [
      { key: 'all'      as FilterKey, label: 'Tutte',      count: all.length,        dot: null },
      { key: 'critical' as FilterKey, label: 'Urgenti',    count: count('critical'), dot: '#FF4757' },
      { key: 'warning'  as FilterKey, label: 'In arrivo',  count: count('warning'),  dot: '#FFA502' },
      { key: 'safe'     as FilterKey, label: 'Tranquille', count: count('safe'),     dot: '#2ED573' },
    ];
  });

  readonly nextUp = computed(() => {
    const upcoming = this.upcoming().filter(d => this.daysUntil(d) >= 0);
    if (!upcoming.length) return null;
    const d = upcoming[0];
    return {
      name:      d.customName,
      days:      this.daysUntil(d),
      amountEur: d.amountCents ? (d.amountCents / 100).toFixed(2) : null,
    };
  });

  readonly hasOverdue = computed(() =>
    this.upcoming().some(d => this.daysUntil(d) < 0),
  );

  // ── Template helpers ─────────────────────────────────────────

  iconOf(d: Deadline): string {
    return CATEGORY_ICON[d.category] ?? 'calendar';
  }

  vehicleLabel(d: Deadline): string {
    if (d.vehicleId) return this.vehicleMap().get(d.vehicleId) ?? CATEGORY_LABEL[d.category] ?? d.category;
    return CATEGORY_LABEL[d.category] ?? d.category;
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
    const now = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return Math.ceil((+target - +now) / 86400000);
  }

  absDays(d: Deadline): number { return Math.abs(this.daysUntil(d)); }

  urgencyOf(d: Deadline): Urgency {
    const days = this.daysUntil(d);
    if (days < 0)  return { key: 'overdue',  color: '#FF4757', label: 'SCADUTA' };
    if (days < 7)  return { key: 'critical', color: '#FF4757', label: 'URGENTE' };
    if (days < 30) return { key: 'warning',  color: '#FFA502', label: 'IN ARRIVO' };
    return            { key: 'safe',     color: '#2ED573', label: 'TRANQUILLA' };
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
