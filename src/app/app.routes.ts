import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'deadlines',
    pathMatch: 'full',
  },
  {
    path: 'deadlines',
    loadChildren: () =>
      import('./features/deadlines/deadlines.routes').then((m) => m.DEADLINES_ROUTES),
  },
  {
    path: 'documents',
    loadChildren: () =>
      import('./features/documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
  },
  {
    path: 'vehicles',
    loadChildren: () =>
      import('./features/vehicles/vehicles.routes').then((m) => m.VEHICLES_ROUTES),
  },
  {
    path: 'scan',
    loadChildren: () =>
      import('./features/scan/scan.routes').then((m) => m.SCAN_ROUTES),
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
  },
];
