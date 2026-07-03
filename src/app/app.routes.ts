import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent)
  },
  {
    path: 'inventario',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventory/inventory-page.component').then((m) => m.InventoryPageComponent)
  },
  {
    path: 'alertas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/alerts/alerts-page.component').then((m) => m.AlertsPageComponent)
  },
  {
    path: 'ordenes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/orders-page.component').then((m) => m.OrdersPageComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
