import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Protegge le route autenticate.
 * Flusso:
 *   1. Nessuna sessione Supabase  → /auth
 *   2. Sessione ok, ma no profilo → /onboarding
 *   3. Sessione + profilo          → procedi
 */
export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).client;
  const settings = inject(SettingsService);
  const router   = inject(Router);

  // Controlla la sessione Supabase (legge da localStorage — sincrono nell'SDK)
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return router.createUrlTree(['/auth']);
  }

  await settings.loadProfile();
  return settings.profile() !== null
    ? true
    : router.createUrlTree(['/onboarding']);
};
