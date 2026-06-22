import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline } from '../../core/models';

const IT_MO_L = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const IT_MO_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DOW = ['L','M','M','G','V','S','D'];

interface Cell {
  day: number;
  date?: Date;
  muted: boolean;
  isToday: boolean;
  color?: string;   // colore urgenza del più imminente quel giorno
  count: number;
}

@Component({
  selector: 'app-calendar',
  imports: [IconComponent],
  template: `
<div class="screen">

  <header class="hdr">
    <button class="back" (click)="router.navigate(['/deadlines'])" aria-label="Indietro">
      <app-icon name="chevronLeft" [size]="18" [strokeWidth]="2.2"/>
    </button>
    <div>
      <h1 class="title">Calendario</h1>
      <p class="sub">Le tue scadenze nel mese</p>
    </div>
  </header>

  <div class="cal">
    <div class="cal-head">
      <button class="nav" (click)="prevMonth()"><app-icon name="chevronLeft" [size]="16" [strokeWidth]="2"/></button>
      <div class="month">{{ monthLabel() }}</div>
      <button class="nav" (click)="nextMonth()"><app-icon name="chevronRight" [size]="16" [strokeWidth]="2"/></button>
    </div>

    <div class="dows">
      @for (d of dows; track $index) { <span>{{ d }}</span> }
    </div>

    <div class="grid">
      @for (c of cells(); track $index) {
        <button class="cell" type="button"
          [class.muted]="c.muted"
          [class.today]="c.isToday"
          [class.sel]="isSelected(c)"
          [disabled]="c.muted"
          (click)="c.date && selectDay(c.date)">
          <span class="cell-day">{{ c.day }}</span>
          @if (c.count > 0) {
            <span class="cell-dot" [style.background]="c.color"></span>
            @if (c.count > 1) { <span class="cell-n">{{ c.count }}</span> }
          }
        </button>
      }
    </div>
  </div>

  <!-- Scadenze del giorno selezionato -->
  <div class="day-label">{{ selectedLabel() }}</div>

  @if (dayItems().length === 0) {
    <div class="empty">Nessuna scadenza in questo giorno</div>
  } @else {
    <div class="day-list">
      @for (d of dayItems(); track d.id) {
        <button class="row" (click)="openEdit(d)">
          <span class="row-bar" [style.background]="urgencyColor(d)"></span>
          <div class="row-body">
            <div class="row-name">{{ d.customName }}</div>
            <div class="row-meta">{{ fmtDate(d) }}</div>
          </div>
          @if (d.amountCents) { <div class="row-amt">€{{ (d.amountCents/100).toFixed(2) }}</div> }
          <app-icon name="chevronRight" [size]="15" color="var(--text-tertiary)"/>
        </button>
      }
    </div>
  }

</div>
  `,
  styles: [`
    :host{display:block}
    .screen{padding:8px 16px 110px;animation:scadit-fadeIn 280ms ease both}
    .hdr{display:flex;align-items:center;gap:12px;padding:4px 4px 14px}
    .back{width:38px;height:38px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-primary);flex-shrink:0}
    .title{font-size:21px;font-weight:800;letter-spacing:-.4px;margin:0}
    .sub{font-size:12.5px;color:var(--text-secondary);margin:2px 0 0}
    .cal{border-radius:20px;padding:16px;background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px)}
    .cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .nav{width:34px;height:34px;border-radius:11px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-secondary)}
    .month{font-size:15px;font-weight:800;letter-spacing:-.2px}
    .dows{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:6px}
    .dows span{text-align:center;font-size:10.5px;font-weight:700;color:var(--text-tertiary)}
    .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;justify-items:center}
    .cell{position:relative;width:100%;aspect-ratio:1;max-height:46px;border:none;background:transparent;border-radius:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:inherit;color:var(--text-primary)}
    .cell.muted{color:var(--text-tertiary);opacity:.35}
    .cell.today{background:rgba(108,99,255,.12);border:1px solid rgba(108,99,255,.4)}
    .cell.sel{background:var(--accent-grad);color:#fff}
    .cell-day{font-size:13px;font-weight:600;line-height:1}
    .cell-dot{width:6px;height:6px;border-radius:3px}
    .cell.sel .cell-dot{background:#fff !important}
    .cell-n{position:absolute;top:3px;right:5px;font-size:8.5px;font-weight:800;color:var(--text-tertiary)}
    .cell.sel .cell-n{color:#fff}
    .day-label{font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-secondary);padding:18px 4px 10px}
    .empty{text-align:center;color:var(--text-tertiary);font-size:13px;padding:20px}
    .day-list{display:flex;flex-direction:column;gap:8px}
    .row{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--glass-border);cursor:pointer;font-family:inherit;color:var(--text-primary);text-align:left;position:relative;overflow:hidden}
    .row-bar{position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:4px}
    .row-body{flex:1;min-width:0;padding-left:6px}
    .row-name{font-size:14px;font-weight:600}
    .row-meta{font-size:11.5px;color:var(--text-tertiary);margin-top:2px}
    .row-amt{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
  `],
})
export class CalendarComponent {
  readonly router = inject(Router);
  private readonly deadlineService = inject(DeadlineService);

