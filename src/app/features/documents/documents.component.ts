import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Filesystem } from '@capacitor/filesystem';
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
        <a routerLink="upload" class="fab" aria-label="Aggiungi documento">+</a>
      </header>

      @if (documents().length === 0) {
        <app-empty-state
          title="Nessun documento"
          subtitle="Archivia foto di documenti importanti — salvati sul dispositivo"
          icon="📁"
        />
      } @else {
        <div class="document-list">
          @for (doc of documents(); track doc.id) {
            <div class="document-card" [attr.data-synced]="!!doc.r2Key">
              <div class="doc-header">
                <strong>{{ doc.filename }}</strong>
                <span class="doc-badge">{{ doc.r2Key ? '☁ Cloud' : '📱 Locale' }}</span>
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
                  <button (click)="openLocal(doc.localPath!)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Apri
                  </button>
                }
                <button (click)="remove(doc.id!)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                </button>
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
    window.open(path, '_blank');
  }

  async remove(id: number): Promise<void> {
    const doc = await this.documentService.getById(id);
    if (doc?.localPath && !doc.r2Key) {
      try {
        await Filesystem.deleteFile({ path: doc.localPath });
      } catch {
        // File già rimosso — ignora
      }
    }
    await this.documentService.remove(id);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
