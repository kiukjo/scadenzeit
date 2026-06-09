import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Filesystem } from '@capacitor/filesystem';
import { DocumentService } from '../../core/services/document.service';
import { ToastService, haptic } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ItalianDatePipe } from '../../shared/pipes/italian-date.pipe';
import { IconComponent } from '../../shared/components/icon.component';
import { Document } from '../../core/models';

@Component({
  selector: 'app-documents',
  imports: [RouterLink, EmptyStateComponent, ItalianDatePipe, IconComponent],
  template: `
    <div class="screen">

      <header class="header">
        <div>
          <h1 class="title">Documenti</h1>
          <p class="sub">{{ documents().length }} archiviati</p>
        </div>
        <a routerLink="upload" class="new-btn" aria-label="Aggiungi documento">
          <app-icon name="plus" [size]="14" color="#fff" [strokeWidth]="2.4" />
          Nuovo
        </a>
      </header>

      @if (documents().length === 0) {
        <app-empty-state
          title="Nessun documento"
          subtitle="Archivia foto di documenti importanti — salvati sul dispositivo"
          icon="📁"
        />
      } @else {
        <div class="list">
          @for (doc of documents(); track doc.id; let i = $index) {
            <div class="stagger" [style.--i]="i">
              <div class="card">
                <!-- Icon -->
                <span class="doc-ico">📄</span>

                <!-- Info -->
                <div class="doc-info">
                  <span class="doc-name">{{ doc.filename }}</span>
                  @if (doc.notes) {
                    <span class="doc-notes">{{ doc.notes }}</span>
                  }
                  <span class="doc-meta">
                    {{ doc.updatedAt | italianDate }}
                    @if (doc.sizeBytes) { · {{ formatSize(doc.sizeBytes) }} }
                  </span>
                </div>

                <!-- Badge: sempre locale -->
                <span class="badge" title="Salvato sul dispositivo">📱</span>

                <!-- Actions -->
                <div class="actions">
                  @if (doc.localPath) {
                    <button class="icon-btn" type="button" (click)="openLocal(doc.localPath!)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </button>
                  }
                  <button class="icon-btn danger" type="button" (click)="remove(doc)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .screen { padding-bottom: 100px; animation: scadit-fadeIn 280ms ease both; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 20px 18px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }
    .new-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 12px; background: var(--accent-grad); color: white; font-size: 12.5px; font-weight: 700; box-shadow: 0 6px 16px rgba(108,99,255,0.35); text-decoration: none; }
    .list { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
    .stagger { opacity: 0; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) forwards; animation-delay: calc(var(--i,0) * 60ms); }
    .card { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--radius); background: var(--glass); border: 1px solid var(--glass-border); backdrop-filter: blur(20px) saturate(140%); }
    .doc-ico { font-size: 28px; flex-shrink: 0; }
    .doc-info { flex: 1; min-width: 0; }
    .doc-name { display: block; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-notes { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-meta { display: block; font-size: 11.5px; color: var(--text-tertiary); margin-top: 3px; }
    .badge { font-size: 16px; flex-shrink: 0; opacity: 0.7; }
    .actions { display: flex; gap: 6px; }
    .icon-btn { width: 32px; height: 32px; border-radius: 10px; background: var(--glass); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-tertiary); transition: color 150ms ease; }
    .icon-btn.danger:active { color: var(--danger); }
  `],
})
export class DocumentsComponent {
  private readonly documentService = inject(DocumentService);
  private readonly toast           = inject(ToastService);

  readonly documents = this.documentService.all;

  async openLocal(path: string): Promise<void> {
    window.open(path, '_blank');
  }

  async remove(doc: Document): Promise<void> {
    if (doc.id == null) return;
    haptic([10, 30, 10]);

    // Rimuove subito il record; il file su disco viene cancellato solo
    // allo scadere dello snackbar (così l'undo può ripristinarlo).
    await this.documentService.remove(doc.id);
    const { id: _omit, ...snapshot } = doc;
    let undone = false;

    this.toast.show('Documento eliminato', {
      variant: 'danger',
      actionLabel: 'Annulla',
      duration: 5000,
      action: async () => {
        undone = true;
        await this.documentService.add(snapshot);
      },
    });

    setTimeout(async () => {
      if (undone) return;
      if (doc.localPath) {
        try {
          await Filesystem.deleteFile({ path: doc.localPath });
        } catch {
          // file già assente — ignora
        }
      }
    }, 5200);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
