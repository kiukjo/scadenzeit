import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DocumentService } from '../../../core/services/document.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { PremiumGateComponent } from '../../../shared/components/premium-gate.component';
import { FREE_TIER } from '../../../core/constants/free-tier.constants';

type UploadState = 'idle' | 'capturing' | 'saving' | 'uploading' | 'error';

@Component({
  selector: 'app-document-upload',
  imports: [PremiumGateComponent],
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

          @if (isAtLimit()) {
            <app-premium-gate type="documents" />

          } @else if (state() === 'idle') {

            <div class="sec-label">Nome documento *</div>
            <div class="field">
              <input class="inp" type="text" placeholder="es. Carta d'identità, Patente…"
                [value]="filename()" (input)="filename.set($any($event.target).value)" />
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
    .capture-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
    .capture-btn { padding: 18px 10px; border-radius: 16px; border: 1px solid; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; font-family: inherit; transition: opacity 150ms ease; }
    .capture-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .capture-btn.accent { background: rgba(108,99,255,0.10); border-color: rgba(108,99,255,0.30); color: var(--accent); }
    .capture-btn.ghost { background: var(--glass); border-color: var(--glass-border); color: var(--text-secondary); }
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
  private readonly supabase        = inject(SupabaseService).client;
  private readonly authService     = inject(SupabaseAuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly router          = inject(Router);

  readonly isAtLimit = computed(() => {
    if (this.settingsService.profile()?.isPremium) return false;
    return this.documentService.all().length >= FREE_TIER.MAX_DOCUMENTS;
  });

  readonly state        = signal<UploadState>('idle');
  readonly filename     = signal('');
  readonly notes        = signal('');
  readonly errorMessage = signal('');

  readonly cameraSource = CameraSource;

  readonly stateLabel = computed(() => {
    switch (this.state()) {
      case 'capturing': return 'Acquisizione foto…';
      case 'saving':    return 'Salvataggio locale…';
      case 'uploading': return 'Upload su cloud…';
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
        notes:     this.notes().trim() || undefined,
      });

      const docId  = await this.documentService.add(doc);
      const userId = this.authService.user()?.id;

      if (userId && photo.webPath) {
        try {
          this.state.set('uploading');
          const storagePath = await this.uploadToStorage(userId, doc.uuid, photo.webPath);
          await this.documentService.update(docId, { r2Key: storagePath });
        } catch {
          console.warn('Upload Supabase Storage fallito — documento salvato solo in locale');
        }
      }

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

  private async uploadToStorage(userId: string, docUuid: string, webPath: string): Promise<string> {
    const response    = await fetch(webPath);
    const blob        = await response.blob();
    const storagePath = `${userId}/${docUuid}.jpg`;

    const { error } = await this.supabase.storage
      .from('documents')
      .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(error.message);
    return storagePath;
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }
}