  readonly dows = DOW;
  private readonly today = new Date();
  private readonly monthSig = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  readonly selected = signal<Date>(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()));

  private readonly active = computed(() =>
    this.deadlineService.all().filter((d) => !d.completed),
  );

  /** Mappa 'yyyy-mm-dd' → scadenze di quel giorno */
  private readonly byDay = computed(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of this.active()) {
      const dt = new Date(d.dueDate);
      if (isNaN(dt.getTime())) continue;
      const key = this.key(dt);
      (map.get(key) ?? map.set(key, []).get(key)!).push(d);
    }
    return map;
  });

  readonly cells = computed<Cell[]>(() => {
    const m = this.monthSig();
    const year = m.getFullYear(); const month = m.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const map = this.byDay();
    const out: Cell[] = [];

    for (let i = 0; i < firstDow; i++) {
      out.push({ day: prevDays - firstDow + i + 1, muted: true, isToday: false, count: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const items = map.get(this.key(date)) ?? [];
      out.push({
        day: d, date, muted: false,
        isToday: this.sameDay(date, this.today),
        count: items.length,
        color: items.length ? this.urgencyColor(items[0]) : undefined,
      });
    }
    while (out.length % 7 !== 0) {
      out.push({ day: out.length, muted: true, isToday: false, count: 0 });
    }
    return out;
  });

  readonly dayItems = computed(() => {
    const items = this.byDay().get(this.key(this.selected())) ?? [];
    return [...items].sort((a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0));
  });

  monthLabel(): string {
    const m = this.monthSig();
    return `${IT_MO_L[m.getMonth()]} ${m.getFullYear()}`;
  }

  selectedLabel(): string {
    const d = this.selected();
    return `${d.getDate()} ${IT_MO_L[d.getMonth()]} ${d.getFullYear()}`;
  }

  prevMonth(): void { const m = this.monthSig(); this.monthSig.set(new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  nextMonth(): void { const m = this.monthSig(); this.monthSig.set(new Date(m.getFullYear(), m.getMonth() + 1, 1)); }

  selectDay(d: Date): void { this.selected.set(d); }
  isSelected(c: Cell): boolean { return !!c.date && this.sameDay(c.date, this.selected()); }

  openEdit(d: Deadline): void {
    if (d.id != null) this.router.navigate(['/deadlines/edit', d.id]);
  }

  fmtDate(d: Deadline): string {
    const dt = new Date(d.dueDate);
    return `${String(dt.getDate()).padStart(2,'0')} ${IT_MO_S[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  urgencyColor(d: Deadline): string {
    const now = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    const n = Math.ceil((+new Date(d.dueDate) - +now) / 86400000);
    if (n < 7) return '#FF4757';
    if (n < 30) return '#FFA502';
    return '#2ED573';
  }

  private key(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }
  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}
