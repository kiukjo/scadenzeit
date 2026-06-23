import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CbillParserService } from './services/cbill-parser.service';
import { OcrParserService } from './services/ocr-parser.service';

type ScanState = 'idle' | 'requesting-permission' | 'scanning' | 'processing' | 'error';

@Component({
  selector: 'app-scan',
  imports: [],
  template: `
    <div class="screen">
      <header class="header">
        <h1 class="title">Scansiona</h1>
        <p class="sub">Acquisisci automaticamente importo e data dalle bollette.</p>
      </header>

      @if (state() === 'idle') {
        <div class="cards">

          <div class="stagger" [style.--i]="0">
            <button class="card" (click)="startQrScan()">
              <span class="card-ico" style="background:rgba(108,99,255,0.12);border-color:rgba(108,99,255,0.25)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              <div class="card-info">
                <span class="card-name">Scansiona QR / CBill</span>
                <span class="card-desc">Bollette e avvisi di pagamento con QR code</span>
              </div>
              <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="stagger" [style.--i]="1">
            <button class="card" (click)="goToF24()">
              <span class="card-ico" style="background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.25)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <div class="card-info">
                <span class="card-name">Acquisisci F24 / bolletta</span>
                <span class="card-desc">Foto → legge importo e data → crea o collega la scadenza</span>
              </div>
              <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="stagger" [style.--i]="2">
            <button class="card" style="opacity:.65" (click)="goToManualForm()">
              <span class="card-ico" style="background:var(--glass);border-color:var(--glass-border)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
              <div class="card-info">
                <span class="card-name">Inserimento manuale</span>
                <span class="card-desc">Compila il modulo a mano</span>
              </div>
              <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

        </div>
      }

      @if (state() === 'requesting-permission' || state() === 'scanning' || state() === 'processing') {
        <div class="center">
          <span class="spinner"></span>
          <p class="loading-msg">{{ loadingMessage() }}</p>
        </div>
      }

      @if (state() === 'error') {
        <div class="err-box">
          <p class="err-msg">{{ errorMessage() }}</p>
          <div class="err-actions">
            <button class="btn-sec" (click)="reset()">Riprova</button>
            <button class="btn-acc" (click)="goToManualForm()">Manuale</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .screen { padding-bottom: 100px; animation: scadit-fadeIn 280ms ease both; }
    .header { padding: 8px 20px 20px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
    .cards { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
    .stagger { opacity: 0; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) forwards; animation-delay: calc(var(--i,0) * 80ms + 50ms); }
    .card { width: 100%; display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius); background: var(--glass); border: 1px solid var(--glass-border); backdrop-filter: blur(20px) saturate(140%); cursor: pointer; text-align: left; font-family: inherit; color: var(--text-primary); transition: opacity 150ms ease; }
    .card:active { opacity: 0.75; }
    .card-ico { width: 52px; height: 52px; border-radius: 15px; border: 1px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-info { flex: 1; min-width: 0; }
    .card-name { display: block; font-size: 15px; font-weight: 700; margin-bottom: 3px; }
    .card-desc { display: block; font-size: 12px; color: var(--text-secondary); }
    .chev { color: var(--text-tertiary); flex-shrink: 0; }
    .center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 20px; }
    .spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid var(--glass-border); border-top-color: var(--accent); animation: scadit-spin 700ms linear infinite; }
    .loading-msg { color: var(--text-secondary); font-size: 14px; text-align: center; }
    .err-box { margin: 16px; padding: 20px; background: rgba(255,71,87,0.07); border: 1px solid rgba(255,71,87,0.25); border-radius: var(--radius); text-align: center; }
    .err-msg { color: var(--danger); font-size: 13.5px; margin-bottom: 16px; line-height: 1.5; }
    .err-actions { display: flex; gap: 10px; }
    .btn-sec { flex: 1; padding: 12px; border-radius: 12px; background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-secondary); cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; }
    .btn-acc { flex: 1; padding: 12px; border-radius: 12px; background: var(--accent-grad); border: none; color: white; cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; }
  `],
})
export class ScanComponent {
  private readonly router      = inject(Router);
  private readonly cbillParser = inject(CbillParserService);
  private readonly ocrParser   = inject(OcrParserService);

  readonly state          = signal<ScanState>('idle');
  readonly errorMessage   = signal('');
  readonly loadingMessage = signal('');

  async startQrScan(): Promise<void> {
    try {
      this.state.set('requesting-permission');
      this.loadingMessage.set('Richiesta permesso fotocamera…');

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        this.setError('Permesso fotocamera negato. Abilitalo nelle impostazioni del dispositivo.');
        return;
      }

      this.state.set('scanning');
      this.loadingMessage.set('Inquadra il QR code…');

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode, BarcodeFormat.DataMatrix, BarcodeFormat.Pdf417],
      });

      if (!barcodes.length) {
        this.setError('Nessun codice rilevato. Riprova inquadrando meglio il QR.');
        return;
      }

      this.state.set('processing');
      this.loadingMessage.set('Analisi codice…');

      const raw   = barcodes[0].rawValue ?? '';
      const draft = this.cbillParser.parse(raw);

      if (!draft) {
        this.navigateToForm({ customName: raw, notes: `Scansionato: ${raw}` });
        return;
      }
      this.navigateToForm(draft);
    } catch (err) {
      this.setError(`Errore durante la scansione: ${(err as Error).message}`);
    }
  }

  async startOcrScan(): Promise<void> {
    try {
      this.state.set('requesting-permission');
      this.loadingMessage.set('Apertura fotocamera…');

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source:     CameraSource.Camera,
        quality:    85,
        correctOrientation: true,
      });

      if (!photo.path && !photo.webPath) {
        this.setError('Impossibile acquisire la foto. Riprova.');
        return;
      }

      this.state.set('processing');
      this.loadingMessage.set('Estrazione testo in corso…');

      this.navigateToForm({ notes: `Foto acquisita: ${photo.webPath ?? photo.path}` });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('cancel')) {
        this.state.set('idle');
        return;
      }
      this.setError(`Errore fotocamera: ${msg}`);
    }
  }

  private navigateToForm(draft: object): void {
    this.state.set('idle');
    this.router.navigate(['/deadlines/new'], { state: { draft } });
  }

  private setError(msg: string): void {
    this.errorMessage.set(msg);
    this.state.set('error');
  }

  reset(): void {
    this.state.set('idle');
    this.errorMessage.set('');
  }

  goToF24(): void {
    this.router.navigate(['/scan/f24']);
  }

  goToManualForm(): void {
    this.router.navigate(['/deadlines/new']);
  }

  goBack(): void {
    this.router.navigate(['/deadlines']);
  }
}
