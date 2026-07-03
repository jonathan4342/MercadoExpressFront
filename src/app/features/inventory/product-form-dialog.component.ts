import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { CatalogItem, CreateProductPayload, Product } from '../../core/models/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductService } from '../../core/services/product.service';

/** Datos que recibe el diálogo: producto a editar (opcional) y descripciones existentes. */
export interface ProductFormData {
  product?: Product;
  existingNames?: string[];
}

/**
 * RF-01: registro y edición de productos. El SKU lo genera la base de datos.
 * Los selects se cargan desde /categories y /suppliers y envían IDs.
 * No se permiten productos con descripción (nombre) duplicada — se valida en el
 * cliente (contra la lista cargada) y en el backend (autoridad final).
 */
@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar producto' : 'Nuevo producto' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Descripción</mat-label>
          <input matInput formControlName="name" />
          @if (form.controls.name.hasError('duplicate')) {
            <mat-error>Ya existe un producto con esa descripción</mat-error>
          } @else {
            <mat-error>Entre 3 y 100 caracteres</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoryId">
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Selecciona una categoría</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="supplierId">
            @for (s of suppliers(); track s.id) {
              <mat-option [value]="s.id">{{ s.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Selecciona un proveedor</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Precio</mat-label>
          <input matInput type="number" formControlName="price" min="1" />
          <mat-error>Debe ser mayor a 0</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Stock inicial</mat-label>
          <input matInput type="number" formControlName="currentStock" min="0" />
          @if (isEdit) { <mat-hint>El stock se ajusta desde inventario</mat-hint> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Stock mínimo (umbral de alerta)</mat-label>
          <input matInput type="number" formControlName="minimumStock" min="1" />
          <mat-error>Debe ser mayor a 0</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; padding-top: 8px; }
    .full { grid-column: 1 / -1; }
  `]
})
export class ProductFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly catalogService = inject(CatalogService);
  private readonly dialogRef = inject(MatDialogRef<ProductFormDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<ProductFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly categories = signal<CatalogItem[]>([]);
  readonly suppliers = signal<CatalogItem[]>([]);

  readonly isEdit = !!this.data.product;
  /** Descripciones existentes (en minúsculas) para el chequeo de duplicados, excluida la propia. */
  private readonly takenNames = new Set(
    (this.data.existingNames ?? [])
      .map((n) => n.trim().toLowerCase())
      .filter((n) => n !== this.data.product?.name.trim().toLowerCase())
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    categoryId: [null as number | null, Validators.required],
    supplierId: [null as number | null, Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currentStock: [0, [Validators.required, Validators.min(0)]],
    minimumStock: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    forkJoin({
      categories: this.catalogService.categories(),
      suppliers: this.catalogService.suppliers()
    }).subscribe(({ categories, suppliers }) => {
      this.categories.set(categories);
      this.suppliers.set(suppliers);
    });

    const p = this.data.product;
    if (p) {
      this.form.patchValue({
        name: p.name, categoryId: p.categoryId, supplierId: p.supplierId,
        price: p.price, currentStock: p.currentStock, minimumStock: p.minimumStock
      });
      this.form.controls.currentStock.disable(); // el stock se gestiona por ajustes (RF-02)
    }

    // Marca la descripción como duplicada en vivo.
    this.form.controls.name.valueChanges.subscribe((value) => {
      const exists = this.takenNames.has((value ?? '').trim().toLowerCase());
      const ctrl = this.form.controls.name;
      const errors = { ...(ctrl.errors ?? {}) };
      if (exists) errors['duplicate'] = true; else delete errors['duplicate'];
      ctrl.setErrors(Object.keys(errors).length ? errors : null);
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload: CreateProductPayload = {
      name: v.name,
      categoryId: +v.categoryId!,
      supplierId: +v.supplierId!,
      price: v.price!,
      currentStock: v.currentStock,
      minimumStock: v.minimumStock!
    };

    const request$ = this.isEdit
      ? this.productService.update(this.data.product!.uid, payload)
      : this.productService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Producto actualizado' : 'Producto creado', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => this.snackBar.open(
        err.error?.message ?? `Error al ${this.isEdit ? 'actualizar' : 'crear'} el producto`, 'OK')
    });
  }
}
