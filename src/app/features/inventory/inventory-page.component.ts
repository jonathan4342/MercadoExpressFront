import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { Product } from '../../core/models/models';
import { AlertService } from '../../core/services/alert.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { ProductFormDialogComponent } from './product-form-dialog.component';
import { StockAdjustDialogComponent } from './stock-adjust-dialog.component';

/** Inventario: solo filtros + tabla (las estadísticas viven en el Dashboard). */
@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule, MatChipsModule,
            MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatDialogModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="header">
      <h1>Inventario</h1>
      <button mat-flat-button color="primary" (click)="openProductDialog()">
        <mat-icon>add</mat-icon> Nuevo producto
      </button>
    </div>

    <!-- Filtros (RF-06) -->
    <mat-card class="filters">
      <form [formGroup]="filterForm" class="filter-row">
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="category">
            <mat-option [value]="''">Todas</mat-option>
            @for (c of categories; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="supplier">
            <mat-option [value]="''">Todos</mat-option>
            @for (s of suppliers(); track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="short">
          <mat-label>Stock desde</mat-label>
          <input matInput type="number" formControlName="minStock" min="0" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="short">
          <mat-label>Stock hasta</mat-label>
          <input matInput type="number" formControlName="maxStock" min="0" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Alerta</mat-label>
          <mat-select formControlName="activeAlert">
            <mat-option [value]="false">Todos</mat-option>
            <mat-option [value]="true">Solo con alerta activa</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button type="button" (click)="load()">
          <mat-icon>filter_alt</mat-icon> Aplicar
        </button>
        <button mat-button type="button" (click)="clearFilters()">Limpiar</button>
      </form>
    </mat-card>

    <!-- Tabla -->
    <mat-card>
      <table mat-table [dataSource]="products()" class="full">
        <ng-container matColumnDef="sku">
          <th mat-header-cell *matHeaderCellDef>SKU</th>
          <td mat-cell *matCellDef="let p"><code>{{ p.sku }}</code></td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Producto</th>
          <td mat-cell *matCellDef="let p">{{ p.name }}</td>
        </ng-container>

        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Categoría</th>
          <td mat-cell *matCellDef="let p">{{ p.category }}</td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Precio</th>
          <td mat-cell *matCellDef="let p">{{ p.price | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
        </ng-container>

        <ng-container matColumnDef="currentStock">
          <th mat-header-cell *matHeaderCellDef>Stock actual</th>
          <td mat-cell *matCellDef="let p">
            <mat-chip [class.chip-low]="p.belowMinimum" [class.chip-ok]="!p.belowMinimum">
              {{ p.currentStock }}
              @if (p.belowMinimum) { <mat-icon class="chip-icon">warning</mat-icon> }
            </mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="minimumStock">
          <th mat-header-cell *matHeaderCellDef>Stock mínimo</th>
          <td mat-cell *matCellDef="let p">{{ p.minimumStock }}</td>
        </ng-container>

        <ng-container matColumnDef="supplier">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let p">{{ p.supplier }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button matTooltip="Ajustar stock" (click)="openAdjustDialog(p)">
              <mat-icon>tune</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Generar orden de compra" (click)="createOrder(p)">
              <mat-icon>add_shopping_cart</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.row-low]="row.belowMinimum"></tr>
      </table>

      @if (!products().length) { <p class="empty">Sin productos para los filtros aplicados.</p> }
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; }
    .filters { margin-bottom: 16px; padding: 16px 16px 0; }
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .short { width: 130px; }
    .full { width: 100%; }
    .chip-low { --mdc-chip-container-color: #ffebee; color: #c62828; }
    .chip-ok  { --mdc-chip-container-color: #e8f5e9; color: #2e7d32; }
    .chip-icon { font-size: 16px; height: 16px; width: 16px; }
    .row-low { background: #fff8f8; }
    .empty { text-align: center; color: #888; padding: 24px; }
  `]
})
export class InventoryPageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly alertService = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly columns = ['sku', 'name', 'category', 'price', 'currentStock', 'minimumStock', 'supplier', 'actions'];
  readonly categories = ['Bebidas', 'Lácteos', 'Snacks', 'Limpieza', 'Frutas', 'Granos'];

  readonly products = signal<Product[]>([]);
  readonly suppliers = signal<string[]>([]);

  readonly filterForm = this.fb.nonNullable.group({
    category: '', supplier: '', minStock: null as number | null,
    maxStock: null as number | null, activeAlert: false
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    const f = this.filterForm.getRawValue();
    this.productService.list({
      category: f.category || undefined,
      supplier: f.supplier || undefined,
      minStock: f.minStock ?? undefined,
      maxStock: f.maxStock ?? undefined,
      activeAlert: f.activeAlert || undefined
    }).subscribe((products) => {
      this.products.set(products);
      this.suppliers.set([...new Set(products.map((p) => p.supplier))].sort());
    });
  }

  clearFilters(): void { this.filterForm.reset(); this.load(); }

  openProductDialog(): void {
    this.dialog.open(ProductFormDialogComponent, { width: '520px' })
      .afterClosed().subscribe((created) => { if (created) this.load(); });
  }

  openAdjustDialog(product: Product): void {
    this.dialog.open(StockAdjustDialogComponent, { width: '460px', data: product })
      .afterClosed().subscribe((adjusted) => { if (adjusted) this.load(); });
  }

  createOrder(product: Product): void {
    // Regla 2: precarga la cantidad mínima permitida (2x stock mínimo)
    const quantity = product.minimumStock * 2;
    this.orderService.create(product.id, quantity).subscribe({
      next: () => this.snackBar.open(
        `Orden creada: ${quantity} und. de ${product.name}`, 'OK', { duration: 4000 }),
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error al crear la orden', 'OK')
    });
  }
}
