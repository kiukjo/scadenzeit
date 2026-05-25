import { Routes } from '@angular/router';
import { onboardingGuard } from '../../core/guards/onboarding.guard';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./onboarding.component').then((m) => m.OnboardingComponent),
  },
];
