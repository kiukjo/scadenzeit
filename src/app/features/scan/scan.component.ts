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
        <button (click)="goBack()">← Indietro</button>
        <h1>Scansiona</h1>
      </header>

      @if (state() === 'idle') {
        <div class="scan-options">
          <button (click)="startQrScan()" class="scan-btn">
            <strong>Scansiona QR / CBill</strong>
            <span>Bollette, avvisi di pagamento con QR code</span>
          </button>

          <button (click)="startOcrScan()" class="scan-btn">
            <strong>Foto bolletta (OCR)</strong>
            <span>Scatta una foto — la app estrae data e importo</span>
          </button>
        </div>
      }

      @if (state() === 'requesting-permission' || state() === 'scanning' || state() === 'processing') {
        <div class="scan-loading">
          <p>{{ loadingMessage() }}</p>
        </div>
      }

      @if (state() === 'error') {
        <div class="scan-error">
          <p>{{ errorMessage() }}</p>
          <button (click)="reset()">Riprova</button>
          <button (click)="goToManualForm()">Inserimento manuale</button>
        </div>
      }
    </div>
  `,
})
export class ScanComponent {
  private readonly router = inject(Router);
  private readonly cbillParser = inject(CbillParserService);
  private readonly ocrParser = inject(OcrParserService);

  readonly state = signal<ScanState>('idle');
  readonly errorMessage = signal('');

  readonly loadingMessage = signal('');

  // ── QR / CBill ────────────────────────────────────────────────────────────

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

      const raw = barcodes[0].rawValue ?? '';
      const draft = this.cbillParser.parse(raw);

      if (!draft) {
        // Non è un CBill — lo trattiamo come testo libero
        this.navigateToForm({ customName: raw, notes: `Scansionato: ${raw}` });
        return;
      }

      this.navigateToForm(draft);
    } catch (err) {
      this.setError(`Errore durante la scansione: ${(err as Error).message}`);
    }
  }

  // ── OCR bolletta ──────────────────────────────────────────────────────────

  async startOcrScan(): Promise<void> {
    try {
      this.state.set('requesting-permission');
      this.loadingMessage.set('Apertura fotocamera…');

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 85,
        correctOrientation: true,
      });

      if (!photo.path && !photo.webPath) {
        this.setError('Impossibile acquisire la foto. Riprova.');
        return;
      }

      this.state.set('processing');
      this.loadingMessage.set('Estrazione testo OCR in corso…');

      /**
       * ML Kit Text Recognition non ha un package npm pubblicato da capawesome.
       * Qui va integrato quando disponibile oppure via plugin Capacitor custom.
       * Per ora: import dinamico con fallback manuale.
       *
       * Quando il plugin sarà disponibile, sostituire il blocco seguente con:
       *   import { TextRecognition } from '@capacitor-mlkit/text-recognition';
       *   const { text } = await TextRecognition.processImage({ path: photo.path! });
       *   const result = this.ocrParser.parse(text);
       *   this.navigateToForm({ ... result ... });
       */
      this.navigateToForm({
        notes: `Foto acquisita: ${photo.webPath ?? photo.path}`,
      });

    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('cancel')) {
        // L'utente ha annullato — silenzioso
        this.state.set('idle');
        return;
      }
      this.setError(`Errore fotocamera: ${msg}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
