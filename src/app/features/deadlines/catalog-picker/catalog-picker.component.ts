import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';
import { DeadlineService } from '../../../core/services/deadline.service';
import { SettingsService } from '../../../core/services/settings.service';
import { NotificationSchedulerService } from '../../../core/services/notification-scheduler.service';
import { ToastService, haptic } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon.component';
import { CatalogDeadline, DeadlineCategory, UserProfileType } from '../../../core/models';

const ALL_TYPES: UserProfileType[] = ['dipendente', 'autonomo', 'proprietario_casa', 'genitore'];
const CATEGORY_ORDER: DeadlineCategory[] = ['fisco', 'lavoro', 'famiglia', 'casa', 'documenti', 'veicoli', 'sanita'];
const CAT_META: Record<string, { icon: string; label: string; color: string }> = {
  fisco:     { icon: 'shield',   label: 'Fisco & Tasse', color: '#6C63FF' },
  lavoro:    { icon: 'book',     label: 'Lavoro',        color: '#3B82F6' },
  famiglia:  { icon: 'heart',    label: 'Famiglia',      color: '#A29BFE' },
  casa:      { icon: 'home',     label: 'Casa',          color: '#2ED573' },
  documenti: { icon: 'idCard',   label: 'Documenti',     color: '#7BED9F' },
  veicoli:   { icon: 'car',      label: 'Veicoli',       color: '#FFA502' },
  sanita:    { icon: 'calendar', label: 'Sanità',        color: '#FF6B81' },
};

@Component({
  selector: 'app-catalog-picker',
  imports: [IconComponent],
  template: `
<div class="screen">

  <!-- Header -->
  <header class="hdr">
    <button class="back" (click)="router.navigate(['/deadlines'])" aria-label="Indietro">
      <app-icon name="chevronLeft" [size]="18" [strokeWidth]="2.2"/>
    </button>
    <div>
      <h1 class="title">Aggiungi dal catalogo</h1>
      <p class="sub">Scegli le scadenze standard che ti servono</p>
    </div>
  </header>

  <!-- Search -->
  <div class="search">
    <app-icon name="search" [size]="17" color="var(--text-tertiary)" />
    <input type="text" placeholder="Cerca scadenza…" inputmode="search"
      [value]="query()" (input)="query.set($any($event.target).value)" />
    @if (query()) {
      <button class="clear" (click)="query.set('')" aria-label="Pulisci">
        <app-icon name="close" [size]="14" [strokeWidth]="2.2"/>
      </button>
    }
  </div>

  @if (groups().length === 0) {
    <div class="empty">
      <span class="eico">🔍</span>
      <div class="etitle">Nessun risultato</div>
    </div>
  }

  @for (g of groups(); track g.cat) {
    <div class="section">
      <div class="sec-hdr">
        <span class="sec-ico" [style.background]="g.color+'1A'" [style.borderColor]="g.color+'40'">
          <app-icon [name]="g.icon" [size]="14" [color]="g.color"/>
        </span>
        <span class="sec-title">{{ g.label }}</span>
      </div>

      @for (e of g.items; track e.id) {
        <div class="row" [class.added]="isAdded(e.id)">
          <div class="row-body">
            <div class="row-name">{{ e.name }}</div>
            @if (e.notes) { <div class="row-note">{{ e.notes }}</div> }
            <div class="row-meta">{{ recurrenceLabel(e) }}</div>
          </div>
          @if (isAdded(e.id)) {
            <span class="added-tag"><app-icon name="check" [size]="13" color="#2ED573" [strokeWidth]="2.6"/> Aggiunta</span>
          } @else {
            <button class="add-btn" (click)="add(e)" [attr.aria-label]="'Aggiungi ' + e.name">
              <app-icon name="plus" [size]="18" color="#fff" [strokeWidth]="2.6"/>
            </button>
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
    .hdr{display:flex;align-items:center;gap:12px;padding:4px 4px 14px}
    .back{width:38px;height:38px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-primary);flex-shrink:0}
    .title{font-size:21px;font-weight:800;letter-spacing:-.4px;margin:0}
    .sub{font-size:12.5px;color:var(--text-secondary);margin:2px 0 0}
    .search{display:flex;align-items:center;gap:8px;padding:0 14px;height:44px;border-radius:14px;background:var(--glass);border:1px solid var(--glass-border);margin-bottom:14px}
    .search input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:var(--text-primary);font-size:14.5px;font-family:inherit;caret-color:var(--accent)}
    .search .clear{width:24px;height:24px;border-radius:12px;border:none;background:var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-secondary);flex-shrink:0}
    .section{margin-bottom:6px}
    .sec-hdr{display:flex;align-items:center;gap:8px;padding:10px 0 8px}
    .sec-ico{width:26px;height:26px;border-radius:8px;border:1px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sec-title{font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-secondary)}
    .row{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px);margin-bottom:8px;transition:opacity 200ms ease}
    .row.added{opacity:.6}
    .row-body{flex:1;min-width:0}
    .row-name{font-size:14px;font-weight:600;line-height:1.25}
    .row-note{font-size:11.5px;color:var(--text-tertiary);margin-top:3px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .row-meta{font-size:10.5px;color:var(--text-secondary);margin-top:4px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}
    .add-btn{width:34px;height:34px;border-radius:11px;background:var(--accent-grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(108,99,255,.35)}
    .added-tag{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--success);flex-shrink:0}
    .empty{text-align:center;padding:50px 20px}
    .eico{font-size:42px;display:block;margin-bottom:10px}
    .etitle{font-size:15px;font-weight:600;color:var(--text-secondary)}
  `],
})
export class CatalogPickerComponent {
  readonly router = inject(Router);
  private readonly catalog         = inject(CatalogService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly settings        = inject(SettingsService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly toast           = inject(ToastService);

  readonly query = signal('');

  /** catalogId già presenti tra le scadenze attive */
  private readonly addedIds = computed(() => {
    const set = new Set<string>();
    for (const d of this.deadlineService.all()) {
      if (!d.completed && d.catalogId) set.add(d.catalogId);
    }
    return set;
  });

  private readonly profileTypes = computed(() => {
    const types = this.settings.profile()?.profileTypes;
    return types?.length ? types : ALL_TYPES;
  });

  readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const entries = this.catalog.getByProfile(this.profileTypes())
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q));

