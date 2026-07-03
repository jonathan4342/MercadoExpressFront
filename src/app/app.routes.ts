import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent)
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./features/inventory/inventory-page.component').then((m) => m.InventoryPageComponent)
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./features/alerts/alerts-page.component').then((m) => m.AlertsPageComponent)
  },
  {
    path: 'ordenes',
    loadComponent: () =>
      import('./features/orders/orders-page.component').then((m) => m.OrdersPageComponent)
  }
];
