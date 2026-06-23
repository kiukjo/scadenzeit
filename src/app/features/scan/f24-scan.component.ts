import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { OcrParserService } from './services/ocr-parser.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { DocumentService } from '../../core/services/document.service';
import { NotificationSchedulerService } from '../../core/services/notification-scheduler.service';
import { ToastService, haptic } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { Deadline, DeadlineCategory } from '../../core/models';

type Phase = 'idle' | 'processing' | 'review' | 'error';
const IT_MO_S = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

@Component({
  selector: 'app-f24-scan',
  imports: [IconComponent],
  template: `
<div class="screen">
  <header class="hdr">
    <button class="back" (click)="router.navigate(['/scan'])" aria-label="Indietro">
      <app-icon name="chevronLeft" [size]="18" [strokeWidth]="2.2"/>
    </button>
    <div>
      <h1 class="title">Acquisisci F24 / bolletta</h1>
      <p class="sub">Scatta una foto: leggiamo importo e scadenza</p>
    </div>
  </header>

  @if (phase() === 'idle') {
    <div class="cards">
      <button class="big-btn accent" (click)="capture(src.Camera)">
        <app-icon name="camera" [size]="22" color="#fff"/> Scatta foto
      </button>
      <button class="big-btn ghost" (click)="capture(src.Photos)">
        <app-icon name="image" [size]="20"/> Dalla galleria
      </button>
      <p class="hint">📄 La foto resta solo sul tuo dispositivo e viene allegata alla scadenza.</p>
    </div>
  }

  @if (phase() === 'processing') {
    <div class="center">
      <span class="spinner"></span>
      <p class="loading">Lettura del documento…</p>
    </div>
  }

  @if (phase() === 'error') {
    <div class="errbox">
      <p>{{ errorMsg() }}</p>
      <button class="big-btn ghost" (click)="phase.set('idle')">Riprova</button>
    </div>
  }

  @if (phase() === 'review') {
    <div class="review">
      @if (!ocrFound()) {
        <div class="warn">Non sono riuscito a leggere tutto in automatico: controlla e completa i dati.</div>
      } @else {
        <div class="ok">✓ Dati letti dal documento — verifica che siano corretti.</div>
      }

      <div class="sec">Importo</div>
      <div class="field amount">
        <span class="cur">€</span>
        <input type="text" inputmode="decimal" placeholder="0,00"
          [value]="amountStr()" (input)="amountStr.set($any($event.target).value)" />
      </div>

      <div class="sec">Scadenza</div>
      <div class="field">
        <input type="date" [value]="dateStr()" (input)="dateStr.set($any($event.target).value)" />
      </div>

      <div class="sec">Cosa vuoi fare</div>
      <div class="modes">
        <button class="mode" [class.on]="mode() === 'new'" (click)="mode.set('new')">Nuova scadenza</button>
        <button class="mode" [class.on]="mode() === 'link'" (click)="mode.set('link')"
          [disabled]="deadlines().length === 0">Collega a esistente</button>
      </div>

      @if (mode() === 'new') {
        <div class="sec">Nome</div>
        <div class="field">
          <input type="text" placeholder="es. F24 — TARI"
            [value]="name()" (input)="name.set($any($event.target).value)" />
        </div>
      } @else {
        <div class="sec">Scadenza a cui collegare</div>
        <div class="field">
          <select [value]="targetId() ?? ''" (change)="targetId.set(+$any($event.target).value || null)">
            <option value="">Seleziona…</option>
            @for (d of deadlines(); track d.id) {
              <option [value]="d.id">{{ d.customName }} · {{ fmtDate(d) }}</option>
            }
          </select>
        </div>
        <p class="hint">Verranno aggiornati importo e data della scadenza scelta, allegando l'F24.</p>
      }

      <button class="save" [disabled]="!canSave() || saving()" (click)="save()">
        @if (saving()) { <span class="spinner sm"></span> Salvataggio… }
        @else { {{ mode() === 'new' ? 'Crea scadenza' : 'Collega F24' }} }
      </button>
    </div>
  }
</div>
  `,
  styles: [`
    :host{display:block}
    .screen{padding:8px 16px 110px;animation:scadit-fadeIn 280ms ease both}
    .hdr{display:flex;align-items:center;gap:12px;padding:4px 4px 18px}
    .back{width:38px;height:38px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-primary);flex-shrink:0}
    .title{font-size:20px;font-weight:800;letter-spacing:-.3px;margin:0}
    .sub{font-size:12.5px;color:var(--text-secondary);margin:2px 0 0}
    .cards{display:flex;flex-direction:column;gap:10px;padding:0 4px}
    .big-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;border-radius:16px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;border:1px solid var(--glass-border)}
    .big-btn.accent{background:var(--accent-grad);color:#fff;border:none;box-shadow:0 10px 24px rgba(108,99,255,.38)}
    .big-btn.ghost{background:var(--glass);color:var(--text-primary)}
    .hint{font-size:12px;color:var(--text-tertiary);line-height:1.5;margin:6px 2px 0}
    .center{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 20px;gap:18px}
    .spinner{width:42px;height:42px;border-radius:50%;border:3px solid var(--glass-border);border-top-color:var(--accent);animation:scadit-spin 700ms linear infinite}
    .spinner.sm{width:16px;height:16px;border-width:2px;border-top-color:#fff}
    .loading{color:var(--text-secondary);font-size:14px}
    .errbox{padding:20px;background:rgba(255,71,87,.08);border:1px solid rgba(255,71,87,.25);border-radius:16px;text-align:center;color:var(--danger);display:flex;flex-direction:column;gap:14px}
    .review{display:flex;flex-direction:column;gap:6px;animation:scadit-slideUp 320ms cubic-bezier(.2,.8,.2,1) both}
    .ok{font-size:12.5px;color:var(--success);font-weight:600;padding:10px 12px;background:rgba(46,213,115,.08);border:1px solid rgba(46,213,115,.25);border-radius:12px}
    .warn{font-size:12.5px;color:var(--warning);font-weight:600;padding:10px 12px;background:rgba(255,165,2,.10);border:1px solid rgba(255,165,2,.30);border-radius:12px}
    .sec{font-size:10.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-top:14px;padding-left:2px}
    .field{border-radius:14px;background:var(--glass);border:1px solid var(--glass-border);overflow:hidden}
    .field:focus-within{border-color:rgba(108,99,255,.6);box-shadow:0 0 0 3px rgba(108,99,255,.12)}
    .field input,.field select{width:100%;box-sizing:border-box;padding:14px;background:transparent;border:none;outline:none;color:var(--text-primary);font-size:15px;font-family:inherit}
    .field select{appearance:none;-webkit-appearance:none;cursor:pointer}
    .field.amount{display:flex;align-items:center;padding-left:14px}
    .field.amount .cur{font-size:20px;font-weight:700;color:var(--text-secondary)}
    .field.amount input{font-size:20px;font-weight:700;font-family:var(--font-mono)}
    .modes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .mode{padding:12px;border-radius:13px;border:1px solid var(--glass-border);background:var(--glass);color:var(--text-primary);font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
    .mode.on{border-color:transparent;background:var(--accent-grad);color:#fff}
    .mode:disabled{opacity:.4;cursor:not-allowed}
    .save{margin-top:20px;padding:16px;border-radius:16px;border:none;background:var(--accent-grad);color:#fff;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 12px 28px rgba(108,99,255,.4);font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px}
    .save:disabled{opacity:.5;cursor:not-allowed}
  `],
})
export class F24ScanComponent {
  readonly router = inject(Router);
  private readonly ocr = inject(OcrParserService);
  private readonly deadlineService = inject(DeadlineService);
  private readonly documentService = inject(DocumentService);
  private readonly notif = inject(NotificationSchedulerService);
  private readonly toast = inject(ToastService);

