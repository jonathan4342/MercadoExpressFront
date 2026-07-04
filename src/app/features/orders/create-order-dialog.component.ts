import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../core/models/models';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';

/**
 * RF-04: creación manual de una orden de compra.
 * Selector de producto (SKU - descripción) y cantidad. La cantidad se
 * prellena con 2x el stock mínimo (Regla 2) y no puede ser menor.
 */
@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Nueva orden de compra</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="content">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Producto (SKU - descripción)</mat-label>
          <mat-select formControlName="productId">
            @for (p of products(); track p.uid) {
              <mat-option [value]="p.uid"><code>{{ p.sku }}</code> — {{ p.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Selecciona un producto</mat-error>
        </mat-form-field>

        @if (selected(); as p) {
          <p class="hint">
            Stock actual: <strong>{{ p.currentStock }}</strong> ·
            Mínimo: {{ p.minimumStock }} ·
            Proveedor: {{ p.supplier }}
          </p>
        }

        <mat-form-field appearance="outline" class="full">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" formControlName="quantity" [min]="minQuantity()" />
          @if (form.controls.quantity.hasError('min')) {
            <mat-error>La cantidad mínima es {{ minQuantity() }} (2x stock mínimo)</mat-error>
          } @else {
            <mat-error>Ingresa una cantidad válida</mat-error>
          }
          @if (minQuantity() > 0) {
            <mat-hint>Mínimo {{ minQuantity() }} unidades (2x stock mínimo)</mat-hint>
          }
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          <mat-icon>add_shopping_cart</mat-icon> Crear orden
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; padding-top: 8px; min-width: 420px; }
    .full { width: 100%; }
    .hint { margin: -4px 0 12px; color: #555; font-size: 13px; }
  `]
})
export class CreateOrderDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly dialogRef = inject(MatDialogRef<CreateOrderDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  readonly products = signal<Product[]>([]);
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(() =>
    this.products().find((p) => p.uid === this.selectedId()) ?? null);
  readonly minQuantity = computed(() => {
    const p = this.selected();
    return p ? p.minimumStock * 2 : 0;
  });

  readonly form = this.fb.nonNullable.group({
    productId: [null as string | null, Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.productService.list().subscribe((products) => this.products.set(products));

    this.form.controls.productId.valueChanges.subscribe((id) => {
      this.selectedId.set(id);
      const min = this.minQuantity();
      this.form.controls.quantity.setValidators([Validators.required, Validators.min(min)]);
      this.form.controls.quantity.setValue(min || null);
      this.form.controls.quantity.updateValueAndValidity();
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const { productId, quantity } = this.form.getRawValue();
    this.orderService.create(productId!, quantity!).subscribe({
      next: () => {
        this.snackBar.open('Orden de compra creada', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error al crear la orden', 'OK')
    });
  }
}
