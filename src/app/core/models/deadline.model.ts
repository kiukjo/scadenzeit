export type DeadlineCategory =
  | 'fisco'
  | 'veicoli'
  | 'sanita'
  | 'documenti'
  | 'casa'
  | 'lavoro'
  | 'famiglia';

export type DeadlineRecurrence =
  | 'once'        // una tantum
  | 'monthly'     // mensile
  | 'quarterly'   // trimestrale (ogni 3 mesi)
  | 'semiannual'  // semestrale (ogni 6 mesi)
  | 'yearly'      // annuale — stessa data ogni anno
  | 'biennial'    // biennale (es. revisione auto)
  | 'variable';   // calcolata da altri dati (es. bollo auto da targa)

export interface Deadline {
  id?: number;            // PK auto-increment IndexedDB
  uuid: string;           // UUID per sync con backend
  catalogId?: string;     // se null → scadenza custom
  customName: string;
  category: DeadlineCategory;
  dueDate: Date;
  amountCents?: number;   // importo in centesimi (opzionale)
  reminders: number[];    // giorni di anticipo notifica [60, 30, 7, 1]
  recurrence: DeadlineRecurrence;
  completed: boolean;
  notes?: string;
  vehicleId?: string;     // uuid del veicolo collegato (se categoria veicoli)
  documentUuid?: string;  // uuid documento allegato — SOLO locale, non sincronizzato
  updatedAt: Date;
  syncedAt?: Date;        // null = mai sincronizzato
}
