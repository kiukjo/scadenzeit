import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DeadlineService } from '../../core/services/deadline.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline, DeadlineCategory } from '../../core/models';

type TabKey = 'auto' | 'veicoli' | 'manuali';
type UrgencyColor = '#FF4757' | '#FFA502' | '#2ED573';

const CATEGORY_ORDER: DeadlineCategory[] = ['fisco','lavoro','famiglia','casa','veicoli','documenti','sanita'];
const CAT_META: Record<string, { icon: string; label: string; color: string }> = {
  fisco:     { icon: 'shield',   label: 'Fisco & Tasse',  color: '#6C63FF' },
  lavoro:    { icon: 'book',     label: 'Lavoro',         color: '#3B82F6' },
  famiglia:  { icon: 'heart',    label: 'Famiglia',       color: '#A29BFE' },
  casa:      { icon: 'home',     label: 'Casa',           color: '#2ED573' },
  veicoli:   { icon: 'car',      label: 'Veicoli',        color: '#FFA502' },
  sanita:    { icon: 'calendar', label: 'Sanità',         color: '#FF6B81' },
  documenti: { icon: 'idCard',   label: 'Documenti',      color: '#7BED9F' },
};
const IT_MO_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const IT_MO_L = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const IT_D    = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

@Component({
  selector: 'app-deadlines',
  imports: [IconComponent],
  template: `
<div class="screen">

  <!-- ── Header ── -->
  <header class="hdr">
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
  <div class="stats">
    <div class="stat" [class.danger]="overdueCount() > 0">
      <span class="stat-n">{{ overdueCount() }}</span>
      <span class="stat-l">scadute</span>
    </div>
    <div class="stat-sep"></div>
    <div class="stat" [class.warn]="urgentCount() > 0">
      <span class="stat-n">{{ urgentCount() }}</span>
      <span class="stat-l">urgenti</span>
    </div>
    <div class="stat-sep"></div>
    <div class="stat">
      <span class="stat-n">{{ totalCount() }}</span>
      <span class="stat-l">totali</span>
    </div>
  </div>

  <!-- ── Next-up banner ── -->
  @if (nextUp(); as n) {
    <div class="bwrap">
      <div class="banner">
        <div class="bico"><app-icon name="calendar" [size]="18"/></div>
        <div class="bbody">
          <div class="blbl">Prossima scadenza</div>
          <div class="bname">{{ n.name }}</div>
          <div class="bdays">fra {{ n.days }} {{ n.days === 1 ? 'giorno' : 'giorni' }}</div>
        </div>
        @if (n.amount) { <div class="bamt">€{{ n.amount }}</div> }
      </div>
    </div>
  }

  <!-- ── Tab bar ── -->
  <div class="tabbar">
    @for (t of tabs; track t.key) {
      <button class="tab" [class.active]="activeTab() === t.key" (click)="setTab(t.key)">
        {{ t.label }}
        @if (t.count() > 0) {
          <span class="tbadge" [class.red]="hasOverdueIn(t.key)">{{ t.count() }}</span>
        }
      </button>
    }
    <span class="tab-ink" [style.left.%]="tabInkLeft()"></span>
  </div>

  <!-- ══ TAB: AUTOMATICHE ══ -->
  @if (activeTab() === 'auto') {
    @if (autoGroups().length === 0) {
      <div class="empty">
        <span class="eico">📋</span>
        <div class="etitle">Nessuna scadenza automatica</div>
        <div class="esub">Importate automaticamente in base al profilo selezionato durante l'accesso.</div>
      </div>
    }
    @for (g of autoGroups(); track g.cat; let gi = $index) {
      <div class="section">
        <div class="sec-hdr">
          <span class="sec-ico" [style.background]="g.color+'1A'" [style.borderColor]="g.color+'40'">
            <app-icon [name]="g.icon" [size]="14" [color]="g.color"/>
          </span>
          <span class="sec-title">{{ g.label }}</span>
          <span class="sec-count">{{ g.items.length }}</span>
        </div>
        @for (d of g.items; track d.id; let i = $index) {
          <ng-container *ngTemplateOutlet="cardTpl; context:{$implicit:d,idx:gi*6+i}"></ng-container>
        }
      </div>
    }
  }

  <!-- ══ TAB: VEICOLI ══ -->
  @if (activeTab() === 'veicoli') {
    @if (vehicleGroups().length === 0) {
      <div class="empty">
        <span class="eico">🚗</span>
        <div class="etitle">Nessun veicolo registrato</div>
        <div class="esub">Aggiungi un veicolo per generare automaticamente le scadenze di bollo, revisione e assicurazione.</div>
        <button class="ghost-btn" (click)="router.navigate(['/vehicles/new'])">Aggiungi veicolo →</button>
      </div>
    }
    @for (vg of vehicleGroups(); track vg.vehicleId; let gi = $index) {
      <div class="section">
        <div class="sec-hdr">
          <span class="sec-ico" style="background:rgba(255,165,2,.10);border-color:rgba(255,165,2,.25)">
            <app-icon name="car" [size]="14" color="#FFA502"/>
          </span>
          <span class="sec-title">{{ vg.label }}</span>
          <span class="sec-count">{{ vg.items.length }}</span>
        </div>
        @for (d of vg.items; track d.id; let i = $index) {
          <ng-container *ngTemplateOutlet="cardTpl; context:{$implicit:d,idx:gi*4+i}"></ng-container>
        }
      </div>
    }
  }

  <!-- ══ TAB: MANUALI ══ -->
  @if (activeTab() === 'manuali') {
    @if (manualList().length === 0) {
      <div class="empty">
        <span class="eico">✏️</span>
        <div class="etitle">Nessuna scadenza manuale</div>
        <div class="esub">Aggiungi una scadenza personalizzata: mutuo, rata del mutuo, abbonamento…</div>
        <button class="ghost-btn" (click)="openAdd()">+ Aggiungi scadenza</button>
      </div>
    }
    <div class="section">
      @for (d of manualList(); track d.id; let i = $index) {
        <ng-container *ngTemplateOutlet="cardTpl; context:{$implicit:d,idx:i}"></ng-container>
      }
    </div>
  }

  <!-- FAB solo nel tab Manuali quando ci sono scadenze -->
  @if (activeTab() === 'manuali' && manualList().length > 0) {
    <button class="fab" (click)="openAdd()" aria-label="Aggiungi scadenza">
      <app-icon name="plus" [size]="22" color="#fff" [strokeWidth]="2.5"/>
    </button>
  }

</div>
<!-- ── Card template riusabile ── -->
<ng-template #cardTpl let-d let-idx="idx">
  <div class="swipe-row stagger" [style.--i]="idx" [class.swiped]="swipedId()===d.id">
    <div class="swipe-del" (click)="onDelete(d,$event)"><app-icon name="trash" [size]="20" color="#fff"/></div>
    <div class="card" [class.pulse]="isPulse(d)">
      <span class="ubar" [style.background]="urgencyColor(d)" [style.boxShadow]="'0 0 8px '+urgencyColor(d)+'80'"></span>
      <button class="check-btn" (click)="onComplete(d,$event)" [attr.aria-label]="'Segna come completata'">
        <app-icon name="check" [size]="13" color="#2ED573"/>
      </button>
      <div class="cbody" (click)="openEdit(d)">
        <div class="cname">{{ d.customName }}</div>
        <div class="cdate">{{ fmtDate(d) }}</div>
      </div>
      <div class="cright" (click)="openEdit(d)">
        <div class="cdays" [style.color]="urgencyColor(d)">{{ absDays(d) }}</div>
        <div class="clabel" [style.color]="urgencyColor(d)">{{ daysUntil(d) < 0 ? 'fa' : 'gg' }}</div>
        @if (d.amountCents) { <div class="camt">€{{ (d.amountCents/100).toFixed(2) }}</div> }
      </div>
      <button class="dots-btn" (click)="toggleSwipe(d.id);$event.stopPropagation()" aria-label="Elimina">
        <app-icon name="dots" [size]="16"/>
      </button>
    </div>
  </div>
</ng-template>
  `,
  styles: [`
    :host{display:block}
    .screen{padding-bottom:110px;animation:scadit-fadeIn 280ms ease both}
    .hdr{display:flex;align-items:center;justify-content:space-between;padding:8px 20px 14px}
    .greeting{font-size:22px;font-weight:700;letter-spacing:-.3px;margin:0}
    .sub{font-size:13px;color:var(--text-secondary);margin:2px 0 0;text-transform:capitalize}
    .bell{width:38px;height:38px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;color:var(--text-primary)}
    .bell-dot{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:4px;background:var(--danger);box-shadow:0 0 6px var(--danger);animation:scadit-badgePulse 1.6s ease-in-out infinite}
    .stats{display:flex;align-items:center;padding:0 20px 16px}
    .stat{flex:1;text-align:center}
    .stat-n{display:block;font-size:24px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
    .stat-l{display:block;font-size:10px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-top:2px}
    .stat.danger .stat-n{color:var(--danger)}
    .stat.warn .stat-n{color:var(--warning)}
    .stat-sep{width:1px;height:36px;background:var(--glass-border);flex-shrink:0}
    .bwrap{padding:0 16px 14px}
    .banner{border-radius:var(--radius);padding:14px 16px;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(108,99,255,.16),rgba(59,130,246,.08));border:1px solid rgba(108,99,255,.24);backdrop-filter:blur(20px);animation:scadit-slideUp 400ms cubic-bezier(.2,.8,.2,1) 60ms both}
    .bico{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .bbody{flex:1;min-width:0}
    .blbl{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--text-tertiary)}
    .bname{font-size:14px;font-weight:700;margin-top:2px}
    .bdays{font-size:12px;color:var(--text-secondary);margin-top:1px}
    .bamt{font-size:15px;font-weight:800;color:var(--danger);flex-shrink:0}
    .tabbar{position:relative;display:flex;padding:0 16px;margin-bottom:4px;border-bottom:1px solid var(--glass-border)}
    .tab{flex:1;padding:10px 4px 12px;background:none;border:none;font-size:13px;font-weight:600;color:var(--text-tertiary);cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:color 180ms ease;white-space:nowrap}
    .tab.active{color:var(--accent)}
    .tbadge{font-size:10px;font-weight:800;padding:1px 5px;border-radius:8px;background:var(--glass);border:1px solid var(--glass-border);line-height:1.5}
    .tbadge.red{background:rgba(255,71,87,.15);border-color:rgba(255,71,87,.35);color:var(--danger)}
    .tab-ink{position:absolute;bottom:0;height:2px;width:33.33%;background:var(--accent-grad);border-radius:2px 2px 0 0;transition:left 220ms cubic-bezier(.4,0,.2,1)}
    .section{padding:0 16px 4px}
    .sec-hdr{display:flex;align-items:center;gap:8px;padding:12px 0 8px}
    .sec-ico{width:26px;height:26px;border-radius:8px;border:1px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sec-title{font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-secondary);flex:1}
    .sec-count{font-size:11px;font-weight:700;color:var(--text-tertiary)}
    .swipe-row{position:relative;margin-bottom:8px;opacity:0;animation:scadit-slideUp 420ms cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i,0)*35ms)}
    .swipe-del{position:absolute;right:0;top:0;bottom:0;width:80px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--danger),#B5333E);border-radius:var(--radius);cursor:pointer}
    .swipe-row.swiped .card{transform:translateX(-88px)}
    .card{position:relative;transition:transform 220ms cubic-bezier(.2,.8,.2,1);border-radius:var(--radius);padding:13px 8px 13px 20px;display:flex;align-items:center;gap:8px;background:var(--glass);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid var(--glass-border);overflow:hidden}
    .check-btn{width:32px;height:32px;border-radius:16px;border:1.5px solid var(--glass-border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 160ms ease}
    .check-btn:active{border-color:#2ED573;background:rgba(46,213,115,.12);transform:scale(.9)}
    .dots-btn{width:28px;height:28px;border-radius:8px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-tertiary)}
    .fab{position:fixed;bottom:88px;right:20px;z-index:50;width:52px;height:52px;border-radius:26px;background:var(--accent-grad);border:none;cursor:pointer;box-shadow:0 8px 24px rgba(108,99,255,.45);display:flex;align-items:center;justify-content:center;animation:scadit-slideUp 280ms cubic-bezier(.2,.8,.2,1) both}
    .card.pulse{animation:scadit-urgencyPulse 1.8s ease-in-out infinite}
    .ubar{position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:4px}
    .cbody{flex:1;min-width:0}
    .cname{font-size:14.5px;font-weight:600;color:var(--text-primary);line-height:1.25}
    .cdate{font-size:11.5px;color:var(--text-tertiary);margin-top:4px}
    .cright{display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:48px}
    .cdays{font-size:22px;font-weight:800;line-height:1;letter-spacing:-.5px}
    .clabel{font-size:9.5px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
    .camt{font-size:12px;font-weight:700;color:var(--text-primary);margin-top:4px;font-variant-numeric:tabular-nums}
    .empty{text-align:center;padding:52px 32px;animation:scadit-fadeIn 300ms ease both}
    .eico{font-size:52px;display:block;margin-bottom:14px;animation:scadit-float 3s ease-in-out infinite}
    .etitle{font-size:17px;font-weight:700;margin-bottom:8px}
    .esub{font-size:13px;color:var(--text-secondary);line-height:1.55;max-width:260px;margin:0 auto 18px}
    .ghost-btn{background:none;border:1.5px solid var(--accent);border-radius:12px;padding:10px 20px;color:var(--accent);font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
    .add-row{text-align:center;padding:8px 20px 4px}
    .add-link{background:none;border:none;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;opacity:.85}
  `],
})
export class DeadlinesComponent {
  readonly router = inject(Router);
  private readonly deadlineService = inject(DeadlineService);
  private readonly vehicleService  = inject(VehicleService);
  private readonly settings        = inject(SettingsService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);

