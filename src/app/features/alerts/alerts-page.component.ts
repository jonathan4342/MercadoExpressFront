import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { Alert, AlertStatus, Product } from '../../core/models/models';
import { AlertService } from '../../core/services/alert.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

/** RF-03: consulta de alertas + RF-04: generar orden desde alerta activa. */
@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatChipsModule, MatButtonModule,
            MatButtonToggleModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="header">
      <h1>Alertas de stock</h1>
      <mat-button-toggle-group [value]="statusFilter()" (change)="setFilter($event.value)">
        <mat-button-toggle [value]="undefined">Todas</mat-button-toggle>
        <mat-button-toggle value="ACTIVA">Activas</mat-button-toggle>
        <mat-button-toggle value="RESUELTA">Resueltas</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    <mat-card>
      <table mat-table [dataSource]="alerts()" class="full">
        <ng-container matColumnDef="product">
          <th mat-header-cell *matHeaderCellDef>Producto</th>
          <td mat-cell *matCellDef="let a">
            {{ productName(a.productId) }}
            <div class="sub">stock {{ productStock(a.productId) }}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Tipo</th>
          <td mat-cell *matCellDef="let a"><mat-chip class="chip-type">{{ a.type }}</mat-chip></td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let a">
            <mat-chip [class.chip-active]="a.status === 'ACTIVA'"
                      [class.chip-resolved]="a.status === 'RESUELTA'">{{ a.status }}</mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Creada</th>
          <td mat-cell *matCellDef="let a">{{ a.createdAt | date:'medium' }}</td>
        </ng-container>

        <ng-container matColumnDef="resolvedAt">
          <th mat-header-cell *matHeaderCellDef>Resuelta</th>
          <td mat-cell *matCellDef="let a">{{ a.resolvedAt ? (a.resolvedAt | date:'medium') : '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let a">
            @if (a.status === 'ACTIVA') {
              <button mat-stroked-button color="primary"
                      matTooltip="Cantidad = 2x stock mínimo (política de la empresa)"
                      (click)="generateOrder(a)">
                <mat-icon>add_shopping_cart</mat-icon> Generar orden
              </button>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      @if (!alerts().length) { <p class="empty">No hay alertas para este filtro.</p> }
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; }
    .full { width: 100%; }
    .sub { font-size: 12px; color: #888; }
    .chip-type { --mdc-chip-container-color: #fff3e0; color: #e65100; }
    .chip-active { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-resolved { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .empty { text-align: center; color: #888; padding: 24px; }
  `]
})
export class AlertsPageComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['product', 'type', 'status', 'createdAt', 'resolvedAt', 'actions'];
  readonly alerts = signal<Alert[]>([]);
  readonly statusFilter = signal<AlertStatus | undefined>(undefined);
  private productsById = new Map<string, Product>();

  ngOnInit(): void { this.load(); }

  setFilter(status: AlertStatus | undefined): void {
    this.statusFilter.set(status);
    this.load();
  }

  load(): void {
    forkJoin({
      alerts: this.alertService.list(this.statusFilter()),
      products: this.productService.list()
    }).subscribe(({ alerts, products }) => {
      this.productsById = new Map(products.map((p) => [p.id, p]));
      this.alerts.set(alerts);
    });
  }

  productName(id: string): string { return this.productsById.get(id)?.name ?? id; }
  productStock(id: string): string {
    const p = this.productsById.get(id);
    return p ? `${p.currentStock} / mín ${p.minimumStock}` : '';
  }

  generateOrder(alert: Alert): void {
    const product = this.productsById.get(alert.productId);
    if (!product) return;
    const quantity = product.minimumStock * 2; // Regla 2
    this.orderService.create(product.id, quantity, alert.id).subscribe({
      next: () => this.snackBar.open(`Orden creada desde la alerta (${quantity} und.)`, 'OK', { duration: 4000 }),
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error al crear la orden', 'OK')
    });
  }
}
