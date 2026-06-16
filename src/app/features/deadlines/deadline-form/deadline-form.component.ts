import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DeadlineService } from '../../../core/services/deadline.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { DeadlineFormService } from '../../../core/services/deadline-form.service';
import { DocumentService } from '../../../core/services/document.service';
import { NotificationSchedulerService } from '../../../core/services/notification-scheduler.service';
import { ToastService, haptic } from '../../../core/services/toast.service';
import { DeadlineCategory, DeadlineRecurrence } from '../../../core/models';
import { portaleFor } from '../../../core/constants/portali';
import { IconComponent } from '../../../shared/components/icon.component';

interface CategoryOpt { value: DeadlineCategory; label: string; icon: string; }

const CATEGORIES: CategoryOpt[] = [
  { value: 'fisco',     label: 'Fisco',      icon: 'shield' },
  { value: 'lavoro',    label: 'Lavoro',     icon: 'book'   },
  { value: 'famiglia',  label: 'Famiglia',   icon: 'heart'  },
  { value: 'casa',      label: 'Casa',       icon: 'home'   },
  { value: 'veicoli',   label: 'Veicoli',    icon: 'car'    },
  { value: 'documenti', label: 'Documenti',  icon: 'idCard' },
];

const RECURRENCES: { value: DeadlineRecurrence; label: string }[] = [
  { value: 'once',       label: 'Una tantum' },
  { value: 'monthly',    label: 'Mensile' },
  { value: 'quarterly',  label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly',     label: 'Annuale' },
  { value: 'biennial',   label: 'Biennale' },
];

const REMINDER_OPTIONS = [1, 3, 7, 14, 30, 60, 90, 180];

const IT_MONTHS_LONG  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                          'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const CAL_DOWS = ['L','M','M','G','V','S','D'];

@Component({
  selector: 'app-deadline-form',
  imports: [IconComponent],
  template: `
    <div class="page">
      <!-- Top safe-area tap target -->
      <div class="scrim-top" (click)="goBack()"></div>

      <!-- Sheet -->
      <div class="sheet">
        <div class="grabber"></div>

        <header class="head">
          <button type="button" class="cancel-btn" (click)="goBack()">Annulla</button>
          <div class="title">{{ isEditMode() ? 'Modifica scadenza' : 'Nuova scadenza' }}</div>
          <span style="width:60px"></span>
        </header>

          <div class="body">

            <!-- Segna come pagata (solo in modifica) -->
            @if (isEditMode()) {
              <button type="button" class="mark-paid" (click)="onMarkPaid()">
                <app-icon name="check" [size]="17" color="#fff" [strokeWidth]="2.6" />
                Segna come pagata
              </button>
            }

            <!-- Link al portale ufficiale -->
            @if (portale(); as p) {
              <button type="button" class="portal-link" (click)="openPortale(p.url)">
                <span class="portal-ico"><app-icon name="globe" [size]="16" color="#6C63FF"/></span>
                <span class="portal-txt">
                  <span class="portal-lbl">Portale ufficiale</span>
                  <span class="portal-name">{{ p.label }}</span>
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            }

            <!-- Preset banner -->
            @if (preset()) {
              <div class="preset-banner">
                <app-icon name="sparkle" [size]="14" />
                <span>Suggerito: <strong>{{ preset()!.category }}</strong></span>
                <button type="button" class="preset-apply" (click)="applyPreset()">Applica</button>
              </div>
            }

            <!-- Nome -->
            <section>
              <div class="section-label">Nome scadenza</div>
              <div class="floating-input" [class.filled]="!!name()">
                <label>es. Bolletta Enel, IMU prima rata…</label>
                <input
                  type="text"
                  [value]="name()"
                  (input)="name.set($any($event.target).value)"
                  autocomplete="off"
                />
              </div>
            </section>

            <!-- Categoria -->
            <section>
              <div class="section-label">Tipo</div>
              <div class="chip-grid">
                @for (cat of categories; track cat.value) {
                  <button type="button" class="type-chip"
                    [class.active]="category() === cat.value"
                    (click)="category.set(cat.value)">
                    <app-icon [name]="cat.icon" [size]="22" />
                    <span>{{ cat.label }}</span>
                  </button>
                }
              </div>
            </section>

            <!-- Veicolo (solo se categoria veicoli) -->
            @if (category() === 'veicoli') {
              <section>
                <div class="section-label">Veicolo</div>
                <div class="vsel" [class.open]="vehicleDropOpen()">
                  <button type="button" class="vsel-btn"
                    (click)="vehicleDropOpen.set(!vehicleDropOpen())">
                    <app-icon name="car" [size]="20" />
                    <span class="vsel-label">{{ currentVehicleLabel() }}</span>
                    <app-icon name="chevronDown" [size]="11" [strokeWidth]="2" />
                  </button>
                  @if (vehicleDropOpen()) {
                    <div class="vsel-list">
                      <button type="button" class="vsel-opt"
                        [class.active]="!vehicleId()"
                        (click)="vehicleId.set(null); vehicleDropOpen.set(false)">
                        <app-icon name="pin" [size]="18" />
                        <span style="flex:1">Nessuno / Altro</span>
                        @if (!vehicleId()) {
                          <app-icon name="check" [size]="14" [strokeWidth]="2.4" />
                        }
                      </button>
                      @for (v of vehicleService.all(); track v.uuid) {
                        <button type="button" class="vsel-opt"
                          [class.active]="vehicleId() === v.uuid"
                          (click)="vehicleId.set(v.uuid); vehicleDropOpen.set(false)">
                          <app-icon name="car" [size]="18" />
                          <span style="flex:1">{{ vehicleDisplayName(v) }}</span>
                          @if (vehicleId() === v.uuid) {
                            <app-icon name="check" [size]="14" [strokeWidth]="2.4" />
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              </section>
            }

            <!-- Data (calendario inline) -->
            <section>
              <div class="section-label">Data</div>
              <div class="calendar">
                <!-- Month nav -->
                <div class="cal-head">
                  <button type="button" class="cal-nav" (click)="prevMonth()">
                    <app-icon name="chevronLeft" [size]="14" [strokeWidth]="2" />
                  </button>
                  <div class="cal-month">{{ monthLabel() }}</div>
                  <button type="button" class="cal-nav" (click)="nextMonth()">
                    <app-icon name="chevronRight" [size]="14" [strokeWidth]="2" />
                  </button>
                </div>
                <!-- Day-of-week headers -->
                <div class="cal-dows">
                  @for (d of calDows; track $index) {
                    <span>{{ d }}</span>
                  }
                </div>
                <!-- Day cells -->
                <div class="cal-grid">
                  @for (c of calCells(); track $index) {
                    <button type="button" class="cal-cell"
                      [class.muted]="c.muted"
                      [class.today]="c.isToday && !c.selected"
                      [class.selected]="c.selected"
                      [disabled]="c.muted"
                      (click)="!c.muted && c.date && selectDate(c.date)">
                      {{ c.day }}
                    </button>
                  }
                </div>
              </div>

              <!-- Ricorrenza -->
              <div class="section-label" style="margin-top:16px">Ricorrenza</div>
              <div class="recur-grid">
                @for (r of recurrences; track r.value) {
                  <button type="button" class="recur-chip"
                    [class.active]="recurrence() === r.value"
                    (click)="recurrence.set(r.value)">{{ r.label }}</button>
                }
              </div>
              @if (recurrence() !== 'once') {
                <p class="recur-hint">Quando la segni come pagata, viene creata automaticamente l'occorrenza successiva.</p>
              }
            </section>

            <!-- Importo -->
            <section>
              <div class="section-label">Importo</div>
              <div class="amount-row">
                <span class="cur">€</span>
                <input
                  type="text"
                  inputmode="decimal"
                  placeholder="0,00"
                  [value]="amountStr()"
                  (input)="amountStr.set($any($event.target).value)"
                />
                <span class="cur-tag">EUR</span>
              </div>
            </section>

            <!-- Reminder chips -->
            <section>
              <div class="section-label">Promemoria</div>
              <div class="reminder-grid">
                @for (days of reminderOptions; track days) {
                  <button type="button" class="reminder-chip"
                    [class.active]="hasReminder(days)"
                    (click)="toggleReminder(days)">
                    {{ days === 1 ? '1g' : days + 'g' }}
                  </button>
                }
              </div>
            </section>

            <!-- Documento allegato -->
            @if (documents().length > 0) {
              <section>
                <div class="section-label">Documento allegato</div>
                <div class="doc-pick">
                  <select class="doc-sel" [value]="documentUuid() ?? ''"
                    (change)="documentUuid.set($any($event.target).value || null)">
                    <option value="">Nessuno</option>
                    @for (doc of documents(); track doc.uuid) {
                      <option [value]="doc.uuid">{{ doc.filename }}</option>
                    }
                  </select>
                </div>
                @if (linkedDoc()?.localPath) {
                  <button type="button" class="doc-open" (click)="openDoc(linkedDoc()!.localPath!)">
                    <app-icon name="image" [size]="14" /> Apri documento allegato
                  </button>
                }
              </section>
            }

            <!-- Note -->
            <section>
              <div class="section-label">Note (opzionale)</div>
              <div class="textarea-wrap" [class.filled]="!!notes()">
                <textarea
                  [value]="notes()"
                  (input)="notes.set($any($event.target).value)"
                  rows="3"
                  placeholder="Note aggiuntive…"
                ></textarea>
              </div>
            </section>

          </div><!-- /body -->

          <!-- Sticky footer -->
          <div class="footer">
            <button type="button" class="save shimmer"
              [disabled]="!isValid() || isSaving()"
              (click)="save()">
              @if (isSaving()) {
                <span style="display:flex;align-items:center;gap:10px;justify-content:center">
                  <span class="btn-spinner"></span>
                  Salvataggio…
                </span>
              } @else {
                {{ isEditMode() ? 'Aggiorna scadenza' : 'Salva scadenza' }}
              }
            </button>
          </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page {
      min-height: 100dvh; background: rgba(0,0,0,0.55);
      display: flex; flex-direction: column; justify-content: flex-end; position: relative;
    }
    .scrim-top { flex: 1; min-height: 40px; cursor: pointer; }
    .sheet {
      background: var(--modal-bg); border-top-left-radius: 26px; border-top-right-radius: 26px;
      box-shadow: 0 -20px 60px rgba(0,0,0,0.5);
      animation: scadit-slideUpModal 360ms cubic-bezier(0.2,0.8,0.2,1) both;
      display: flex; flex-direction: column; max-height: 92dvh; overflow: hidden;
    }
    .grabber {
      width: 38px; height: 4px; border-radius: 4px;
      background: rgba(127,127,127,0.30); margin: 10px auto 6px; flex-shrink: 0;
    }
    .head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 18px 16px; flex-shrink: 0;
    }
    .cancel-btn {
      background: transparent; border: none; color: var(--text-secondary);
      font-size: 13px; font-weight: 500; cursor: pointer; padding: 6px; font-family: inherit;
    }
    .title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .body { flex: 1; overflow-y: auto; padding: 4px 18px 130px; scrollbar-width: none; }
    .body::-webkit-scrollbar { display: none; }
    section { margin-bottom: 22px; }
    .section-label {
      font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 10px; padding-left: 2px;
    }
    .mark-paid {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px; border-radius: 14px; margin-bottom: 16px; cursor: pointer;
      border: none; font-family: inherit; font-size: 14.5px; font-weight: 700; color: #fff;
      background: linear-gradient(135deg, #2ED573, #1FA85A);
      box-shadow: 0 8px 20px rgba(46,213,115,0.32);
    }
    .portal-link {
      width: 100%; display: flex; align-items: center; gap: 11px;
      padding: 12px 14px; border-radius: 14px; margin-bottom: 16px; cursor: pointer;
      background: linear-gradient(135deg, rgba(108,99,255,0.12), rgba(59,130,246,0.06));
      border: 1px solid rgba(108,99,255,0.28); color: var(--text-primary);
      font-family: inherit; text-align: left;
    }
    .portal-ico {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      background: rgba(108,99,255,0.14); border: 1px solid rgba(108,99,255,0.30);
      display: flex; align-items: center; justify-content: center;
    }
    .portal-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .portal-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-tertiary); }
    .portal-name { font-size: 13.5px; font-weight: 600; margin-top: 1px; }
    .portal-link > svg { color: var(--accent); flex-shrink: 0; }
    .preset-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 12px; margin-bottom: 16px;
      background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.25);
      color: var(--text-secondary); font-size: 12.5px;
    }
    .preset-apply {
      margin-left: auto; background: var(--accent-grad); border: none;
      color: white; font-size: 11.5px; font-weight: 600;
      padding: 4px 10px; border-radius: 8px; cursor: pointer; font-family: inherit;
    }
    .floating-input {
      position: relative; padding: 18px 16px 14px;
      border-radius: 16px; border: 1px solid var(--glass-border);
      background: var(--glass); backdrop-filter: blur(20px) saturate(140%);
    }
    .floating-input label {
      position: absolute; left: 16px; top: 18px;
      font-size: 13px; color: var(--text-tertiary); pointer-events: none; transition: all 180ms ease;
    }
    .floating-input.filled label, .floating-input:focus-within label {
      top: 8px; font-size: 10.5px; font-weight: 600;
      letter-spacing: 0.8px; text-transform: uppercase; color: var(--accent);
    }
    .floating-input input {
      width: 100%; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 15px; font-family: inherit;
      margin-top: 6px; caret-color: var(--accent);
    }
    .floating-input:focus-within {
      border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 4px rgba(108,99,255,0.15);
    }
    .chip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .type-chip {
      padding: 10px 8px; border-radius: 14px; border: 1px solid var(--glass-border);
      background: var(--glass); color: var(--text-primary); cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; transition: all 180ms ease; font-family: inherit;
    }
    .type-chip.active {
      border-color: rgba(108,99,255,0.55);
      background: linear-gradient(135deg, rgba(108,99,255,0.22), rgba(59,130,246,0.14));
      box-shadow: 0 6px 18px rgba(108,99,255,0.25);
    }
    .vsel { position: relative; }
    .vsel-btn {
      width: 100%; background: var(--glass); border: 1px solid var(--glass-border);
      border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 12px;
      cursor: pointer; color: var(--text-primary); font-size: 14px; font-family: inherit;
    }
    .vsel-label { flex: 1; text-align: left; font-weight: 600; }
    .vsel-list {
      position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 5;
      background: var(--dropdown-bg); border: 1px solid var(--glass-border);
      border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.4); padding: 6px;
    }
    .vsel-opt {
      width: 100%; background: transparent; border: none; cursor: pointer;
      padding: 11px 12px; border-radius: 12px; display: flex; align-items: center; gap: 12px;
      color: var(--text-primary); font-size: 13.5px; font-weight: 600;
      text-align: left; font-family: inherit;
    }
    .vsel-opt.active { background: var(--glass); }
    .calendar {
      border-radius: 16px; padding: 14px; background: var(--glass);
      backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
    }
    .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .cal-nav {
      background: transparent; border: none; cursor: pointer; color: var(--text-secondary);
      padding: 6px; display: inline-flex; align-items: center; justify-content: center;
    }
    .cal-month { font-size: 13.5px; font-weight: 700; text-transform: capitalize; color: var(--text-primary); }
    .cal-dows { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; text-align: center; }
    .cal-dows span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-tertiary); padding: 4px; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; justify-items: center; }
    .cal-cell {
      width: 36px; height: 36px; border-radius: 10px; border: none;
      background: transparent; font-size: 13px; cursor: pointer;
      color: var(--text-primary); font-family: inherit;
    }
    .cal-cell.muted { color: var(--text-tertiary); cursor: default; }
    .cal-cell.today { border: 1px solid rgba(108,99,255,0.5); }
    .cal-cell.selected { background: var(--accent-grad); color: white; font-weight: 600; }
    .toggle-row {
      display: flex; align-items: center; gap: 12px; border-radius: 14px; padding: 12px 14px;
      background: var(--glass); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
    }
    .tg-label { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
    .tg-sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
    .toggle-pill {
      width: 44px; height: 26px; border-radius: 13px; border: none; cursor: pointer; padding: 0;
      background: rgba(127,127,127,0.20); position: relative; transition: background 220ms ease; flex-shrink: 0;
    }
    .toggle-pill.on { background: var(--accent-grad); }
    .knob {
      position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 10px;
      background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      transition: left 200ms cubic-bezier(0.2,0.8,0.2,1);
    }
    .knob.on { left: 21px; }
    .amount-row {
      border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 12px;
      background: var(--glass); backdrop-filter: blur(20px); border: 1px solid var(--glass-border);
    }
    .cur { font-size: 22px; font-weight: 700; color: var(--text-secondary); }
    .amount-row input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 22px; font-weight: 700;
      font-family: var(--font-mono); letter-spacing: -0.5px; caret-color: var(--accent);
    }
    .cur-tag { font-size: 11px; color: var(--text-tertiary); font-weight: 600; letter-spacing: 0.6px; }
    .recur-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .recur-chip {
      padding: 8px 14px; border-radius: 100px;
      border: 1px solid var(--glass-border); background: var(--glass);
      color: var(--text-primary); font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: all 180ms ease; font-family: inherit;
    }
    .recur-chip.active { border-color: transparent; background: var(--accent-grad); color: white; }
    .recur-hint { font-size: 11.5px; color: var(--text-tertiary); margin: 10px 2px 0; line-height: 1.5; }
    .doc-pick { border-radius: 14px; background: var(--glass); border: 1px solid var(--glass-border); overflow: hidden; }
    .doc-sel { width: 100%; appearance: none; -webkit-appearance: none; background: transparent; border: none; outline: none; padding: 14px 16px; color: var(--text-primary); font-size: 14.5px; font-family: inherit; cursor: pointer; }
    .doc-open { margin-top: 10px; display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; border: 1px solid rgba(108,99,255,0.30); background: rgba(108,99,255,0.10); color: var(--accent); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .reminder-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .reminder-chip {
      padding: 7px 13px; border-radius: 100px;
      border: 1px solid var(--glass-border); background: var(--glass);
      color: var(--text-primary); font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 180ms ease; font-family: inherit;
    }
    .reminder-chip.active { border-color: transparent; background: var(--accent-grad); color: white; }
    .textarea-wrap {
      border-radius: 16px; padding: 14px 16px;
      background: var(--glass); border: 1px solid var(--glass-border);
    }
    .textarea-wrap:focus-within { border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 4px rgba(108,99,255,0.15); }
    .textarea-wrap textarea {
      width: 100%; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 14px; font-family: inherit;
      resize: none; caret-color: var(--accent); line-height: 1.5;
    }
    .footer {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 14px 18px calc(env(safe-area-inset-bottom,0px) + 16px);
      background: linear-gradient(180deg, transparent 0%, rgba(11,11,18,0.95) 40%);
    }
    [data-theme="light"] .footer { background: linear-gradient(180deg,transparent 0%,rgba(255,255,255,.95) 40%); }
    .save {
      width: 100%; padding: 15px; border-radius: 16px; border: none; cursor: pointer;
      background: var(--accent-grad); color: white; font-size: 15px; font-weight: 700;
      box-shadow: 0 12px 28px rgba(108,99,255,0.4);
      font-family: inherit; position: relative; overflow: hidden;
    }
    .save:disabled { opacity: 0.55; cursor: not-allowed; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(110deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);
      background-size: 200% 100%; animation: scadit-shimmer 2.8s ease-in-out infinite; pointer-events: none;
    }
    .btn-spinner {
      display: inline-block; width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: scadit-spin 0.8s linear infinite;
    }
  `],
})
export class DeadlineFormComponent {
  private readonly deadlineService = inject(DeadlineService);
  private readonly catalogService  = inject(CatalogService);
  private readonly formService     = inject(DeadlineFormService);
  private readonly notifScheduler  = inject(NotificationSchedulerService);
  private readonly documentService = inject(DocumentService);
  private readonly toast           = inject(ToastService);
  private readonly router          = inject(Router);
  private readonly route           = inject(ActivatedRoute);
  readonly vehicleService          = inject(VehicleService);

