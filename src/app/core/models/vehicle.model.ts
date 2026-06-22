export interface Vehicle {
  id?: number;          // PK auto-increment IndexedDB
  uuid: string;
  targa: string;        // identificativo visivo (es. AB123CD)
  marca?: string;
  modello?: string;
  kw?: number;          // per calcolo bollo ACI
  provincia?: string;   // sigla provincia (es. 'MI') — da cui si ricava la regione bollo
  regioneCode?: string; // codice regione (es. 'LOM') — per tariffa bollo regionale
  immatDate?: Date;     // data immatricolazione (libretto)
  ultimaRevisione?: Date;
  assicExpiry?: Date;   // scadenza assicurazione RC
  notes?: string;
  updatedAt: Date;
  syncedAt?: Date;
}
