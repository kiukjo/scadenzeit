import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';

/** Protegge le route autenticate — redirect a /onboarding se nessun profilo */
export const authGuard: CanActivateFn = async () => {
  const settings = inject(SettingsService);
  const router = inject(Router);

  await settings.loadProfile();
  return settings.profile() !== null
    ? true
    : router.createUrlTree(['/onboarding']);
};
