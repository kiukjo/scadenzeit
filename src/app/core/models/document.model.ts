export interface Document {
  id?: number;              // PK auto-increment IndexedDB
  uuid: string;
  filename: string;         // nome file in chiaro (solo locale)
  filenameEncrypted?: string; // nome cifrato per R2
  localPath?: string;       // path Capacitor Filesystem (pre-sync)
  r2Key?: string;           // path su Cloudflare R2 (post-sync)
  iv?: string;              // base64 — AES-GCM initialization vector
  sizeBytes?: number;
  mimeType?: string;
  category?: string;        // 'personale' | 'casa' | 'veicolo' | 'fisco' | 'altro'
  notes?: string;
  updatedAt: Date;
  syncedAt?: Date;
}
