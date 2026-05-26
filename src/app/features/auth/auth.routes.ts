import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'callback',
    loadComponent: () =>
      import('./auth-callback.component').then((m) => m.AuthCallbackComponent),
  },
];
