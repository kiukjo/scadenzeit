import { Routes } from '@angular/router';

export const SCAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./scan.component').then((m) => m.ScanComponent),
  },
  {
    path: 'f24',
    loadComponent: () =>
      import('./f24-scan.component').then((m) => m.F24ScanComponent),
  },
];
