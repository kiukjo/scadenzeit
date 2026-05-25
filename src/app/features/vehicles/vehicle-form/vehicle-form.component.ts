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
        <button (click)="goBack()">← Indietro</button>
        <h1>Aggiungi veicolo</h1>
      </header>

      <form (submit)="$event.preventDefault(); save()">

        <label>
          Targa *
          <input
            type="text"
            [value]="targa()"
            (input)="targa.set($any($event.target).value.toUpperCase())"
            placeholder="es. AB123CD"
            maxlength="8"
            required
          />
        </label>

        <label>
          Marca
          <input
            type="text"
            [value]="marca()"
            (input)="marca.set($any($event.target).value)"
            placeholder="es. Fiat, Volkswagen…"
          />
        </label>

        <label>
          Modello
          <input
            type="text"
            [value]="modello()"
            (input)="modello.set($any($event.target).value)"
            placeholder="es. Panda, Golf…"
          />
        </label>

        <label>
          Potenza (kW) — per calcolo bollo
          <input
            type="number"
            min="1"
            [value]="kwStr()"
            (input)="kwStr.set($any($event.target).value)"
            placeholder="es. 55"
          />
        </label>

        <label>
          Regione — per calcolo bollo
          <select
            [value]="regioneCode()"
            (change)="regioneCode.set($any($event.target).value)"
          >
            <option value="">Seleziona regione…</option>
            @for (r of regioni; track r.code) {
              <option [value]="r.code">{{ r.name }}</option>
            }
          </select>
        </label>

        <label>
          Data immatricolazione
          <input
            type="date"
            [value]="immatDate()"
            (input)="immatDate.set($any($event.target).value)"
          />
          <small>Visibile sul libretto di circolazione</small>
        </label>

        <label>
          Data ultima revisione
          <input
            type="date"
            [value]="ultimaRevisione()"
            (input)="ultimaRevisione.set($any($event.target).value)"
          />
          <small>Visibile sul tagliando parabrezza</small>
        </label>

        <label>
          Scadenza assicurazione RC
          <input
            type="date"
            [value]="assicExpiry()"
            (input)="assicExpiry.set($any($event.target).value)"
          />
          <small>Visibile sulla polizza assicurativa</small>
        </label>

        @if (deadlinePreview().length > 0) {
          <div class="deadline-preview">
            <p><strong>Scadenze che verranno create automaticamente:</strong></p>
            @for (d of deadlinePreview(); track d.customName) {
              <div>• {{ d.customName }}</div>
            }
          </div>
        }

        <button type="submit" [disabled]="!isValid() || isSaving()">
          @if (isSaving()) { Salvataggio… } @else { Salva veicolo }
        </button>

      </form>
    </div>
  `,
})
export class VehicleFormComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler = inject(NotificationSchedulerService);
  private readonly calculator = inject(VehicleDeadlineCalculatorService);
  private readonly router = inject(Router);

  // ── Campi form ────────────────────────────────────────────────────────────
  readonly targa = signal('');
  readonly marca = signal('');
  readonly modello = signal('');
  readonly kwStr = signal('');
  readonly regioneCode = signal('');
  readonly immatDate = signal('');
  readonly ultimaRevisione = signal('');
  readonly assicExpiry = signal('');
  readonly isSaving = signal(false);

  readonly regioni = this.calculator.getRegioni();

  // ── Stato derivato ────────────────────────────────────────────────────────
  readonly isValid = computed(() => this.targa().trim().length >= 6);

  /** Anteprima delle scadenze che verranno create — si aggiorna al volo */
  readonly deadlinePreview = computed(() => {
    if (!this.isValid()) return [];
    const vehicle = this.buildVehicleSnapshot();
    return this.calculator.computeAll(vehicle);
  });

  // ── Azioni ────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);

    try {
      const vehicle = VehicleService.build({
        targa: this.targa().trim(),
        marca: this.marca().trim() || undefined,
        modello: this.modello().trim() || undefined,
        kw: this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
        regioneCode: this.regioneCode() || undefined,
        immatDate: this.immatDate() ? new Date(this.immatDate()) : undefined,
        ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
        assicExpiry: this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
      });

      await this.vehicleService.add(vehicle);

      // Crea automaticamente le scadenze calcolate
      const drafts = this.calculator.computeAll({ ...vehicle });
      for (const draft of drafts) {
        const deadline = DeadlineService.build(draft);
        const id = await this.deadlineService.add(deadline);
        const saved = await this.deadlineService.getById(id);
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
      uuid: 'preview',
      targa: this.targa(),
      kw: this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
      regioneCode: this.regioneCode() || undefined,
      immatDate: this.immatDate() ? new Date(this.immatDate()) : undefined,
      ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
      assicExpiry: this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
      updatedAt: new Date(),
    };
  }
}
