import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { DocumentService } from '../../core/services/document.service';
import { ToastService, haptic } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ItalianDatePipe } from '../../shared/pipes/italian-date.pipe';
import { IconComponent } from '../../shared/components/icon.component';
import { Document } from '../../core/models';

interface CatChip { key: string; label: string; emoji: string; }

const DOC_CATS: CatChip[] = [
  { key: 'personale', label: 'Personali', emoji: '🪪' },
  { key: 'casa',      label: 'Casa',      emoji: '🏠' },
  { key: 'veicolo',   label: 'Veicoli',   emoji: '🚗' },
  { key: 'fisco',     label: 'Fisco',     emoji: '🧾' },
  { key: 'altro',     label: 'Altro',     emoji: '📎' },
];

@Component({
  selector: 'app-documents',
  imports: [RouterLink, EmptyStateComponent, ItalianDatePipe, IconComponent],
  template: `
    <div class="screen">

      <header class="header">
        <div>
          <h1 class="title">Documenti</h1>
          <p class="sub">{{ documents().length }} sul dispositivo</p>
        </div>
        <a routerLink="upload" class="new-btn" aria-label="Aggiungi documento">
          <app-icon name="plus" [size]="14" color="#fff" [strokeWidth]="2.4" />
          Nuovo
        </a>
      </header>

      @if (documents().length === 0) {
        <app-empty-state
          title="Nessun documento"
          subtitle="Archivia foto di documenti importanti — restano salvati solo sul tuo dispositivo"
          icon="📁"
        />
      } @else {

        <!-- Ricerca + ordinamento -->
        <div class="toolbar">
          <div class="search">
            <app-icon name="search" [size]="16" color="var(--text-tertiary)" />
            <input type="text" placeholder="Cerca documento…" inputmode="search"
              [value]="query()" (input)="query.set($any($event.target).value)" />
            @if (query()) {
              <button class="clr" (click)="query.set('')" aria-label="Pulisci"><app-icon name="close" [size]="13" [strokeWidth]="2.2"/></button>
            }
          </div>
          <button class="sort-btn" (click)="toggleSort()" [attr.aria-label]="'Ordina'">
            <app-icon [name]="sortBy() === 'date' ? 'calendar' : 'book'" [size]="15" />
            {{ sortBy() === 'date' ? 'Recenti' : 'A-Z' }}
          </button>
        </div>

        <!-- Chip categoria -->
        <div class="chips">
          <button class="chip" [class.on]="cat() === ''" (click)="cat.set('')">Tutti</button>
          @for (c of cats; track c.key) {
            <button class="chip" [class.on]="cat() === c.key" (click)="cat.set(c.key)">{{ c.emoji }} {{ c.label }}</button>
          }
        </div>

        @if (filtered().length === 0) {
          <div class="nores">
            <span class="nores-ico">🔍</span>
            <div>Nessun documento trovato</div>
          </div>
        }

        <div class="list">
          @for (doc of filtered(); track doc.id; let i = $index) {
            <div class="stagger" [style.--i]="i">
              <div class="card">
                <span class="doc-ico">{{ emojiFor(doc) }}</span>
                <div class="doc-info" (click)="doc.localPath && openLocal(doc.localPath)">
                  <span class="doc-name">{{ doc.filename }}</span>
                  @if (doc.notes) { <span class="doc-notes">{{ doc.notes }}</span> }
                  <span class="doc-meta">
                    {{ doc.updatedAt | italianDate }}
                    @if (doc.sizeBytes) { · {{ formatSize(doc.sizeBytes) }} }
                  </span>
                </div>
                <div class="actions">
                  @if (doc.localPath) {
                    <button class="icon-btn" type="button" (click)="openLocal(doc.localPath!)" aria-label="Apri">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </button>
                  }
                  <button class="icon-btn danger" type="button" (click)="remove(doc)" aria-label="Elimina">
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

      <!-- Anteprima documento a schermo intero -->
      @if (previewSrc(); as src) {
        <div class="preview-overlay" (click)="closePreview()">
          <button class="preview-close" type="button" aria-label="Chiudi">
            <app-icon name="close" [size]="22" color="#fff" [strokeWidth]="2.4" />
          </button>
          <img class="preview-img" [src]="src" alt="Documento" (click)="$event.stopPropagation()" />
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .screen { padding-bottom: 100px; animation: scadit-fadeIn 280ms ease both; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 20px 14px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }
    .new-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 12px; background: var(--accent-grad); color: white; font-size: 12.5px; font-weight: 700; box-shadow: 0 6px 16px rgba(108,99,255,0.35); text-decoration: none; }
    .toolbar { display: flex; gap: 8px; padding: 0 16px 10px; }
    .search { flex: 1; display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 42px; border-radius: 13px; background: var(--glass); border: 1px solid var(--glass-border); }
    .search input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 14px; font-family: inherit; caret-color: var(--accent); }
    .clr { width: 22px; height: 22px; border-radius: 11px; border: none; background: var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); flex-shrink: 0; }
    .sort-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 13px; height: 42px; border-radius: 13px; background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; }
    .chips { display: flex; gap: 8px; padding: 0 16px 14px; overflow-x: auto; scrollbar-width: none; }
    .chips::-webkit-scrollbar { display: none; }
    .chip { flex-shrink: 0; padding: 7px 13px; border-radius: 100px; border: 1px solid var(--glass-border); background: var(--glass); color: var(--text-secondary); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 160ms ease; }
    .chip.on { border-color: transparent; background: var(--accent-grad); color: #fff; }
    .nores { text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 13.5px; }
    .nores-ico { font-size: 36px; display: block; margin-bottom: 8px; }
    .list { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
    .stagger { opacity: 0; animation: scadit-slideUp 420ms cubic-bezier(0.2,0.8,0.2,1) forwards; animation-delay: calc(var(--i,0) * 50ms); }
    .card { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--radius); background: var(--glass); border: 1px solid var(--glass-border); backdrop-filter: blur(20px) saturate(140%); }
    .doc-ico { font-size: 28px; flex-shrink: 0; }
    .doc-info { flex: 1; min-width: 0; cursor: pointer; }
    .doc-name { display: block; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-notes { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-meta { display: block; font-size: 11.5px; color: var(--text-tertiary); margin-top: 3px; }
    .actions { display: flex; gap: 6px; }
    .icon-btn { width: 32px; height: 32px; border-radius: 10px; background: var(--glass); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-tertiary); transition: transform 120ms ease, color 150ms ease; }
    .icon-btn:active { transform: scale(0.9); }
    .icon-btn.danger:active { color: var(--danger); }
    .preview-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 20px; animation: scadit-fadeIn 200ms ease both; }
    .preview-img { max-width: 100%; max-height: 100%; border-radius: 12px; object-fit: contain; }
    .preview-close { position: absolute; top: calc(env(safe-area-inset-top,0px) + 14px); right: 16px; width: 42px; height: 42px; border-radius: 21px; background: rgba(255,255,255,0.15); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  `],
})
export class DocumentsComponent {
  private readonly documentService = inject(DocumentService);
  private readonly toast           = inject(ToastService);

  readonly documents = this.documentService.all;
  readonly previewSrc = signal<string | null>(null);

  readonly cats = DOC_CATS;
  readonly query  = signal('');
  readonly cat    = signal('');
  readonly sortBy = signal<'date' | 'name'>('date');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.cat();
    let list = this.documents().filter((d) => {
      if (c && (d.category ?? 'altro') !== c) return false;
      if (q && !(d.filename.toLowerCase().includes(q) || (d.notes ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      this.sortBy() === 'name'
        ? a.filename.localeCompare(b.filename)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return list;
  });

  toggleSort(): void {
    this.sortBy.set(this.sortBy() === 'date' ? 'name' : 'date');
  }

  emojiFor(doc: Document): string {
    return DOC_CATS.find((c) => c.key === doc.category)?.emoji ?? '📄';
  }

  openLocal(path: string): void {
    this.previewSrc.set(Capacitor.convertFileSrc(path));
  }

  closePreview(): void {
    this.previewSrc.set(null);
  }

  async remove(doc: Document): Promise<void> {
    if (doc.id == null) return;
    haptic([10, 30, 10]);

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
