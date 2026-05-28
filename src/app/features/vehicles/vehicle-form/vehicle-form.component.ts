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
    <div class="page">
      <div class="backdrop" (click)="goBack()"></div>
      <div class="sheet">
        <div class="drag-handle"></div>

        <!-- Header -->
        <div class="hdr">
          <button class="back-btn" type="button" (click)="goBack()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 class="hdr-title">Aggiungi veicolo</h2>
          <span style="width:32px"></span>
        </div>

        <!-- Form body -->
        <div class="body">

          <div class="sec-label">Targa *</div>
          <div class="field"><input class="inp mono" type="text" placeholder="es. AB123CD" maxlength="8"
            [value]="targa()" (input)="targa.set($any($event.target).value.toUpperCase())" /></div>

          <div class="row2">
            <div>
              <div class="sec-label">Marca</div>
              <div class="field"><input class="inp" type="text" placeholder="es. Fiat"
                [value]="marca()" (input)="marca.set($any($event.target).value)" /></div>
            </div>
            <div>
              <div class="sec-label">Modello</div>
              <div class="field"><input class="inp" type="text" placeholder="es. Panda"
                [value]="modello()" (input)="modello.set($any($event.target).value)" /></div>
            </div>
          </div>

          <div class="row2">
            <div>
              <div class="sec-label">Potenza (kW)</div>
              <div class="field"><input class="inp" type="number" min="1" placeholder="es. 55"
                [value]="kwStr()" (input)="kwStr.set($any($event.target).value)" /></div>
            </div>
            <div>
              <div class="sec-label">Regione</div>
              <div class="field">
                <select class="inp sel" [value]="regioneCode()" (change)="regioneCode.set($any($event.target).value)">
                  <option value="">Seleziona…</option>
                  @for (r of regioni; track r.code) {
                    <option [value]="r.code">{{ r.name }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          <div class="sec-label">Data immatricolazione</div>
          <div class="field"><input class="inp" type="date"
            [value]="immatDate()" (input)="immatDate.set($any($event.target).value)" /></div>
          <p class="hint">Visibile sul libretto di circolazione</p>

          <div class="sec-label">Ultima revisione</div>
          <div class="field"><input class="inp" type="date"
            [value]="ultimaRevisione()" (input)="ultimaRevisione.set($any($event.target).value)" /></div>
          <p class="hint">Visibile sul tagliando parabrezza</p>

          <div class="sec-label">Scadenza assicurazione RC</div>
          <div class="field"><input class="inp" type="date"
            [value]="assicExpiry()" (input)="assicExpiry.set($any($event.target).value)" /></div>
          <p class="hint">Visibile sulla polizza assicurativa</p>

          @if (deadlinePreview().length > 0) {
            <div class="preview">
              <p class="preview-title">✓ Scadenze create automaticamente</p>
              @for (d of deadlinePreview(); track d.customName) {
                <div class="preview-row">• {{ d.customName }}</div>
              }
            </div>
          }

          <button class="save-btn" type="button" [disabled]="!isValid() || isSaving()" (click)="save()">
            @if (isSaving()) {
              <span class="spin"></span>Salvataggio…
            } @else {
              Salva veicolo
            }
          </button>

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; justify-content: flex-end; }
    .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); }
    .sheet { position: relative; z-index: 1; background: var(--modal-bg); border-radius: 28px 28px 0 0; max-height: 92dvh; display: flex; flex-direction: column; animation: scadit-slideUpModal 380ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .drag-handle { width: 40px; height: 4px; background: var(--glass-border); border-radius: 4px; margin: 12px auto 0; flex-shrink: 0; }
    .hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px 10px; flex-shrink: 0; }
    .back-btn { width: 32px; height: 32px; border-radius: 10px; background: var(--glass); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary); }
    .hdr-title { font-size: 17px; font-weight: 700; }
    .body { overflow-y: auto; padding: 6px 20px 48px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .sec-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-tertiary); margin-top: 10px; }
    .hint { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
    .field { border-radius: 14px; background: var(--glass); border: 1px solid var(--glass-border); overflow: hidden; }
    .field:focus-within { border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 3px rgba(108,99,255,0.12); }
    .inp { width: 100%; min-width: 0; box-sizing: border-box; padding: 13px 14px; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 15px; font-family: inherit; caret-color: var(--accent); }
    .mono { font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .sel { appearance: none; cursor: pointer; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .preview { padding: 14px; background: rgba(46,213,115,0.07); border: 1px solid rgba(46,213,115,0.25); border-radius: 14px; margin-top: 6px; }
    .preview-title { font-size: 12px; font-weight: 700; color: var(--success); margin-bottom: 6px; }
    .preview-row { font-size: 13px; color: var(--text-secondary); padding: 2px 0; }
    .save-btn { margin-top: 16px; border: none; padding: 15px; border-radius: var(--radius); background: var(--accent-grad); color: white; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 24px rgba(108,99,255,0.35); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; width: 100%; transition: opacity 200ms ease; }
    .save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: scadit-spin 700ms linear infinite; display: inline-block; }
  `],
})
export class VehicleFormComponent {
  private readonly vehicleService  = inject(VehicleService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly calculator      = inject(VehicleDeadlineCalculatorService);
  private readonly router          = inject(Router);

  readonly targa           = signal('');
  readonly marca           = signal('');
  readonly modello         = signal('');
  readonly kwStr           = signal('');
  readonly regioneCode     = signal('');
  readonly immatDate       = signal('');
  readonly ultimaRevisione = signal('');
  readonly assicExpiry     = signal('');
  readonly isSaving        = signal(false);

  readonly regioni  = this.calculator.getRegioni();
  readonly isValid  = computed(() => this.targa().trim().length >= 6);

  readonly deadlinePreview = computed(() => {
    if (!this.isValid()) return [];
    return this.calculator.computeAll(this.buildVehicleSnapshot());
  });

  async save(): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const vehicle = VehicleService.build({
        targa:           this.targa().trim(),
        marca:           this.marca().trim() || undefined,
        modello:         this.modello().trim() || undefined,
        kw:              this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
        regioneCode:     this.regioneCode() || undefined,
        immatDate:       this.immatDate() ? new Date(this.immatDate()) : undefined,
        ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
        assicExpiry:     this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
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
      uuid:            'preview',
      targa:           this.targa(),
      kw:              this.kwStr() ? parseInt(this.kwStr(), 10) : undefined,
      regioneCode:     this.regioneCode() || undefined,
      immatDate:       this.immatDate() ? new Date(this.immatDate()) : undefined,
      ultimaRevisione: this.ultimaRevisione() ? new Date(this.ultimaRevisione()) : undefined,
      assicExpiry:     this.assicExpiry() ? new Date(this.assicExpiry()) : undefined,
      updatedAt:       new Date(),
    };
  }
}
