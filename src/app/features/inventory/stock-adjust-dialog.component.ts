import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../core/models/models';
import { ProductService } from '../../core/services/product.service';

/** RF-02: ajuste de inventario (entrada/salida) con motivo obligatorio. */
@Component({
  selector: 'app-stock-adjust-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Ajustar stock — {{ product.name }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="current">Stock actual: <strong>{{ product.currentStock }}</strong>
           · Mínimo: {{ product.minimumStock }}</p>

        <mat-button-toggle-group formControlName="type" class="toggle">
          <mat-button-toggle value="ENTRADA"><mat-icon>arrow_downward</mat-icon> Entrada</mat-button-toggle>
          <mat-button-toggle value="SALIDA"><mat-icon>arrow_upward</mat-icon> Salida</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" formControlName="quantity" min="1" />
          <mat-error>Entero mayor a 0</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Motivo</mat-label>
          <input matInput formControlName="reason" placeholder="Venta, reposición, merma..." />
          <mat-error>El motivo es obligatorio</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Aplicar ajuste</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .current { color: #555; }
    .toggle { margin-bottom: 16px; }
    .full { width: 100%; }
  `]
})
export class StockAdjustDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly dialogRef = inject(MatDialogRef<StockAdjustDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  readonly product: Product = inject(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    type: ['SALIDA' as 'ENTRADA' | 'SALIDA', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });

  save(): void {
    if (this.form.invalid) return;
    const { type, quantity, reason } = this.form.getRawValue();
    this.productService.adjustStock(this.product.id, type, quantity!, reason).subscribe({
      next: () => { this.snackBar.open('Ajuste aplicado', 'OK', { duration: 3000 }); this.dialogRef.close(true); },
      // Regla 1: la API responde 422 con el faltante exacto
      error: (err) => this.snackBar.open(err.error?.message ?? 'Error al ajustar', 'OK', { duration: 6000 })
    });
  }
}
