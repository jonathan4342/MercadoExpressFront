import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { Alert, AlertStatus, Product } from '../../core/models/models';
import { AlertService } from '../../core/services/alert.service';
import { ProductService } from '../../core/services/product.service';

/** RF-03: consulta de alertas de stock bajo (descripción, estado y stock). */
@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatChipsModule,
            MatButtonToggleModule, MatIconModule],
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
        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripción</th>
          <td mat-cell *matCellDef="let a">{{ productName(a.productId) }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let a">
            <mat-chip [class.chip-active]="a.status === 'ACTIVA'"
                      [class.chip-resolved]="a.status === 'RESUELTA'">{{ a.status }}</mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="stock">
          <th mat-header-cell *matHeaderCellDef>Stock</th>
          <td mat-cell *matCellDef="let a">
            <mat-chip [class.chip-low]="isLow(a.productId)" [class.chip-ok]="!isLow(a.productId)">
              {{ productStock(a.productId) }}
              @if (isLow(a.productId)) { <mat-icon class="chip-icon">warning</mat-icon> }
            </mat-chip>
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
    .chip-active { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-resolved { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .chip-low { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-ok  { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .chip-icon { font-size: 16px; height: 16px; width: 16px; }
    .empty { text-align: center; color: #888; padding: 24px; }
  `]
})
export class AlertsPageComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly productService = inject(ProductService);

  readonly columns = ['descripcion', 'estado', 'stock'];
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
    return p ? `${p.currentStock} / mín ${p.minimumStock}` : '—';
  }

  isLow(id: string): boolean {
    const p = this.productsById.get(id);
    return p ? p.belowMinimum : false;
  }
}
