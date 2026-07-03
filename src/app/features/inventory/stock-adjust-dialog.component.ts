import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventoryMovement, Product } from '../../core/models/models';
import { ProductService } from '../../core/services/product.service';

/** RF-02: ajuste de inventario (entrada/salida) con motivo obligatorio + historial de movimientos. */
@Component({
  selector: 'app-stock-adjust-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatButtonToggleModule, MatIconModule, MatDividerModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Ajustar stock — {{ product.name }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="current">Stock actual: <strong>{{ stock() }}</strong>
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

        <div class="apply-row">
          <button mat-flat-button color="primary" type="submit"
                  [disabled]="form.invalid || saving()">Aplicar ajuste</button>
          @if (saving()) { <mat-spinner diameter="20"></mat-spinner> }
        </div>

        <mat-divider class="sep"></mat-divider>

        <!-- Historial de movimientos -->
        <h3 class="hist-title">Historial de movimientos</h3>
        @if (loadingHistory()) {
          <div class="hist-loading"><mat-spinner diameter="24"></mat-spinner></div>
        } @else if (!movements().length) {
          <p class="empty">Sin movimientos registrados.</p>
        } @else {
          <ul class="hist">
            @for (m of movements(); track m.uid) {
              <li class="mov">
                <mat-icon class="mov-ic"
                          [class.in]="m.type === 'ENTRADA'"
                          [class.out]="m.type === 'SALIDA'">
                  {{ m.type === 'ENTRADA' ? 'arrow_downward' : 'arrow_upward' }}
                </mat-icon>
                <div class="mov-main">
                  <div class="mov-line">
                    <span class="mov-qty" [class.in]="m.type === 'ENTRADA'" [class.out]="m.type === 'SALIDA'">
                      {{ m.type === 'ENTRADA' ? '+' : '-' }}{{ m.quantity }}
                    </span>
                    <span class="mov-reason">{{ m.reason }}</span>
                    <span class="mov-after">&rarr; {{ m.stockAfter }}</span>
                  </div>
                  <div class="mov-date">{{ m.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
              </li>
            }
          </ul>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="close()">Cerrar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .current { color: #555; }
    .toggle { margin-bottom: 16px; }
    .full { width: 100%; }
    .apply-row { display: flex; align-items: center; gap: 12px; }
    .sep { margin: 20px 0 12px; }
    .hist-title { font-size: 14px; font-weight: 600; margin: 0 0 8px; color: #333; }
    .hist-loading { display: flex; justify-content: center; padding: 12px; }
    .empty { color: #888; font-size: 13px; margin: 4px 0 8px; }
    .hist { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
    .mov { display: flex; gap: 10px; padding: 8px 0; border-top: 1px solid #f0f0f0; }
    .mov:first-child { border-top: none; }
    .mov-ic { font-size: 18px; height: 18px; width: 18px; margin-top: 2px; }
    .mov-ic.in { color: #2e7d32; }
    .mov-ic.out { color: #c62828; }
    .mov-main { flex: 1; min-width: 0; }
    .mov-line { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .mov-qty { font-weight: 700; }
    .mov-qty.in { color: #2e7d32; }
    .mov-qty.out { color: #c62828; }
    .mov-reason { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mov-after { color: #888; font-size: 12.5px; }
    .mov-date { color: #999; font-size: 12px; margin-top: 2px; }
  `]
})
export class StockAdjustDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly dialogRef = inject(MatDialogRef<StockAdjustDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  readonly product: Product = inject(MAT_DIALOG_DATA);

  readonly stock = signal(this.product.currentStock);
  readonly movements = signal<InventoryMovement[]>([]);
  readonly loadingHistory = signal(true);
  readonly saving = signal(false);
  /** true si se aplicó al menos un ajuste, para que la tabla se recargue al cerrar. */
  private changed = false;

  readonly form = this.fb.nonNullable.group({
    type: ['SALIDA' as 'ENTRADA' | 'SALIDA', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });

  ngOnInit(): void { this.loadHistory(); }

  private loadHistory(): void {
    this.loadingHistory.set(true);
    this.productService.movements(this.product.uid).subscribe({
      next: (movs) => { this.movements.set(movs); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false)
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    const { type, quantity, reason } = this.form.getRawValue();
    this.saving.set(true);
    this.productService.adjustStock(this.product.uid, type, quantity!, reason).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.changed = true;
        if (res?.product) this.stock.set(res.product.currentStock);
        this.form.patchValue({ quantity: null, reason: '' });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.snackBar.open('Ajuste aplicado', 'OK', { duration: 3000 });
        this.loadHistory();
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al ajustar', 'OK', { duration: 6000 });
      }
    });
  }

  close(): void { this.dialogRef.close(this.changed); }
}
