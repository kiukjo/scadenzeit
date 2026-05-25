import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DocumentService } from '../../core/services/document.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ItalianDatePipe } from '../../shared/pipes/italian-date.pipe';

@Component({
  selector: 'app-documents',
  imports: [RouterLink, EmptyStateComponent, ItalianDatePipe],
  template: `
    <div class="documents-page">
      <header class="page-header">
        <h1>Documenti</h1>
        <a routerLink="upload">+ Aggiungi</a>
      </header>

      @if (documents().length === 0) {
        <app-empty-state
          title="Nessun documento"
          subtitle="Archivia foto di documenti importanti — sono salvati solo sul dispositivo"
        />
      } @else {
        <div class="document-list">
          @for (doc of documents(); track doc.id) {
            <div class="document-card" [attr.data-synced]="!!doc.r2Key">
              <div class="doc-header">
                <strong>{{ doc.filename }}</strong>
                <span class="doc-badge">
                  {{ doc.r2Key ? '☁ Cloud' : '📱 Locale' }}
                </span>
              </div>

              @if (doc.notes) {
                <p class="doc-notes">{{ doc.notes }}</p>
              }

              <div class="doc-meta">
                <span>{{ doc.updatedAt | italianDate }}</span>
                @if (doc.sizeBytes) {
                  <span>{{ formatSize(doc.sizeBytes) }}</span>
                }
              </div>

              <div class="doc-actions">
                @if (doc.localPath) {
                  <button (click)="openLocal(doc.localPath!)">Apri</button>
                }
                <button (click)="remove(doc.id!)">Elimina</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DocumentsComponent {
  private readonly documentService = inject(DocumentService);

  readonly documents = this.documentService.all;

  async openLocal(path: string): Promise<void> {
    // Apertura file locale — il browser/WebView gestisce la visualizzazione
    // In produzione si userebbe @capacitor/app-launcher o un viewer nativo
    window.open(path, '_blank');
  }

  async remove(id: number): Promise<void> {
    const doc = await this.documentService.getById(id);
    if (doc?.localPath && !doc.r2Key) {
      // Rimuovi il file locale solo se non è sincronizzato su R2
      try {
        await Filesystem.deleteFile({ path: doc.localPath });
      } catch {
        // File già rimosso — ignora
      }
    }
    await this.documentService.remove(id);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
