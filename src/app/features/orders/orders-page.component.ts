import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { OrderStatus, Product, PurchaseOrder } from '../../core/models/models';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { CreateOrderDialogComponent } from './create-order-dialog.component';
import { RejectOrderDialogComponent } from './reject-order-dialog.component';

/** RF-04 + RF-05: creación, filtros y ciclo de vida de órdenes de compra. */
@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule, MatChipsModule,
            MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatDialogModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="header">
      <h1>Órdenes de compra</h1>
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add_shopping_cart</mat-icon> Crear orden de compra
      </button>
    </div>

    <!-- Filtros para verificar las órdenes -->
    <mat-card class="filters">
      <form [formGroup]="filterForm" class="filter-row">
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="status" (selectionChange)="applyStatus($event.value)">
            <mat-option [value]="''">Todas</mat-option>
            <mat-option value="PENDIENTE">Pendientes</mat-option>
            <mat-option value="APROBADA">Aprobadas</mat-option>
            <mat-option value="RECHAZADA">Rechazadas</mat-option>
            <mat-option value="RECIBIDA">Recibidas</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="wide">
          <mat-label>Producto</mat-label>
          <input matInput [value]="productQuery()"
                 (input)="productQuery.set($any($event.target).value)"
                 placeholder="Filtra por descripción" />
          @if (productQuery()) {
            <button matSuffix mat-icon-button type="button" (click)="productQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="supplier">
            <mat-option [value]="''">Todos</mat-option>
            @for (s of suppliers(); track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <button mat-button type="button" (click)="clearFilters()">Limpiar</button>
      </form>
    </mat-card>

    <mat-card>
      <table mat-table [dataSource]="filtered()" class="full">
        <ng-container matColumnDef="product">
          <th mat-header-cell *matHeaderCellDef>Producto</th>
          <td mat-cell *matCellDef="let o">{{ productName(o.productId) }}</td>
        </ng-container>

        <ng-container matColumnDef="supplier">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let o">{{ o.supplier }}</td>
        </ng-container>

        <ng-container matColumnDef="quantity">
          <th mat-header-cell *matHeaderCellDef>Cantidad</th>
          <td mat-cell *matCellDef="let o">{{ o.quantity }}</td>
        </ng-container>

        <ng-container matColumnDef="origin">
          <th mat-header-cell *matHeaderCellDef>Origen</th>
          <td mat-cell *matCellDef="let o">
            @if (o.alertId) { <mat-chip class="chip-alert"><mat-icon class="s">notifications</mat-icon> Alerta</mat-chip> }
            @else { <mat-chip>Manual</mat-chip> }
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let o">
            <mat-chip [class]="'chip-' + o.status.toLowerCase()">{{ o.status }}</mat-chip>
            @if (o.rejectionReason) {
              <div class="sub" [matTooltip]="o.rejectionReason">Motivo: {{ o.rejectionReason }}</div>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Creada</th>
          <td mat-cell *matCellDef="let o">{{ o.createdAt | date:'short' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let o">
            <!-- Regla 5: solo transiciones válidas -->
            @if (o.status === 'PENDIENTE') {
              <button mat-icon-button color="primary" matTooltip="Aprobar" (click)="approve(o)">
                <mat-icon>check_circle</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Rechazar" (click)="reject(o)">
                <mat-icon>cancel</mat-icon>
              </button>
            }
            @if (o.status === 'APROBADA') {
              <button mat-stroked-button color="primary"
                      matTooltip="Suma el stock y cierra la alerta asociada" (click)="receive(o)">
                <mat-icon>local_shipping</mat-icon> Recibir
              </button>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      @if (!filtered().length) { <p class="empty">No hay órdenes para este filtro.</p> }
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .filters { margin-bottom: 16px; padding: 16px 16px 0; }
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .wide { min-width: 240px; flex: 1 1 240px; }
    .full { width: 100%; }
    .sub { font-size: 12px; color: #888; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .s { font-size: 16px; height: 16px; width: 16px; }
    .chip-alert     { --mdc-chip-container-color: #fff3e0; color: #e65100; }
    .chip-pendiente { --mdc-chip-container-color: #fff8e1; color: #f57f17; }
    .chip-aprobada  { --mdc-chip-container-color: #e3f2fd; color: #1565c0; }
    .chip-rechazada { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-recibida  { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .empty { text-align: center; color: #888; padding: 24px; }
  `]
})
export class OrdersPageComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly columns = ['product', 'supplier', 'quantity', 'origin', 'status', 'createdAt', 'actions'];
  readonly orders = signal<PurchaseOrder[]>([]);
  readonly suppliers = signal<string[]>([]);
  readonly statusFilter = signal<OrderStatus | undefined>(undefined);
  readonly productQuery = signal('');
  private productsById = new Map<string, Product>();

  readonly filterForm = this.fb.nonNullable.group({ status: '', supplier: '' });

  /** Filtro cliente por descripción de producto y por proveedor. */
  readonly filtered = computed(() => {
    const q = this.productQuery().trim().toLowerCase();
    const supplier = this.filterForm.getRawValue().supplier;
    return this.orders().filter((o) => {
      const matchesProduct = !q || this.productName(o.productId).toLowerCase().includes(q);
      const matchesSupplier = !supplier || o.supplier === supplier;
      return matchesProduct && matchesSupplier;
    });
  });

  ngOnInit(): void { this.load(); }

  applyStatus(value: string): void {
    this.statusFilter.set((value || undefined) as OrderStatus | undefined);
    this.load();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.productQuery.set('');
    this.statusFilter.set(undefined);
    this.load();
  }

  load(): void {
    forkJoin({
      orders: this.orderService.list(this.statusFilter()),
      products: this.productService.list()
    }).subscribe(({ orders, products }) => {
      this.productsById = new Map(products.map((p) => [p.id, p]));
      this.orders.set(orders);
      this.suppliers.set([...new Set(orders.map((o) => o.supplier))].sort());
    });
  }

  productName(id: string): string { return this.productsById.get(id)?.name ?? id; }

  openCreateDialog(): void {
    this.dialog.open(CreateOrderDialogComponent, { width: '480px' })
      .afterClosed().subscribe((created) => { if (created) this.load(); });
  }

  approve(order: PurchaseOrder): void {
    this.orderService.approve(order.id).subscribe({
      next: () => { this.snackBar.open('Orden aprobada', 'OK', { duration: 3000 }); this.load(); },
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error', 'OK')
    });
  }

  reject(order: PurchaseOrder): void {
    this.dialog.open(RejectOrderDialogComponent, { width: '440px' })
      .afterClosed().subscribe((reason: string | undefined) => {
        if (!reason) return;
        this.orderService.reject(order.id, reason).subscribe({
          next: () => { this.snackBar.open('Orden rechazada', 'OK', { duration: 3000 }); this.load(); },
          error: (err) => this.snackBar.open(err.error?.message ?? 'Error', 'OK')
        });
      });
  }

  receive(order: PurchaseOrder): void {
    this.orderService.receive(order.id).subscribe({
      next: () => { this.snackBar.open('Orden recibida: stock actualizado', 'OK', { duration: 4000 }); this.load(); },
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error', 'OK')
    });
  }
}
