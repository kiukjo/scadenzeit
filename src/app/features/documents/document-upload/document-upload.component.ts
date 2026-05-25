import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DocumentService } from '../../../core/services/document.service';

type UploadState = 'idle' | 'capturing' | 'saving' | 'error';

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

      @if (state() === 'capturing' || state() === 'saving') {
        <p>{{ state() === 'capturing' ? 'Acquisizione in corso…' : 'Salvataggio…' }}</p>
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
  private readonly router = inject(Router);

  readonly state = signal<UploadState>('idle');
  readonly filename = signal('');
  readonly notes = signal('');
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

      if (!photo.path) throw new Error('Percorso file non disponibile');

      this.state.set('saving');

      // Copia il file nella directory privata dell'app
      const destName = `doc_${Date.now()}.jpg`;
      await Filesystem.copy({
        from: photo.path,
        to: destName,
        toDirectory: Directory.Data,
      });

      const { uri } = await Filesystem.getUri({
        path: destName,
        directory: Directory.Data,
      });

      // Ottieni dimensione file
      const stat = await Filesystem.stat({
        path: destName,
        directory: Directory.Data,
      });

      // Salva il documento in IndexedDB
      const doc = DocumentService.build({
        filename: this.filename().trim(),
        localPath: uri,
        mimeType: 'image/jpeg',
        sizeBytes: stat.size,
        notes: this.notes().trim() || undefined,
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
