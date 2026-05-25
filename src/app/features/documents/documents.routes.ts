import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./documents.component').then((m) => m.DocumentsComponent),
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./document-upload/document-upload.component').then(
        (m) => m.DocumentUploadComponent,
      ),
  },
];