    const map = new Map<DeadlineCategory, CatalogDeadline[]>();
    for (const e of entries) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category)!.push(e);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ cat: c, items: map.get(c)!, ...CAT_META[c] }));
  });

  isAdded(id: string): boolean {
    return this.addedIds().has(id);
  }

  recurrenceLabel(e: CatalogDeadline): string {
    if (e.recurrence === 'variable') return 'Data da impostare';
    const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    if (e.recurrence === 'monthly') return `Ogni mese · giorno ${e.day}`;
    if (e.month && e.day) return `Ogni anno · ${e.day} ${months[e.month - 1]}`;
    return 'Annuale';
  }

  private isFixed(e: CatalogDeadline): boolean {
    if (e.recurrence === 'variable' || e.day == null) return false;
    if (e.recurrence === 'monthly') return true;
    return e.month != null;
  }

  async add(e: CatalogDeadline): Promise<void> {
    haptic();

    // Ri-aggiunta esplicita → annulla l'eventuale rimozione "per sempre"
    await this.settings.restoreCatalogId(e.id);

    // Voci a data variabile → apri il form pre-compilato per scegliere la data
    if (!this.isFixed(e)) {
      this.router.navigate(['/deadlines/new'], {
        state: {
          draft: {
            customName: e.name,
            category: e.category,
            recurrence: e.recurrence,
            notes: e.notes,
            catalogId: e.id,
          },
        },
      });
      return;
    }

    const draft = this.catalog.toDraft(e);
    const deadline = DeadlineService.build(draft);
    const id = await this.deadlineService.add(deadline);
    const saved = await this.deadlineService.getById(id);
    if (saved) await this.notifScheduler.scheduleReminders(saved);

    this.toast.show(`"${e.name}" aggiunta`, { variant: 'success' });
  }
}
