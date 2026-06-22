import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DocumentService } from '../../../core/services/document.service';

type UploadState = 'idle' | 'capturing' | 'saving' | 'error';

@Component({
  selector: 'app-document-upload',
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
          <h2 class="hdr-title">Aggiungi documento</h2>
          <span style="width:32px"></span>
        </div>

        <div class="body">

          @if (state() === 'idle') {

            <div class="sec-label">Nome documento *</div>
            <div class="field">
              <input class="inp" type="text" placeholder="es. Carta d'identità, Patente…"
                [value]="filename()" (input)="filename.set($any($event.target).value)" />
            </div>

            <div class="sec-label">Categoria</div>
            <div class="cat-chips">
              @for (c of cats; track c.key) {
                <button type="button" class="cat-chip" [class.on]="category() === c.key"
                  (click)="category.set(c.key)">{{ c.emoji }} {{ c.label }}</button>
              }
            </div>

            <div class="sec-label">Note — opzionale</div>
            <div class="field">
              <input class="inp" type="text" placeholder="es. Scade il 01/01/2030"
                [value]="notes()" (input)="notes.set($any($event.target).value)" />
            </div>

            <div class="capture-row">
              <button class="capture-btn accent" [disabled]="!filename().trim()" (click)="capture(cameraSource.Camera)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Scatta foto
              </button>
              <button class="capture-btn ghost" [disabled]="!filename().trim()" (click)="capture(cameraSource.Photos)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Dalla galleria
              </button>
            </div>

            <div class="privacy-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>
              I documenti restano <strong>solo sul tuo telefono</strong>. Non vengono mai caricati su alcun server.
            </div>

          } @else if (state() === 'error') {
            <div class="err-box">
              <p class="err-msg">{{ errorMessage() }}</p>
              <button class="btn-retry" type="button" (click)="state.set('idle')">Riprova</button>
            </div>

          } @else {
            <div class="loading-state">
              <span class="spinner"></span>
              <p class="loading-msg">{{ stateLabel() }}</p>
            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; justify-content: flex-end; }
    .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); }
    .sheet { position: relative; z-index: 1; background: var(--modal-bg); border-radius: 28px 28px 0 0; max-height: 90dvh; display: flex; flex-direction: column; animation: scadit-slideUpModal 380ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .drag-handle { width: 40px; height: 4px; background: var(--glass-border); border-radius: 4px; margin: 12px auto 0; flex-shrink: 0; }
    .hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px 10px; flex-shrink: 0; }
    .back-btn { width: 32px; height: 32px; border-radius: 10px; background: var(--glass); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary); }
    .hdr-title { font-size: 17px; font-weight: 700; }
    .body { overflow-y: auto; padding: 8px 20px 48px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .sec-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-tertiary); margin-top: 12px; }
    .field { border-radius: 14px; background: var(--glass); border: 1px solid var(--glass-border); overflow: hidden; }
    .field:focus-within { border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 3px rgba(108,99,255,0.12); }
    .inp { width: 100%; min-width: 0; box-sizing: border-box; padding: 14px; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 15px; font-family: inherit; caret-color: var(--accent); }
    .cat-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .cat-chip { padding: 8px 13px; border-radius: 100px; border: 1px solid var(--glass-border); background: var(--glass); color: var(--text-secondary); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 160ms ease; }
    .cat-chip.on { border-color: transparent; background: var(--accent-grad); color: #fff; }
    .capture-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
    .capture-btn { padding: 18px 10px; border-radius: 16px; border: 1px solid; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; font-family: inherit; transition: opacity 150ms ease; }
    .capture-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .capture-btn.accent { background: rgba(108,99,255,0.10); border-color: rgba(108,99,255,0.30); color: var(--accent); }
    .capture-btn.ghost { background: var(--glass); border-color: var(--glass-border); color: var(--text-secondary); }
    .privacy-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: rgba(46,213,115,0.07); border: 1px solid rgba(46,213,115,0.22); color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
    .privacy-note svg { color: var(--success); flex-shrink: 0; margin-top: 1px; }
    .privacy-note strong { color: var(--text-primary); }
    .err-box { padding: 20px; background: rgba(255,71,87,0.07); border: 1px solid rgba(255,71,87,0.25); border-radius: var(--radius); text-align: center; margin-top: 8px; }
    .err-msg { color: var(--danger); font-size: 13.5px; margin-bottom: 14px; line-height: 1.5; }
    .btn-retry { padding: 10px 24px; border-radius: 100px; background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 18px; }
    .spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid var(--glass-border); border-top-color: var(--accent); animation: scadit-spin 700ms linear infinite; }
    .loading-msg { color: var(--text-secondary); font-size: 14px; }
  `],
})
export class DocumentUploadComponent {
  private readonly documentService = inject(DocumentService);
  private readonly router          = inject(Router);

  readonly cats = [
    { key: 'personale', label: 'Personale', emoji: '🪪' },
    { key: 'casa',      label: 'Casa',      emoji: '🏠' },
    { key: 'veicolo',   label: 'Veicolo',   emoji: '🚗' },
    { key: 'fisco',     label: 'Fisco',     emoji: '🧾' },
    { key: 'altro',     label: 'Altro',     emoji: '📎' },
  ];

  readonly state        = signal<UploadState>('idle');
  readonly filename     = signal('');
  readonly notes        = signal('');
  readonly category     = signal('altro');
  readonly errorMessage = signal('');

  readonly cameraSource = CameraSource;

  readonly stateLabel = computed(() => {
    switch (this.state()) {
      case 'capturing': return 'Acquisizione foto…';
      case 'saving':    return 'Salvataggio locale…';
      default:          return '';
    }
  });

  async capture(source: CameraSource): Promise<void> {
    if (!this.filename().trim()) return;

    try {
      this.state.set('capturing');

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source,
        quality: 90,
        correctOrientation: true,
      });

      if (!photo.path && !photo.webPath) {
        throw new Error('Percorso file non disponibile');
      }

      this.state.set('saving');

      // ── Salvataggio SOLO locale (nessun upload su server) ──
      const destName = `doc_${Date.now()}.jpg`;
      await Filesystem.copy({
        from: photo.path ?? photo.webPath!,
        to:   destName,
        toDirectory: Directory.Data,
      });

      const { uri } = await Filesystem.getUri({ path: destName, directory: Directory.Data });
      const stat    = await Filesystem.stat({ path: destName, directory: Directory.Data });

      const doc = DocumentService.build({
        filename:  this.filename().trim(),
        localPath: uri,
        mimeType:  'image/jpeg',
        sizeBytes: stat.size,
        category:  this.category(),
        notes:     this.notes().trim() || undefined,
      });

      await this.documentService.add(doc);
      await this.router.navigate(['/documents']);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('user cancelled')) {
        this.state.set('idle');
        return;
      }
      this.errorMessage.set(`Errore: ${msg}`);
      this.state.set('error');
    }
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }
}
