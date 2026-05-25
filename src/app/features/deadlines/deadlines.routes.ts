import { Routes } from '@angular/router';

export const DEADLINES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deadlines.component').then((m) => m.DeadlinesComponent),
  },
];
