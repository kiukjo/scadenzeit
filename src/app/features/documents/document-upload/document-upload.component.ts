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
    <div class="document-form-page">
      <header class="page-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Indietro
        </button>
        <h1>Aggiungi documento</h1>
      </header>

      @if (isAtLimit()) {
        <app-premium-gate type="documents" />

      } @else if (state() === 'idle') {

        <div class="form-card">
          <div class="form-group">
            <label>Nome documento *</label>
            <input
              class="input"
              type="text"
              [value]="filename()"
              (input)="filename.set($any($event.target).value)"
              placeholder="es. Carta d'identità, Patente…"
            />
          </div>

          <div class="form-group">
            <label>Note — opzionale</label>
            <input
              class="input"
              type="text"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              placeholder="es. Scade il 01/01/2030"
            />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button
              style="
                padding:14px 10px;
                border-radius:var(--radius-md);
                background:var(--accent-light);
                border:1px solid rgba(108,99,255,.25);
                color:var(--text-primary);
                font-size:.9rem;
                font-weight:600;
                cursor:pointer;
                display:flex;flex-direction:column;align-items:center;gap:8px;
                transition:all .15s;
              "
              [disabled]="!filename().trim()"
              (click)="capture(cameraSource.Camera)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Scatta foto
            </button>

            <button
              style="
                padding:14px 10px;
                border-radius:var(--radius-md);
                background:var(--glass-bg);
                border:1px solid var(--glass-border);
                color:var(--text-secondary);
                font-size:.9rem;
                font-weight:600;
                cursor:pointer;
                display:flex;flex-direction:column;align-items:center;gap:8px;
                transition:all .15s;
              "
              [disabled]="!filename().trim()"
              (click)="capture(cameraSource.Photos)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Dalla galleria
            </button>
          </div>
        </div>

      } @else if (state() === 'error') {
        <div style="padding:20px;background:rgba(255,77,109,.08);border:1px solid rgba(255,77,109,.25);border-radius:var(--radius-md);text-align:center">
          <p style="color:var(--color-overdue);margin-bottom:16px;font-size:.9rem">{{ errorMessage() }}</p>
          <button
            style="padding:10px 24px;border-radius:var(--radius-full);background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-secondary);cursor:pointer"
            (click)="state.set('idle')"
          >Riprova</button>
        </div>

      } @else {
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:20px">
          <div style="width:48px;height:48px;border:3px solid var(--glass-border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite"></div>
          <p style="color:var(--text-secondary)">{{ stateLabel() }}</p>
        </div>
      }
    </div>
  `,
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

      const { uri } = await Filesystem.getUri({
        path: destName,
        directory: Directory.Data,
      });

      const stat = await Filesystem.stat({
        path: destName,
        directory: Directory.Data,
      });

      const doc = DocumentService.build({
        filename:  this.filename().trim(),
        localPath: uri,
        mimeType:  'image/jpeg',
        sizeBytes: stat.size,
        notes:     this.notes().trim() || undefined,
      });

      const docId = await this.documentService.add(doc);

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
