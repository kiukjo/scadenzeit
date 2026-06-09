import { Routes } from '@angular/router';

export const DEADLINES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deadlines.component').then((m) => m.DeadlinesComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./deadline-form/deadline-form.component').then(
        (m) => m.DeadlineFormComponent,
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./deadline-form/deadline-form.component').then(
        (m) => m.DeadlineFormComponent,
      ),
  },
];
