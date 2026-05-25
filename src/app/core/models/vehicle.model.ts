export interface Vehicle {
  id?: number;          // PK auto-increment IndexedDB
  uuid: string;
  targa: string;        // identificativo visivo (es. AB123CD)
  marca?: string;
  modello?: string;
  kw?: number;          // per calcolo bollo ACI
  regioneCode?: string; // es. 'IT-LO', 'IT-RM' — per tariffa bollo regionale
  immatDate?: Date;     // data immatricolazione (libretto)
  ultimaRevisione?: Date;
  assicExpiry?: Date;   // scadenza assicurazione RC
  notes?: string;
  updatedAt: Date;
  syncedAt?: Date;
}
