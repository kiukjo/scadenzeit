import { DeadlineCategory, DeadlineRecurrence } from './deadline.model';
import { UserProfileType } from './user.model';

export interface CatalogDeadline {
  id: string;                     // es. 'dichiarazione_730'
  name: string;
  category: DeadlineCategory;
  recurrence: DeadlineRecurrence;
  month?: number;                 // 1-12 (se data fissa annuale)
  day?: number;                   // 1-31
  reminders: number[];            // giorni di anticipo suggeriti
  appliesTo: UserProfileType[];   // profili utente a cui si applica
  notes?: string;
  approxDate?: boolean;           // data indicativa (varia per comune) → mostra avviso
}
