import { Routes } from '@angular/router';

export const VEHICLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vehicles.component').then((m) => m.VehiclesComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./vehicle-form/vehicle-form.component').then(
        (m) => m.VehicleFormComponent,
      ),
  },
];