  readonly swipedId  = signal<number | null>(null);
  readonly activeTab = signal<TabKey>('auto');
  private readonly today = new Date();

  // ── Tab config ───────────────────────────────────────────────
  readonly tabs = [
    { key: 'auto'    as TabKey, label: 'Automatiche', count: computed(() => this.autoList().length)    },
    { key: 'veicoli' as TabKey, label: 'Veicoli',     count: computed(() => this.vehicleList().length) },
    { key: 'manuali' as TabKey, label: 'Manuali',     count: computed(() => this.manualList().length)  },
  ];

  readonly tabInkLeft = computed(() => {
    const idx = this.tabs.findIndex(t => t.key === this.activeTab());
    return idx * 33.33;
  });

  // ── Data slices ──────────────────────────────────────────────
  private readonly allActive = computed(() =>
    this.deadlineService.all()
      .filter(d => !d.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  /** Importate da catalogo, non legate a veicolo */
  readonly autoList = computed(() =>
    this.allActive().filter(d => d.catalogId != null && d.vehicleId == null),
  );

  /** Legate a un veicolo (bollo, revisione, assicurazione) */
  readonly vehicleList = computed(() =>
    this.allActive().filter(d => d.vehicleId != null),
  );

  /** Create manualmente (nessun catalogId, nessun vehicleId) */
  readonly manualList = computed(() =>
    this.allActive().filter(d => d.catalogId == null && d.vehicleId == null),
  );

  // ── Raggruppamenti ───────────────────────────────────────────
  readonly autoGroups = computed(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of this.autoList()) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return CATEGORY_ORDER
      .filter(c => map.has(c))
      .map(c => ({ cat: c, items: map.get(c)!, ...CAT_META[c] }));
  });

