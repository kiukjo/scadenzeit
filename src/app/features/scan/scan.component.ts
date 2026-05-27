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
    <div class="scan-page">
      <header class="page-header">
        <h1>Scansiona</h1>
      </header>

      @if (state() === 'idle') {
        <p class="scan-subtitle">Acquisisce automaticamente importo e data dalle tue bollette.</p>

        <div class="scan-options">
          <button class="scan-option-card" (click)="startQrScan()">
            <div class="scan-option-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div class="scan-option-text">
              <strong>Scansiona QR / CBill</strong>
              <span>Bollette e avvisi di pagamento con QR code</span>
            </div>
          </button>

          <button class="scan-option-card" (click)="startOcrScan()">
            <div class="scan-option-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div class="scan-option-text">
              <strong>Foto bolletta (OCR)</strong>
              <span>Scatta una foto — estraiamo data e importo</span>
            </div>
          </button>

          <button
            class="scan-option-card"
            style="opacity:.6"
            (click)="goToManualForm()"
          >
            <div class="scan-option-icon" style="background:var(--glass-bg);border-color:var(--glass-border)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div class="scan-option-text">
              <strong>Inserimento manuale</strong>
              <span>Compila il modulo a mano</span>
            </div>
          </button>
        </div>
      }

      @if (state() === 'requesting-permission' || state() === 'scanning' || state() === 'processing') {
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 20px;
        ">
          <div style="
            width: 52px; height: 52px;
            border: 3px solid var(--glass-border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin .8s linear infinite;
          "></div>
          <p style="color:var(--text-secondary);text-align:center">{{ loadingMessage() }}</p>
        </div>
      }

      @if (state() === 'error') {
        <div style="
          padding: 20px;
          background: rgba(255,77,109,.08);
          border: 1px solid rgba(255,77,109,.25);
          border-radius: var(--radius-md);
          text-align: center;
        ">
          <p style="color:var(--color-overdue);margin-bottom:16px;font-size:.9rem">{{ errorMessage() }}</p>
          <div style="display:flex;gap:8px">
            <button
              style="flex:1;padding:10px;border-radius:var(--radius-sm);background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-secondary);cursor:pointer"
              (click)="reset()"
            >Riprova</button>
            <button
              style="flex:1;padding:10px;border-radius:var(--radius-sm);background:var(--accent-light);border:1px solid rgba(108,99,255,.3);color:var(--accent);cursor:pointer"
              (click)="goToManualForm()"
            >Manuale</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ScanComponent {
  private readonly router      = inject(Router);
  private readonly cbillParser = inject(CbillParserService);
  private readonly ocrParser   = inject(OcrParserService);

  readonly state         = signal<ScanState>('idle');
  readonly errorMessage  = signal('');
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

      // TODO: integrare ML Kit Text Recognition quando disponibile
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

  goToManualForm(): void {
    this.router.navigate(['/deadlines/new']);
  }

  goBack(): void {
    this.router.navigate(['/deadlines']);
  }
}
