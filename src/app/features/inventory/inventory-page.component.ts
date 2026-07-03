import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Product } from '../../core/models/models';
import { ProductService } from '../../core/services/product.service';
import { ProductFormDialogComponent, ProductFormData } from './product-form-dialog.component';

/** Inventario: filtros (producto, categoría, proveedor) + tabla con edición. */
@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule, MatChipsModule,
            MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatAutocompleteModule, MatDialogModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="header">
      <h1>Inventario</h1>
      <button mat-flat-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon> Nuevo producto
      </button>
    </div>

    <!-- Filtros (RF-06): Producto, Categoría, Proveedor -->
    <mat-card class="filters">
      <form [formGroup]="filterForm" class="filter-row">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Producto (SKU o descripción)</mat-label>
          <input matInput [matAutocomplete]="auto"
                 [value]="productQuery()"
                 (input)="productQuery.set($any($event.target).value)"
                 placeholder="Escribe un SKU o una descripción" />
          <mat-autocomplete #auto="matAutocomplete">
            @for (p of filtered(); track p.id) {
              <mat-option [value]="p.sku + ' - ' + p.name"
                          (onSelectionChange)="productQuery.set(p.sku + ' - ' + p.name)">
                <code>{{ p.sku }}</code> — {{ p.name }}
              </mat-option>
            }
          </mat-autocomplete>
          @if (productQuery()) {
            <button matSuffix mat-icon-button type="button" (click)="productQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

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

        <button mat-stroked-button type="button" (click)="load()">
          <mat-icon>filter_alt</mat-icon> Aplicar
        </button>
        <button mat-button type="button" (click)="clearFilters()">Limpiar</button>
      </form>
    </mat-card>

    <!-- Tabla -->
    <mat-card>
      <table mat-table [dataSource]="filtered()" class="full">
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
            <button mat-icon-button matTooltip="Editar producto" (click)="openEditDialog(p)">
              <mat-icon>edit</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.row-low]="row.belowMinimum"></tr>
      </table>

      @if (!filtered().length) { <p class="empty">Sin productos para los filtros aplicados.</p> }
    </mat-card>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; }
    .filters { margin-bottom: 16px; padding: 16px 16px 0; }
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .wide { min-width: 320px; flex: 1 1 320px; }
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
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  readonly columns = ['sku', 'name', 'category', 'price', 'currentStock', 'minimumStock', 'supplier', 'actions'];
  readonly categories = ['Bebidas', 'Lácteos', 'Snacks', 'Limpieza', 'Frutas', 'Granos'];

  readonly products = signal<Product[]>([]);
  readonly suppliers = signal<string[]>([]);
  readonly productQuery = signal('');

  /** Filtro de producto en cliente: coincide por SKU o por descripción. */
  readonly filtered = computed(() => {
    const q = this.productQuery().trim().toLowerCase();
    const list = this.products();
    if (!q) return list;
    return list.filter((p) =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      `${p.sku} - ${p.name}`.toLowerCase().includes(q));
  });

  readonly filterForm = this.fb.nonNullable.group({ category: '', supplier: '' });

  ngOnInit(): void { this.load(); }

  load(): void {
    const f = this.filterForm.getRawValue();
    this.productService.list({
      category: f.category || undefined,
      supplier: f.supplier || undefined
    }).subscribe((products) => {
      this.products.set(products);
      this.suppliers.set([...new Set(products.map((p) => p.supplier))].sort());
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.productQuery.set('');
    this.load();
  }

  openCreateDialog(): void {
    this.openDialog({ existingNames: this.products().map((p) => p.name) });
  }

  openEditDialog(product: Product): void {
    this.openDialog({ product, existingNames: this.products().map((p) => p.name) });
  }

  private openDialog(data: ProductFormData): void {
    this.dialog.open(ProductFormDialogComponent, { width: '520px', data })
      .afterClosed().subscribe((changed) => { if (changed) this.load(); });
  }
}