  readonly vehicleGroups = computed(() => {
    const map = new Map<string, { label: string; items: Deadline[] }>();
    const vmap = this.vehicleMap();
    for (const d of this.vehicleList()) {
      if (!d.vehicleId) continue;
      if (!map.has(d.vehicleId))
        map.set(d.vehicleId, { label: vmap.get(d.vehicleId) ?? 'Veicolo', items: [] });
      map.get(d.vehicleId)!.items.push(d);
    }
    return Array.from(map.entries()).map(([vehicleId, v]) => ({ vehicleId, ...v }));
  });

  // ── Stats globali ────────────────────────────────────────────
  readonly totalCount   = computed(() => this.allActive().length);
  readonly overdueCount = computed(() => this.allActive().filter(d => this.daysUntil(d) < 0).length);
  readonly urgentCount  = computed(() => this.allActive().filter(d => { const n = this.daysUntil(d); return n >= 0 && n < 7; }).length);
  readonly hasOverdue   = computed(() => this.overdueCount() > 0);

  readonly nextUp = computed(() => {
    const upcoming = this.allActive().filter(d => this.daysUntil(d) >= 0);
    if (!upcoming.length) return null;
    const d = upcoming[0];
    return { name: d.customName, days: this.daysUntil(d), amount: d.amountCents ? (d.amountCents / 100).toFixed(2) : null };
  });

