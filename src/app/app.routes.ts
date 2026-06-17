import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { introGuard } from './core/guards/intro.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'deadlines',
    pathMatch: 'full',
  },
  {
    path: 'intro',
    loadComponent: () =>
      import('./features/intro/intro.component').then((m) => m.IntroComponent),
  },
  {
    path: 'auth',
    canActivate: [introGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./features/onboarding/onboarding.routes').then(
        (m) => m.ONBOARDING_ROUTES,
      ),
  },
  {
    path: 'deadlines',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/deadlines/deadlines.routes').then(
        (m) => m.DEADLINES_ROUTES,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES,
      ),
  },
  {
    path: 'documents',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/documents/documents.routes').then(
        (m) => m.DOCUMENTS_ROUTES,
      ),
  },
  {
    path: 'vehicles',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/vehicles/vehicles.routes').then(
        (m) => m.VEHICLES_ROUTES,
      ),
  },
  {
    path: 'scan',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/scan/scan.routes').then((m) => m.SCAN_ROUTES),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/settings/settings.routes').then(
        (m) => m.SETTINGS_ROUTES,
      ),
  },
  {
    path: '**',
    redirectTo: 'deadlines',
  },
];
