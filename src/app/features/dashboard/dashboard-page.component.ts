import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Alert, Product, PurchaseOrder } from '../../core/models/models';
import { AlertService } from '../../core/services/alert.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

interface CategoryBar {
  name: string;
  stock: number;
  percent: number;
}

/** Vista inicial: estadísticas generales del inventario. */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatChipsModule, MatIconModule, MatTableModule],
  template: `
    <h1>Dashboard</h1>

    <!-- KPIs -->
    <div class="kpis">
      <mat-card><mat-card-content>
        <mat-icon class="kpi-icon">inventory</mat-icon>
        <span class="kpi">{{ products().length }}</span>
        <span class="kpi-label">Productos</span>
      </mat-card-content></mat-card>

      <mat-card class="danger"><mat-card-content>
        <mat-icon class="kpi-icon">notifications_active</mat-icon>
        <span class="kpi">{{ activeAlerts().length }}</span>
        <span class="kpi-label">Alertas activas</span>
      </mat-card-content></mat-card>

      <mat-card><mat-card-content>
        <mat-icon class="kpi-icon">pending_actions</mat-icon>
        <span class="kpi">{{ pendingOrders() }}</span>
        <span class="kpi-label">Órdenes pendientes</span>
      </mat-card-content></mat-card>

      <mat-card><mat-card-content>
        <mat-icon class="kpi-icon">payments</mat-icon>
        <span class="kpi">{{ inventoryValue() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
        <span class="kpi-label">Valor del inventario</span>
      </mat-card-content></mat-card>
    </div>

    <div class="panels">
      <!-- Productos con stock bajo -->
      <mat-card>
        <mat-card-header><mat-card-title>Stock bajo</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (p of lowStock(); track p.uid) {
            <div class="row">
              <span class="row-name">{{ p.name }}</span>
              <mat-chip class="chip-low">{{ p.currentStock }} / mín {{ p.minimumStock }}</mat-chip>
            </div>
          } @empty {
            <p class="empty">Ningún producto bajo el mínimo 🎉</p>
          }
          <a routerLink="/inventario" class="link">Ver inventario →</a>
        </mat-card-content>
      </mat-card>

      <!-- Órdenes por estado -->
      <mat-card>
        <mat-card-header><mat-card-title>Órdenes por estado</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (s of orderStats(); track s.status) {
            <div class="row">
              <mat-chip [class]="'chip-' + s.status.toLowerCase()">{{ s.status }}</mat-chip>
              <span class="row-count">{{ s.count }}</span>
            </div>
          }
          <a routerLink="/ordenes" class="link">Ver órdenes →</a>
        </mat-card-content>
      </mat-card>

      <!-- Stock por categoría -->
      <mat-card>
        <mat-card-header><mat-card-title>Stock por categoría</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (c of categoryBars(); track c.name) {
            <div class="bar-row">
              <span class="bar-label">{{ c.name }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="c.percent"></div>
              </div>
              <span class="bar-value">{{ c.stock }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .kpi-icon { color: #3f51b5; }
    .danger .kpi-icon, .danger .kpi { color: #d32f2f; }
    .kpi { font-size: 26px; font-weight: 600; display: block; }
    .kpi-label { color: #666; font-size: 13px; }
    .panels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
    .row-name { font-size: 14px; }
    .row-count { font-weight: 600; }
    .chip-low { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-pendiente { --mdc-chip-container-color: #fff8e1; color: #f57f17; }
    .chip-aprobada  { --mdc-chip-container-color: #e3f2fd; color: #1565c0; }
    .chip-rechazada { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-recibida  { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .bar-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
    .bar-label { width: 80px; font-size: 13px; color: #555; }
    .bar-track { flex: 1; height: 8px; background: #eceff1; border-radius: 4px; }
    .bar-fill { height: 8px; background: #3f51b5; border-radius: 4px; }
    .bar-value { width: 40px; text-align: right; font-size: 13px; font-weight: 500; }
    .link { display: inline-block; margin-top: 10px; font-size: 13px; color: #3f51b5; text-decoration: none; }
    .empty { color: #888; font-size: 14px; }
  `]
})
export class DashboardPageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly alertService = inject(AlertService);
  private readonly orderService = inject(OrderService);

  readonly products = signal<Product[]>([]);
  readonly activeAlerts = signal<Alert[]>([]);
  readonly orders = signal<PurchaseOrder[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    forkJoin({
      products: this.productService.list(),
      alerts: this.alertService.list('ACTIVA'),
      orders: this.orderService.list()
    }).subscribe(({ products, alerts, orders }) => {
      this.products.set(products);
      this.activeAlerts.set(alerts);
      this.orders.set(orders);
    });
  }

  lowStock(): Product[] {
    return this.products().filter((p) => p.belowMinimum);
  }

  pendingOrders(): number {
    return this.orders().filter((o) => o.status === 'PENDIENTE').length;
  }

  inventoryValue(): number {
    return this.products().reduce((sum, p) => sum + p.price * p.currentStock, 0);
  }

  orderStats(): { status: string; count: number }[] {
    return ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'RECIBIDA'].map((status) => ({
      status, count: this.orders().filter((o) => o.status === status).length
    }));
  }

  categoryBars(): CategoryBar[] {
    const totals = new Map<string, number>();
    this.products().forEach((p) =>
      totals.set(p.category, (totals.get(p.category) ?? 0) + p.currentStock));
    const max = Math.max(1, ...totals.values());
    return [...totals.entries()]
      .map(([name, stock]) => ({ name, stock, percent: Math.round((stock / max) * 100) }))
      .sort((a, b) => b.stock - a.stock);
  }
}