  readonly src = CameraSource;
  readonly phase = signal<Phase>('idle');
  readonly errorMsg = signal('');
  readonly saving = signal(false);
  readonly ocrFound = signal(false);

  readonly amountStr = signal('');
  readonly dateStr = signal('');
  readonly name = signal('F24');
  readonly mode = signal<'new' | 'link'>('new');
  readonly targetId = signal<number | null>(null);
  private category: DeadlineCategory = 'fisco';
  private docUuid?: string;

  readonly deadlines = computed(() =>
    this.deadlineService.all()
      .filter((d) => !d.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  );

  readonly canSave = computed(() => {
    if (this.mode() === 'new') return !!this.dateStr();
    return this.targetId() != null;
  });

  fmtDate(d: Deadline): string {
    const dt = new Date(d.dueDate);
    return `${String(dt.getDate()).padStart(2,'0')} ${IT_MO_S[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  async capture(source: CameraSource): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source,
        quality: 80,
        correctOrientation: true,
      });
      if (!photo.base64String) { this.fail('Foto non acquisita.'); return; }

      this.phase.set('processing');

      // OCR (best-effort)
      let text = '';
      try {
        const res = await CapacitorPluginMlKitTextRecognition.detectText({ base64Image: photo.base64String });
        text = res?.text ?? '';
      } catch {
        text = '';
      }
      const parsed = this.ocr.parse(text);

      // Salva la foto come documento locale (categoria fisco)
      const destName = `f24_${Date.now()}.jpg`;
      await Filesystem.writeFile({ path: destName, data: photo.base64String, directory: Directory.Data });
      const { uri } = await Filesystem.getUri({ path: destName, directory: Directory.Data });
      const doc = DocumentService.build({
        filename: parsed.entityName ? `F24 — ${parsed.entityName}` : 'F24',
        localPath: uri,
        mimeType: 'image/jpeg',
        category: 'fisco',
      });
      this.docUuid = doc.uuid;
      await this.documentService.add(doc);

      // Pre-compila la revisione
      this.ocrFound.set(!!(parsed.amountCents || parsed.dueDate));
      if (parsed.amountCents) this.amountStr.set((parsed.amountCents / 100).toFixed(2));
      if (parsed.dueDate) this.dateStr.set(toYmd(parsed.dueDate));
      this.name.set(parsed.entityName ? `F24 — ${parsed.entityName}` : 'F24');
      this.category = parsed.category ?? 'fisco';
      this.phase.set('review');
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('cancel')) { this.phase.set('idle'); return; }
      this.fail(`Errore: ${msg}`);
    }
  }

  async save(): Promise<void> {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    haptic();
    try {
      const cents = this.parseAmount();
      const date = this.dateStr() ? new Date(this.dateStr()) : undefined;

      if (this.mode() === 'link') {
        const id = this.targetId()!;
        const changes: Partial<Deadline> = { documentUuid: this.docUuid };
        if (cents) changes.amountCents = cents;
        if (date) changes.dueDate = date;
        await this.deadlineService.update(id, changes);
        const saved = await this.deadlineService.getById(id);
        if (saved) { await this.notif.cancelReminders(saved); await this.notif.scheduleReminders(saved); }
        this.toast.show(`F24 collegato a "${saved?.customName ?? 'scadenza'}"`, { variant: 'success' });
      } else {
        const deadline = DeadlineService.build({
          customName: this.name().trim() || 'F24',
          category: this.category,
          dueDate: date!,
          amountCents: cents,
          recurrence: 'once',
          reminders: [7, 1],
          completed: false,
          documentUuid: this.docUuid,
        });
        const id = await this.deadlineService.add(deadline);
        const saved = await this.deadlineService.getById(id);
        if (saved) await this.notif.scheduleReminders(saved);
        this.toast.show('Scadenza creata dall\'F24', { variant: 'success' });
      }
      await this.router.navigate(['/deadlines']);
    } finally {
      this.saving.set(false);
    }
  }

  private parseAmount(): number | undefined {
    const v = parseFloat(this.amountStr().replace(/\./g, '').replace(',', '.'));
    return isNaN(v) || v <= 0 ? undefined : Math.round(v * 100);
  }

  private fail(msg: string): void {
    this.errorMsg.set(msg);
    this.phase.set('error');
  }
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
