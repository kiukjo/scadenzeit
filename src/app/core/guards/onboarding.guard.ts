import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';

/** Protegge /onboarding — redirect a /deadlines se il profilo esiste già */
export const onboardingGuard: CanActivateFn = async () => {
  const settings = inject(SettingsService);
  const router = inject(Router);

  await settings.loadProfile();
  return settings.profile() === null
    ? true
    : router.createUrlTree(['/deadlines']);
};
