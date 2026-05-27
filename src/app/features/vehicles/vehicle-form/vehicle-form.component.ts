import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService } from '../../../core/services/vehicle.service';
import { DeadlineService } from '../../../core/services/deadline.service';
import { NotificationSchedulerService } from '../../../core/services/notification-scheduler.service';
import { VehicleDeadlineCalculatorService } from '../../../core/services/vehicle-deadline-calculator.service';

@Component({
  selector: 'app-vehicle-form',
  imports: [],
  template: `
    <div class="vehicle-form-page">
      <header class="page-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Indietro
        </button>
        <h1>Aggiungi veicolo</h1>
      </header>

      <form class="form-card" (submit)="$event.preventDefault(); save()">

        <div class="form-group">
          <label>Targa *</label>
          <input
            class="input"
            type="text"
            [value]="targa()"
            (input)="targa.set($any($event.target).value.toUpperCase())"
            placeholder="es. AB123CD"
            maxlength="8"
            required
            style="text-transform:uppercase;letter-spacing:.08em;font-weight:600"
          />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label>Marca</label>
            <input
              class="input"
              type="text"
              [value]="marca()"
              (input)="marca.set($any($event.target).value)"
              placeholder="es. Fiat"
            />
          </div>
          <div class="form-group">
            <label>Modello</label>
            <input
              class="input"
              type="text"
              [value]="modello()"
              (input)="modello.set($any($event.target).value)"
              placeholder="es. Panda"
            />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label>Potenza (kW)</label>
            <input
              class="input"
              type="number"
              min="1"
              [value]="kwStr()"
              (input)="kwStr.set($any($event.target).value)"
              placeholder="es. 55"
            />
          </div>
          <div class="form-group">
            <label>Regione</label>
            <select
              class="select"
              [value]="regioneCode()"
              (change)="regioneCode.set($any($event.target).value)"
            >
              <option value="">Seleziona…</option>
              @for (r of regioni; track r.code) {
                <option [value]="r.code">{{ r.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Data immatricolazione</label>
          <input
            class="input"
            type="date"
            [value]="immatDate()"
            (input)="immatDate.set($any($event.target).value)"
          />
          <span style="font-size:.75rem;color:var(--text-muted);margin-top:2px">Visibile sul libretto di circolazione</span>
        </div>

        <div class="form-group">
          <label>Ultima revisione</label>
          <input
            class="input"
            type="date"
            [value]="ultimaRevisione()"
            (input)="ultimaRevisione.set($any($event.target).value)"
          />
          <span style="font-size:.75rem;color:var(--text-muted);margin-top:2px">Visibile sul tagliando parabrezza</span>
        </div>

        <div class="form-group">
          <label>Scadenza assicurazione RC</label>
          <input
            class="input"
            type="date"
            [value]="assicExpiry()"
            (input)="assicExpiry.set($any($event.target).value)"
          />
          <span style="font-size:.75rem;color:var(--text-muted);margin-top:2px">Visibile sulla polizza assicurativa</span>
        </div>

        @if (deadlinePreview().length > 0) {
          <div style="
            padding: 14px;
            background: rgba(6,214,160,.06);
            border: 1px solid rgba(6,214,160,.20);
            border-radius: var(--radius-md);
          ">
            <p style="font-size:.8rem;font-weight:600;color:var(--color-safe);margin-bottom:8px">
              Scadenze create automaticamente:
            </p>
            @for (d of deadlinePreview(); track d.customName) {
              <div style="font-size:.85rem;color:var(--text-secondary);padding:3px 0">
                • {{ d.customName }}
              </div>
            }
          </div>
        }

        <button type="submit" class="btn-save" [disabled]="!isValid() || isSaving()">
          @if (isSaving()) {
            <span style="display:flex;align-items:center;gap:10px;justify-content:center">
              <span style="width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block"></span>
              Salvataggio…
            </span>
          } @else {
            Salva veicolo
          }
        </button>

      </form>
    </div>
  `,
})
export class VehicleFormComponent {
  private readonly vehicleService  = inject(VehicleService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly calculator      = inject(VehicleDeadlineCalculatorService);
  private readonly router          = inject(Router);

  readonly targa          = signal('');
  readonly marca          = signal('');
  readonly modello        = signal('');
  readonly kwStr          = signal('');
  readonly regioneCode    = signal('');
  readonly immatDate      = signal('');
  readonly ultimaRevisione = signal('');
  readonly assicExpiry    = signal('');
  readonly isSaving       = signal(false);

  readonly regioni = this.calculator.getRegioni();

  readonly isValid = computed(() => this.targa().trim().length >= 6);

  readonly deadlinePreview = computed(() => {
    if (!this.isValid()) return [];
    return this.calculator.computeAll(this.buildVehicleSnapshot());
  });

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const vehicle = VehicleService.build({
        targa:          this.targa().trim(),
        marca:          this.marca().trim() || undefined,
        modello:        this.modello().trim() || undefined,
        kw:             this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
        regioneCode:    this.regioneCode() || undefined,
        immatDate:      this.immatDate() ? new Date(this.immatDate()) : undefined,
        ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
        assicExpiry:    this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
      });

      await this.vehicleService.add(vehicle);

      const drafts = this.calculator.computeAll({ ...vehicle });
      for (const draft of drafts) {
        const deadline = DeadlineService.build(draft);
        const id       = await this.deadlineService.add(deadline);
        const saved    = await this.deadlineService.getById(id);
        if (saved) await this.notifScheduler.scheduleReminders(saved);
      }

      await this.router.navigate(['/vehicles']);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/vehicles']);
  }

  private buildVehicleSnapshot() {
    return {
      uuid:           'preview',
      targa:          this.targa(),
      kw:             this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
      regioneCode:    this.regioneCode() || undefined,
      immatDate:      this.immatDate() ? new Date(this.immatDate()) : undefined,
      ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
      assicExpiry:    this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
      updatedAt:      new Date(),
    };
  }
}