  hasOverdueIn(tab: TabKey): boolean {
    const list = tab === 'auto' ? this.autoList() : tab === 'veicoli' ? this.vehicleList() : this.manualList();
    return list.some(d => this.daysUntil(d) < 0);
  }

  // ── Helpers ──────────────────────────────────────────────────
  readonly userName = computed(() =>
    (this.settings.profile()?.email ?? '').split('@')[0] || 'Utente',
  );

  readonly todayLabel = computed(() => {
    const d = this.today;
    return `${IT_D[d.getDay()]}, ${d.getDate()} ${IT_MO_L[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly vehicleMap = computed(() => {
    const m = new Map<string, string>();
    for (const v of this.vehicleService.all()) {
      m.set(v.uuid, [v.marca, v.modello].filter(Boolean).join(' ') + (v.targa ? ` · ${v.targa}` : ''));
    }
    return m;
  });

  fmtDate(d: Deadline): string {
    const dt = new Date(d.dueDate);
    return `${String(dt.getDate()).padStart(2,'0')} ${IT_MO_S[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  daysUntil(d: Deadline): number {
    const now = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return Math.ceil((+new Date(d.dueDate) - +now) / 86400000);
  }

  absDays(d: Deadline): number { return Math.abs(this.daysUntil(d)); }

  urgencyColor(d: Deadline): UrgencyColor {
    const n = this.daysUntil(d);
    if (n < 0 || n < 7) return '#FF4757';
    if (n < 30)         return '#FFA502';
    return '#2ED573';
  }

  isPulse(d: Deadline): boolean {
    const n = this.daysUntil(d);
    return n >= 0 && n < 3;
  }

  // ── Interactions ─────────────────────────────────────────────
  setTab(t: TabKey): void {
    this.activeTab.set(t);
    this.swipedId.set(null);
  }

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

  openEdit(d: Deadline): void {
    if (d.id == null) return;
    this.router.navigate(['/deadlines/edit', d.id]);
  }

  async onComplete(d: Deadline, e: Event): Promise<void> {
    e.stopPropagation();
    if (d.id == null) return;
    await this.notifScheduler.cancelReminders(d);
    await this.deadlineService.markCompleted(d.id);
  }
}
