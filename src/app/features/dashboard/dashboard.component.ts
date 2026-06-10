import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline, DeadlineCategory } from '../../core/models';

const CAT_META: Record<string, { label: string; color: string }> = {
  fisco:     { label: 'Fisco & Tasse', color: '#6C63FF' },
  lavoro:    { label: 'Lavoro',        color: '#3B82F6' },
  famiglia:  { label: 'Famiglia',      color: '#A29BFE' },
  casa:      { label: 'Casa',          color: '#2ED573' },
  veicoli:   { label: 'Veicoli',       color: '#FFA502' },
  documenti: { label: 'Documenti',     color: '#7BED9F' },
  sanita:    { label: 'Sanità',        color: '#FF6B81' },
};
const IT_MO_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

@Component({
  selector: 'app-dashboard',
  imports: [IconComponent],
  template: `
<div class="screen">

  <!-- Header -->
  <header class="hdr">
    <button class="back" (click)="router.navigate(['/deadlines'])" aria-label="Indietro">
      <app-icon name="chevronLeft" [size]="18" [strokeWidth]="2.2"/>
    </button>
    <div>
      <h1 class="title">Riepilogo</h1>
      <p class="sub">La tua situazione scadenze</p>
    </div>
  </header>

  <!-- Hero countdown -->
  @if (nextUp(); as n) {
    <div class="hero">
      <div class="hero-lbl">Prossima scadenza</div>
      <div class="hero-days">
        <span class="hd-num">{{ n.days }}</span>
        <span class="hd-unit">{{ n.days === 1 ? 'giorno' : 'giorni' }}</span>
      </div>
      <div class="hero-name">{{ n.name }}</div>
      <div class="hero-date">{{ n.dateLabel }}{{ n.amount ? ' · € ' + n.amount : '' }}</div>
    </div>
  } @else {
    <div class="hero empty-hero">
      <span style="font-size:34px">🎉</span>
      <div class="hero-name" style="margin-top:8px">Nessuna scadenza in arrivo</div>
    </div>
  }

  <!-- Overdue alert -->
  @if (overdueCount() > 0) {
    <div class="alert" (click)="router.navigate(['/deadlines'])">
      <span class="alert-ico">⚠️</span>
      <div class="alert-body">
        <strong>{{ overdueCount() }}</strong>
        {{ overdueCount() === 1 ? 'scadenza scaduta' : 'scadenze scadute' }}
        @if (overdueAmount()) { <span class="alert-amt">· € {{ overdueAmount() }}</span> }
      </div>
      <app-icon name="chevronRight" [size]="15" color="var(--danger)"/>
    </div>
  }

  <!-- Importi da pagare -->
  <div class="section-label">Da pagare</div>
  <div class="tiles">
    <div class="tile">
      <div class="tile-lbl">Prossimi 30 giorni</div>
      <div class="tile-val">€ {{ next30().amount }}</div>
      <div class="tile-sub">{{ next30().count }} {{ next30().count === 1 ? 'scadenza' : 'scadenze' }}</div>
    </div>
    <div class="tile">
      <div class="tile-lbl">Prossimi 90 giorni</div>
      <div class="tile-val">€ {{ next90().amount }}</div>
      <div class="tile-sub">{{ next90().count }} {{ next90().count === 1 ? 'scadenza' : 'scadenze' }}</div>
    </div>
  </div>

  <!-- Spesa per categoria -->
  @if (byCategory().length > 0) {
    <div class="section-label">Spesa stimata per categoria</div>
    <div class="cat-card">
      @for (c of byCategory(); track c.cat) {
        <div class="cat-row">
          <div class="cat-top">
            <span class="cat-dot" [style.background]="c.color"></span>
            <span class="cat-name">{{ c.label }}</span>
            <span class="cat-amt">€ {{ c.amount }}</span>
          </div>
          <div class="cat-bar">
            <span class="cat-fill" [style.width.%]="c.pct" [style.background]="c.color"></span>
          </div>
        </div>
      }
    </div>
  }

  <!-- Spese prossimi 6 mesi -->
  @if (hasMonthlyData()) {
    <div class="section-label">Spese prossimi 6 mesi</div>
    <div class="chart-card">
      <div class="bars">
        @for (m of monthlySpend(); track m.label) {
          <div class="bar-col">
            <div class="bar-amt">{{ m.cents > 0 ? '€' + m.amount : '' }}</div>
            <div class="bar-track"><span class="bar-fill" [style.height.%]="m.pct"></span></div>
            <div class="bar-lbl">{{ m.label }}</div>
          </div>
        }
      </div>
    </div>
  }

  <!-- Pagato quest'anno -->
  <div class="section-label">Storico</div>
  <div class="paid-card">
    <span class="paid-ico"><app-icon name="check" [size]="18" color="#2ED573" [strokeWidth]="2.4"/></span>
    <div class="paid-body">
      <div class="paid-lbl">Pagato nel {{ currentYear }}</div>
      <div class="paid-val">€ {{ paidThisYear().amount }}</div>
    </div>
    <div class="paid-count">{{ paidThisYear().count }} pagamenti</div>
  </div>

  <!-- Pagamenti recenti -->
  @if (recentPaid().length > 0) {
    <div class="hist">
      @for (p of recentPaid(); track p.id) {
        <div class="hist-row">
          <span class="hist-check"><app-icon name="check" [size]="11" color="#2ED573" [strokeWidth]="2.6"/></span>
          <div class="hist-body">
            <div class="hist-name">{{ p.customName }}</div>
            <div class="hist-date">{{ paidDate(p) }}</div>
          </div>
          @if (p.amountCents) {
            <div class="hist-amt">€ {{ (p.amountCents / 100).toFixed(2) }}</div>
          }
        </div>
      }
    </div>
  }

</div>
  `,
  styles: [`
    :host{display:block}
    .screen{padding:8px 16px 110px;animation:scadit-fadeIn 280ms ease both}
    .hdr{display:flex;align-items:center;gap:12px;padding:4px 4px 16px}
    .back{width:38px;height:38px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-primary);flex-shrink:0}
    .title{font-size:22px;font-weight:800;letter-spacing:-.4px;margin:0}
    .sub{font-size:13px;color:var(--text-secondary);margin:2px 0 0}
    .hero{border-radius:var(--radius);padding:22px 20px;text-align:center;background:linear-gradient(135deg,rgba(108,99,255,.20),rgba(59,130,246,.10));border:1px solid rgba(108,99,255,.28);backdrop-filter:blur(20px);margin-bottom:14px;animation:scadit-slideUp 380ms cubic-bezier(.2,.8,.2,1) both}
    .empty-hero{background:var(--glass);border-color:var(--glass-border)}
    .hero-lbl{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary)}
    .hero-days{display:flex;align-items:baseline;justify-content:center;gap:6px;margin:6px 0 2px}
    .hd-num{font-size:48px;font-weight:800;letter-spacing:-1.5px;line-height:1;background:var(--accent-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
    .hd-unit{font-size:15px;font-weight:600;color:var(--text-secondary)}
    .hero-name{font-size:16px;font-weight:700;letter-spacing:-.2px}
    .hero-date{font-size:12.5px;color:var(--text-secondary);margin-top:3px}
    .alert{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:14px;background:rgba(255,71,87,.10);border:1px solid rgba(255,71,87,.28);margin-bottom:16px;cursor:pointer}
    .alert-ico{font-size:18px}
    .alert-body{flex:1;font-size:13.5px;color:var(--text-primary)}
    .alert-amt{color:var(--danger);font-weight:600}
    .section-label{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-tertiary);padding:4px 4px 8px;margin-top:6px}
    .tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .tile{padding:14px 16px;border-radius:16px;background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px)}
    .tile-lbl{font-size:11px;font-weight:600;color:var(--text-tertiary);letter-spacing:.3px}
    .tile-val{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-top:6px;font-variant-numeric:tabular-nums}
    .tile-sub{font-size:11.5px;color:var(--text-secondary);margin-top:2px}
    .cat-card{border-radius:16px;padding:16px;background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px);display:flex;flex-direction:column;gap:14px}
    .cat-top{display:flex;align-items:center;gap:8px;margin-bottom:7px}
    .cat-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}
    .cat-name{flex:1;font-size:13px;font-weight:600}
    .cat-amt{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
    .cat-bar{height:7px;border-radius:4px;background:rgba(127,127,127,.14);overflow:hidden}
    .cat-fill{display:block;height:100%;border-radius:4px;transition:width 600ms cubic-bezier(.2,.8,.2,1)}
    .paid-card{display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(46,213,115,.12),rgba(46,213,115,.04));border:1px solid rgba(46,213,115,.25)}
    .paid-ico{width:40px;height:40px;border-radius:12px;background:rgba(46,213,115,.14);border:1px solid rgba(46,213,115,.30);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .paid-body{flex:1}
    .paid-lbl{font-size:11.5px;color:var(--text-secondary);font-weight:600}
    .paid-val{font-size:20px;font-weight:800;letter-spacing:-.5px;margin-top:2px;font-variant-numeric:tabular-nums}
    .paid-count{font-size:11.5px;color:var(--text-tertiary);text-align:right}
    .chart-card{border-radius:16px;padding:16px 14px 10px;background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px)}
    .bars{display:flex;align-items:flex-end;justify-content:space-between;gap:6px;height:140px}
    .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}
    .bar-amt{font-size:9.5px;font-weight:700;color:var(--text-secondary);height:14px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .bar-track{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center}
    .bar-fill{width:60%;max-width:26px;min-height:3px;border-radius:6px 6px 0 0;background:var(--accent-grad);box-shadow:0 0 10px rgba(108,99,255,.4);transition:height 600ms cubic-bezier(.2,.8,.2,1)}
    .bar-lbl{font-size:10.5px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.4px;margin-top:8px}
    .hist{margin-top:10px;display:flex;flex-direction:column}
    .hist-row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid var(--glass-border)}
    .hist-row:last-child{border-bottom:none}
    .hist-check{width:22px;height:22px;border-radius:11px;background:rgba(46,213,115,.14);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .hist-body{flex:1;min-width:0}
    .hist-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .hist-date{font-size:11px;color:var(--text-tertiary);margin-top:1px}
    .hist-amt{font-size:12.5px;font-weight:700;color:var(--text-secondary);font-variant-numeric:tabular-nums;flex-shrink:0}
  `],
})
export class DashboardComponent {
  readonly router = inject(Router);
  private readonly deadlineService = inject(DeadlineService);
  private readonly today = new Date();
  readonly currentYear = this.today.getFullYear();

