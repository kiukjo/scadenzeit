import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DocumentService } from '../../../core/services/document.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';

type UploadState = 'idle' | 'capturing' | 'saving' | 'uploading' | 'error';

@Component({
  selector: 'app-document-upload',
  imports: [],
  template: `
    <div class="document-upload-page">
      <header class="page-header">
        <button (click)="goBack()">← Indietro</button>
        <h1>Aggiungi documento</h1>
      </header>

      @if (state() === 'idle') {
        <div class="upload-options">

          <label>
            Nome documento *
            <input
              type="text"
              [value]="filename()"
              (input)="filename.set($any($event.target).value)"
              placeholder="es. Carta d'identità, Patente…"
            />
          </label>

          <label>
            Note — opzionale
            <input
              type="text"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              placeholder="es. Scade il 01/01/2030"
            />
          </label>

          <div class="source-buttons">
            <button (click)="capture(cameraSource.Camera)" [disabled]="!filename().trim()">
              📷 Scatta foto
            </button>
            <button (click)="capture(cameraSource.Photos)" [disabled]="!filename().trim()">
              🖼 Dalla galleria
            </button>
          </div>
        </div>
      }

      @if (state() === 'capturing') {
        <p>Acquisizione in corso…</p>
      }

      @if (state() === 'saving') {
        <p>Salvataggio locale…</p>
      }

      @if (state() === 'uploading') {
        <p>Upload su cloud…</p>
      }

      @if (state() === 'error') {
        <div class="upload-error">
          <p>{{ errorMessage() }}</p>
          <button (click)="state.set('idle')">Riprova</button>
        </div>
      }
    </div>
  `,
})
export class DocumentUploadComponent {
  private readonly documentService = inject(DocumentService);
  private readonly supabase        = inject(SupabaseService).client;
  private readonly authService     = inject(SupabaseAuthService);
  private readonly router          = inject(Router);

  readonly state        = signal<UploadState>('idle');
  readonly filename     = signal('');
  readonly notes        = signal('');
  readonly errorMessage = signal('');

  // Esposto al template
  readonly cameraSource = CameraSource;

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

      // 1. Salva una copia locale nella directory privata dell'app (offline-first)
      const destName = `doc_${Date.now()}.jpg`;
      await Filesystem.copy({
        from: photo.path ?? photo.webPath!,
        to: destName,
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

      // 2. Costruisce il documento e lo salva in IndexedDB
      const doc = DocumentService.build({
        filename:  this.filename().trim(),
        localPath: uri,
        mimeType:  'image/jpeg',
        sizeBytes: stat.size,
        notes:     this.notes().trim() || undefined,
      });

      const docId = await this.documentService.add(doc);

      // 3. Upload su Supabase Storage (solo se loggato e online)
      const userId = this.authService.user()?.id;
      if (userId && photo.webPath) {
        try {
          this.state.set('uploading');
          const storagePath = await this.uploadToStorage(
            userId,
            doc.uuid,
            photo.webPath,
          );
          // Aggiorna il record con il path cloud (riusa il campo r2Key)
          await this.documentService.update(docId, { r2Key: storagePath });
        } catch {
          // Upload fallito — il documento resta locale, verrà sincronizzato dopo
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

  private async uploadToStorage(
    userId: string,
    docUuid: string,
    webPath: string,
  ): Promise<string> {
    // Recupera il blob dalla WebView URI
    const response = await fetch(webPath);
    const blob     = await response.blob();

    const storagePath = `${userId}/${docUuid}.jpg`;

    const { error } = await this.supabase.storage
      .from('documents')
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        upsert:      true,
      });

    if (error) throw new Error(error.message);
    return storagePath;
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }
}