  // ── Edit mode ─────────────────────────────────────────────────
  readonly editId     = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editId() !== null);

  /** catalogId corrente: ereditato dal catalogo (create) o dalla scadenza caricata (edit) */
  readonly currentCatalogId = signal<string | undefined>(undefined);

  // ── Form state ────────────────────────────────────────────────
  readonly name         = signal('');
  readonly category     = signal<DeadlineCategory>('fisco');
  readonly vehicleId    = signal<string | null>(null);
  readonly amountStr    = signal('');
  readonly recurrence   = signal<DeadlineRecurrence>('once');
  readonly reminderDays = signal<number[]>([7, 1]);
  readonly notes        = signal('');
  readonly documentUuid = signal<string | null>(null);
  readonly isSaving     = signal(false);

  readonly documents = this.documentService.all;
  readonly linkedDoc = computed(() =>
    this.documents().find((d) => d.uuid === this.documentUuid()) ?? null,
  );

  // ── Calendar state ────────────────────────────────────────────
  private readonly calMonthSig    = signal<Date>(new Date());
  readonly selectedDate           = signal<Date | null>(null);
  readonly vehicleDropOpen        = signal(false);

  readonly calDows = CAL_DOWS;
  readonly categories    = CATEGORIES;
  readonly recurrences   = RECURRENCES;
  readonly reminderOptions = REMINDER_OPTIONS;

  constructor() {
    // ── Edit mode: carica deadline esistente ──
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.editId.set(id);
        void this.loadDeadline(id);
      }
    }

    // ── Create mode: pre-popola da history.state (scan/preset/catalogo) ──
    const state = history.state as {
      draft?: Partial<{
        customName: string;
        dueDate: Date | string;
        amountCents: number;
        category: DeadlineCategory;
        recurrence: DeadlineRecurrence;
        notes: string;
        catalogId: string;
      }>
    };
    const draft = state?.draft;
    if (draft && !idParam) {
      if (draft.customName) this.name.set(draft.customName);
      if (draft.category)   this.category.set(draft.category);
      if (draft.recurrence) this.recurrence.set(draft.recurrence);
      if (draft.notes)      this.notes.set(draft.notes);
      if (draft.catalogId)  this.currentCatalogId.set(draft.catalogId);
      if (draft.dueDate) {
        const d = draft.dueDate instanceof Date ? draft.dueDate : new Date(draft.dueDate);
        if (!isNaN(d.getTime())) {
          this.selectedDate.set(d);
          this.calMonthSig.set(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
      if (draft.amountCents && draft.amountCents > 0) {
        this.amountStr.set((draft.amountCents / 100).toFixed(2));
      }
    }
  }

  private async loadDeadline(id: number): Promise<void> {
    const d = await this.deadlineService.getById(id);
    if (!d) return;
    this.currentCatalogId.set(d.catalogId);
    this.name.set(d.customName);
    this.category.set(d.category);
    this.recurrence.set(d.recurrence);
    this.notes.set(d.notes ?? '');
    this.reminderDays.set(d.reminders?.length ? d.reminders : [7, 1]);
    if (d.amountCents && d.amountCents > 0) this.amountStr.set((d.amountCents / 100).toFixed(2));
    if (d.vehicleId) this.vehicleId.set(d.vehicleId);
    if (d.documentUuid) this.documentUuid.set(d.documentUuid);
    const date = new Date(d.dueDate);
    if (!isNaN(date.getTime())) {
      this.selectedDate.set(date);
      this.calMonthSig.set(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  // ── Derived ───────────────────────────────────────────────────

  readonly preset = computed(() => this.formService.suggestPreset(this.name()));

  /** Portale ufficiale collegato (Agenzia Entrate, INPS, ACI…) */
  readonly portale = computed(() => portaleFor(this.currentCatalogId(), this.category()));

  openPortale(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  openDoc(path: string): void {
    window.open(path, '_blank');
  }

  /** Segna pagata dal dettaglio: completa (+ occorrenza ricorrente) e torna alla lista */
  async onMarkPaid(): Promise<void> {
    const id = this.editId();
    if (id == null || this.isSaving()) return;
    haptic();

    const current = await this.deadlineService.getById(id);
    if (current) await this.notifScheduler.cancelReminders(current);

    const next = await this.deadlineService.complete(id);
    if (next) await this.notifScheduler.scheduleReminders(next);

    this.toast.show(next ? 'Pagata · prossima creata' : 'Segnata come pagata', {
      variant: 'success',
      actionLabel: 'Annulla',
      action: async () => {
        if (next?.id != null) {
          await this.notifScheduler.cancelReminders(next);
          await this.deadlineService.remove(next.id);
        }
        await this.deadlineService.markUncompleted(id);
        const restored = await this.deadlineService.getById(id);
        if (restored) await this.notifScheduler.scheduleReminders(restored);
      },
    });

    await this.router.navigate(['/deadlines']);
  }

  readonly amountCents = computed(() => {
    const val = parseFloat(this.amountStr().replace(',', '.'));
    return isNaN(val) || val <= 0 ? undefined : Math.round(val * 100);
  });

  readonly isValid = computed(
    () => this.name().trim().length > 0 && this.selectedDate() !== null,
  );

  readonly currentVehicleLabel = computed(() => {
    const id = this.vehicleId();
    if (!id) return 'Nessuno / Altro';
    const v = this.vehicleService.all().find(v => v.uuid === id);
    return v ? this.vehicleDisplayName(v) : 'Nessuno / Altro';
  });

  // ── Calendar computed ─────────────────────────────────────────

  readonly calCells = computed(() => {
    const m = this.calMonthSig();
    const sel = this.selectedDate();
    const today = new Date();
    const firstDow = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const prevDays = new Date(m.getFullYear(), m.getMonth(), 0).getDate();

    const out: { day: number; date?: Date; muted: boolean; selected: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) {
      out.push({ day: prevDays - firstDow + i + 1, muted: true, selected: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(m.getFullYear(), m.getMonth(), d);
      out.push({
        day: d, date: dt, muted: false,
        selected: sel ? dt.toDateString() === sel.toDateString() : false,
        isToday: dt.toDateString() === today.toDateString(),
      });
    }
    while (out.length % 7 !== 0) {
      out.push({ day: out.length - daysInMonth, muted: true, selected: false, isToday: false });
    }
    return out;
  });

  monthLabel(): string {
    const m = this.calMonthSig();
    return `${IT_MONTHS_LONG[m.getMonth()]} ${m.getFullYear()}`;
  }

  prevMonth(): void {
    const m = this.calMonthSig();
    this.calMonthSig.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const m = this.calMonthSig();
    this.calMonthSig.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  selectDate(d: Date): void {
    this.selectedDate.set(d);
  }

  // ── Helpers ───────────────────────────────────────────────────

  vehicleDisplayName(v: { marca?: string; modello?: string; targa: string }): string {
    const name = [v.marca, v.modello].filter(Boolean).join(' ');
    return name ? `${name} — ${v.targa}` : v.targa;
  }

  applyPreset(): void {
    const p = this.preset();
    if (!p) return;
    this.category.set(p.category);
    this.reminderDays.set([...p.reminders]);
    if (p.recurrence) this.recurrence.set(p.recurrence);
  }

  hasReminder(days: number): boolean {
    return this.reminderDays().includes(days);
  }

  toggleReminder(days: number): void {
    const current = this.reminderDays();
    this.reminderDays.set(
      current.includes(days)
        ? current.filter(d => d !== days)
        : [...current, days].sort((a, b) => b - a),
    );
  }

  // ── Save ──────────────────────────────────────────────────────

  async save(): Promise<void> {
    const date = this.selectedDate();
    if (!this.isValid() || this.isSaving() || !date) return;
    this.isSaving.set(true);
    try {
      const changes = {
        customName:  this.name().trim(),
        category:    this.category(),
        dueDate:     date,
        amountCents: this.amountCents(),
        recurrence:  this.recurrence(),
        reminders:   this.reminderDays().length > 0 ? this.reminderDays() : [7, 1],
        notes:       this.notes().trim() || undefined,
        vehicleId:   this.vehicleId() ?? undefined,
        documentUuid: this.documentUuid() ?? undefined,
      };

      if (this.isEditMode()) {
        // ── Aggiorna scadenza esistente ──
        await this.deadlineService.update(this.editId()!, changes);
        const saved = await this.deadlineService.getById(this.editId()!);
        if (saved) {
          await this.notifScheduler.cancelReminders(saved);
          await this.notifScheduler.scheduleReminders(saved);
        }
      } else {
        // ── Crea nuova scadenza (eredita catalogId se proviene dal catalogo) ──
        const deadline = DeadlineService.build({
          ...changes,
          completed: false,
          catalogId: this.currentCatalogId(),
        });
        const id    = await this.deadlineService.add(deadline);
        const saved = await this.deadlineService.getById(id);
        if (saved) await this.notifScheduler.scheduleReminders(saved);
      }

      await this.router.navigate(['/deadlines']);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/deadlines']);
  }
}
