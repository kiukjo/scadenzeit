import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const INTRO_SEEN_KEY = 'scadenzait_intro_seen';

/**
 * Alla prima apertura (intro mai vista) reindirizza al carosello di
 * presentazione. Una volta vista, lascia proseguire.
 */
export const introGuard: CanActivateFn = () => {
  const router = inject(Router);
  let seen = false;
  try { seen = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { seen = true; }
  return seen ? true : router.parseUrl('/intro');
};
