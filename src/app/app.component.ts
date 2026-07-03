import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule,
            MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    @if (auth.isAuthenticated()) {
      <mat-toolbar color="primary">
        <mat-icon class="logo">inventory_2</mat-icon>
        <span class="title">MercadoExpress · Inventario</span>
        <span class="spacer"></span>
        <button mat-icon-button matTooltip="Cerrar sesión" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="shell">
        <mat-sidenav mode="side" opened class="nav">
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon>dashboard</mat-icon> Dashboard
            </a>
            <a mat-list-item routerLink="/inventario" routerLinkActive="active">
              <mat-icon matListItemIcon>inventory</mat-icon> Inventario
            </a>
            <a mat-list-item routerLink="/alertas" routerLinkActive="active">
              <mat-icon matListItemIcon>notifications_active</mat-icon> Alertas
            </a>
            <a mat-list-item routerLink="/ordenes" routerLinkActive="active">
              <mat-icon matListItemIcon>receipt_long</mat-icon> Órdenes de compra
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="content">
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .logo { margin-right: 8px; }
    .title { font-weight: 500; }
    .spacer { flex: 1; }
    .shell { height: calc(100vh - 64px); }
    .nav { width: 240px; }
    .content { padding: 24px; background: #fafafa; }
    .active { background: rgba(63, 81, 181, .1); border-radius: 8px; }
  `]
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
