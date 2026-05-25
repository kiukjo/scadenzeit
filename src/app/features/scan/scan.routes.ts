import { Routes } from '@angular/router';

export const SCAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./scan.component').then((m) => m.ScanComponent),
  },
];
