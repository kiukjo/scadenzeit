import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService } from '../../core/services/vehicle.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { ToastService, haptic } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Vehicle } from '../../core/models';

const TILE_COLORS = ['#6C63FF', '#3B82F6', '#2ED573', '#FFA502', '#FF6B81', '#7BED9F'];

@Component({
  selector: 'app-vehicles',
  imports: [IconComponent],
  template: `
    <div class="screen">
      <!-- ── Header ──────────────────────────────────────────────── -->
      <header class="header">
        <div>
          <h1 class="title">I miei veicoli</h1>
          <p class="sub">{{ vehicles().length }} in totale · {{ totalDeadlines() }} scadenze attive</p>
        </div>
        <button class="new-btn" type="button" (click)="openAdd()">
          <app-icon name="plus" [size]="14" color="#fff" [strokeWidth]="2.4" />
          Nuovo
        </button>
      </header>

      <!-- ── Stat tiles ──────────────────────────────────────────── -->
      <div class="stats">
        <div class="stat-tile">
          <div class="stat-value">{{ vehicles().length }}</div>
          <div class="stat-label">Veicoli</div>
        </div>
        <div class="stat-tile">
          <div class="stat-value warn">{{ totalDeadlines() }}</div>
          <div class="stat-label">Scadenze</div>
        </div>
        <div class="stat-tile">
          <div class="stat-value">€ {{ annualTotal() }}</div>
          <div class="stat-label">Annuale</div>
        </div>
      </div>

      <div class="section-label">Tutti i veicoli</div>

      <!-- ── Vehicle list ────────────────────────────────────────── -->
      <div class="list">
        @for (v of vehicleRows(); track v.vehicle.id; let i = $index) {
          <div class="stagger" [style.--i]="i">
            <div class="card"
              [style.box-shadow]="'0 6px 18px ' + v.color + '1A'">

              <!-- Color glow background -->
              <span class="glow"
                [style.background]="'radial-gradient(circle,' + v.color + '30,transparent 70%)'">
              </span>

              <!-- Icon tile -->
              <span class="card-icon"
                [style.background]="'linear-gradient(135deg,' + v.color + '30,' + v.color + '10)'"
                [style.border-color]="v.color + '40'">
                <app-icon name="car" [size]="28" [color]="v.color" />
              </span>

              <!-- Info -->
              <div class="card-info">
                <span class="plate">{{ v.vehicle.targa }}</span>
                <div class="brand">{{ v.brandModel }}</div>
                @if (v.vehicle.kw) {
                  <div class="brand-sub">{{ v.vehicle.kw }} kW</div>
                }
              </div>

              <!-- Right -->
              <div class="card-right">
                <span class="badge" [class.warn]="v.activeDeadlines > 0">
                  <span class="dot"></span>
                  {{ v.activeDeadlines }} attive
                </span>
                <div class="card-actions">
                  <button class="icon-btn danger" type="button"
                    (click)="remove(v.vehicle, $event)">
                    <app-icon name="trash" [size]="16" />
                  </button>
                  <app-icon name="chevronRight" [size]="18" />
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Ghost card to add new vehicle -->
        <div class="stagger" [style.--i]="vehicles().length">
          <button class="ghost-card" type="button" (click)="openAdd()">
            <span class="ghost-plus">
              <app-icon name="plus" [size]="16" [strokeWidth]="2.2" />
            </span>
            Aggiungi veicolo
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .screen {
      padding-bottom: 100px;
      animation: scadit-fadeIn 280ms ease both;
    }

    /* ── Header ── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 20px 18px;
    }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }
    .new-btn {
      border: none; cursor: pointer;
      padding: 8px 14px; border-radius: 12px;
      background: var(--accent-grad); color: white;
      font-size: 12.5px; font-weight: 700;
      box-shadow: 0 6px 16px rgba(108,99,255,0.35);
      display: inline-flex; align-items: center; gap: 6px; font-family: inherit;
    }

    /* ── Stats ── */
    .stats { padding: 0 16px 16px; display: flex; gap: 10px; }
    .stat-tile {
      flex: 1; padding: 12px 14px; border-radius: 14px;
      background: var(--glass); backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
    }
    .stat-value {
      font-size: 19px; font-weight: 800; letter-spacing: -0.5px;
      color: var(--text-primary); font-variant-numeric: tabular-nums;
    }
    .stat-value.warn { color: var(--warning); }
    .stat-label {
      font-size: 10.5px; color: var(--text-secondary);
      font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; margin-top: 2px;
    }

    .section-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--text-tertiary);
      padding: 4px 20px 8px;
    }

    /* ── List ── */
    .list > * { margin: 0 16px 12px; display: block; }
    .stagger {
      opacity: 0;
      animation: scadit-slideUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: calc(var(--i, 0) * 50ms);
    }

    /* ── Card ── */
    .card {
      width: 100%; position: relative; overflow: hidden;
      padding: 14px; border-radius: var(--radius);
      background: var(--glass);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; gap: 14px;
      color: var(--text-primary);
    }
    .glow {
      position: absolute; left: -30px; top: -20px;
      width: 120px; height: 120px; border-radius: 50%;
      filter: blur(24px); opacity: 0.7; pointer-events: none;
    }
    .card-icon {
      width: 64px; height: 64px; border-radius: 18px; border: 1px solid;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative; z-index: 1;
    }
    .card-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
    .plate {
      display: inline-block;
      background: var(--plate-bg); border: 1px solid var(--plate-border);
      border-radius: 6px; padding: 3px 8px;
      font-size: 12px; font-weight: 700; font-family: var(--font-mono);
      letter-spacing: 1px; color: var(--text-primary); white-space: nowrap;
    }
    .brand { font-size: 14.5px; font-weight: 700; margin-top: 7px; letter-spacing: -0.1px; }
    .brand-sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }

    .card-right {
      position: relative; z-index: 1;
      display: flex; flex-direction: column;
      align-items: flex-end; gap: 10px;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(46,213,115,0.12); border: 1px solid rgba(46,213,115,0.40);
      border-radius: 100px; padding: 4px 9px;
      font-size: 11px; font-weight: 700; color: var(--success);
    }
    .badge.warn {
      background: linear-gradient(135deg, rgba(255,165,2,0.20), rgba(255,71,87,0.15));
      border-color: rgba(255,165,2,0.40); color: var(--warning);
    }
    .badge .dot { width: 5px; height: 5px; border-radius: 3px; background: var(--success); }
    .badge.warn .dot { background: var(--warning); }

    .card-actions { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); }
    .icon-btn {
      background: transparent; border: none; cursor: pointer;
      padding: 4px; border-radius: 8px; color: var(--text-tertiary);
      display: flex; align-items: center; justify-content: center;
    }
    .icon-btn.danger:hover { color: var(--danger); }

    /* ── Ghost card ── */
    .ghost-card {
      width: 100%; background: transparent;
      border: 1.5px dashed var(--glass-border); border-radius: var(--radius);
      padding: 20px; color: var(--text-secondary);
      font-size: 13.5px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit;
    }
    .ghost-plus {
      width: 24px; height: 24px; border-radius: 12px; background: var(--glass);
      display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary);
    }
  `],
})
export class VehiclesComponent {
  private readonly vehicleService  = inject(VehicleService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly toast           = inject(ToastService);
  private readonly router          = inject(Router);

  readonly vehicles = this.vehicleService.all;

  readonly vehicleRows = computed(() =>
    this.vehicles().map((v, i) => ({
      vehicle: v,
      color: TILE_COLORS[i % TILE_COLORS.length],
      brandModel: [v.marca, v.modello].filter(Boolean).join(' ') || 'Veicolo',
      activeDeadlines: this.deadlineService.all()
        .filter(d => !d.completed && d.vehicleId === v.uuid).length,
    })),
  );

  readonly totalDeadlines = computed(() =>
    this.deadlineService.all().filter(d => !d.completed && d.vehicleId != null).length,
  );

  readonly annualTotal = computed(() => {
    const cents = this.deadlineService.all()
      .filter(d => d.recurrence === 'yearly' && !d.completed && d.amountCents)
      .reduce((sum, d) => sum + (d.amountCents ?? 0), 0);
    return Math.round(cents / 100).toLocaleString('it-IT');
  });

  openAdd(): void {
    this.router.navigate(['/vehicles/new']);
  }

  async remove(v: Vehicle, e: Event): Promise<void> {
    e.stopPropagation();
    if (v.id == null) return;
    haptic([10, 30, 10]);

    // Cancella a cascata le scadenze collegate al veicolo
    const related = this.deadlineService.all().filter((d) => d.vehicleId === v.uuid);
    for (const d of related) {
      await this.notifScheduler.cancelReminders(d);
      if (d.id != null) await this.deadlineService.remove(d.id);
    }
    await this.vehicleService.remove(v.id);

    // Snapshot per il ripristino (senza id)
    const { id: _vid, ...vSnap } = v;
    const dSnaps = related.map(({ id: _id, ...rest }) => rest);

    this.toast.show(
      related.length > 0
        ? `Veicolo e ${related.length} scadenze eliminati`
        : 'Veicolo eliminato',
      {
        variant: 'danger',
        actionLabel: 'Annulla',
        action: async () => {
          await this.vehicleService.add(vSnap);
          for (const ds of dSnaps) {
            const id = await this.deadlineService.add(ds);
            const saved = await this.deadlineService.getById(id);
            if (saved) await this.notifScheduler.scheduleReminders(saved);
          }
        },
      },
    );
  }
}