  private readonly active = computed(() =>
    this.deadlineService.all()
      .filter(d => !d.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  private daysUntil(d: Deadline): number {
    const now = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return Math.ceil((+new Date(d.dueDate) - +now) / 86400000);
  }

  readonly nextUp = computed(() => {
    const up = this.active().filter(d => this.daysUntil(d) >= 0);
    if (!up.length) return null;
    const d = up[0];
    const dt = new Date(d.dueDate);
    return {
      name: d.customName,
      days: this.daysUntil(d),
      dateLabel: `${dt.getDate()} ${IT_MO_S[dt.getMonth()]} ${dt.getFullYear()}`,
      amount: d.amountCents ? (d.amountCents / 100).toFixed(2) : null,
    };
  });

  readonly overdueCount = computed(() => this.active().filter(d => this.daysUntil(d) < 0).length);

  readonly overdueAmount = computed(() => {
    const cents = this.active()
      .filter(d => this.daysUntil(d) < 0)
      .reduce((s, d) => s + (d.amountCents ?? 0), 0);
    return cents > 0 ? eur(cents) : null;
  });

  readonly next30 = computed(() => this.sumWindow(30));
  readonly next90 = computed(() => this.sumWindow(90));

  private sumWindow(maxDays: number): { amount: string; count: number } {
    const list = this.active().filter(d => {
      const n = this.daysUntil(d);
      return n >= 0 && n <= maxDays;
    });
    const cents = list.reduce((s, d) => s + (d.amountCents ?? 0), 0);
    return { amount: eur(cents), count: list.length };
  }

  readonly byCategory = computed(() => {
    const map = new Map<DeadlineCategory, number>();
    for (const d of this.active()) {
      if (!d.amountCents) continue;
      map.set(d.category, (map.get(d.category) ?? 0) + d.amountCents);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    return entries.map(([cat, cents]) => ({
      cat,
      label: CAT_META[cat]?.label ?? cat,
      color: CAT_META[cat]?.color ?? '#6C63FF',
      amount: eur(cents),
      pct: Math.round((cents / max) * 100),
    }));
  });

  /** Somma importi in scadenza per ciascuno dei prossimi 6 mesi */
  readonly monthlySpend = computed(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { key: d.getFullYear() * 12 + d.getMonth(), label: IT_MO_S[d.getMonth()], cents: 0 };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const d of this.active()) {
      if (!d.amountCents) continue;
      const dt = new Date(d.dueDate);
      const b = byKey.get(dt.getFullYear() * 12 + dt.getMonth());
      if (b) b.cents += d.amountCents;
    }

    const max = Math.max(1, ...buckets.map((b) => b.cents));
    return buckets.map((b) => ({
      label: b.label,
      cents: b.cents,
      amount: eur(b.cents),
      pct: b.cents > 0 ? Math.max(6, Math.round((b.cents / max) * 100)) : 0,
    }));
  });

  readonly hasMonthlyData = computed(() => this.monthlySpend().some((m) => m.cents > 0));

  readonly paidThisYear = computed(() => {
    const completed = this.deadlineService.all().filter(d =>
      d.completed && new Date(d.dueDate).getFullYear() === this.currentYear,
    );
    const cents = completed.reduce((s, d) => s + (d.amountCents ?? 0), 0);
    return { amount: eur(cents), count: completed.length };
  });

  /** Ultimi pagamenti effettuati (ordinati per data di completamento) */
  readonly recentPaid = computed(() =>
    this.deadlineService.all()
      .filter(d => d.completed)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8),
  );

  paidDate(d: Deadline): string {
    const dt = new Date(d.updatedAt);
    return `Pagata il ${dt.getDate()} ${IT_MO_S[dt.getMonth()]} ${dt.getFullYear()}`;
  }
}

function eur(cents: number): string {
  return Math.round(cents / 100).toLocaleString('it-IT');
}
