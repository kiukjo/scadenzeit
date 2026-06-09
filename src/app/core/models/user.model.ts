export type UserProfileType =
  | 'dipendente'
  | 'autonomo'
  | 'proprietario_casa'
  | 'genitore';

export interface UserProfile {
  supabaseId?: string;
  email?: string;
  isPremium: boolean;
  profileTypes: UserProfileType[];  // selezionati durante l'onboarding
  lastSyncAt?: Date;
  encryptionSalt?: string;          // base64 — salt per derivazione chiave documenti
}
