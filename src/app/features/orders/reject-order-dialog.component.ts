import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** RF-05: motivo de rechazo obligatorio, mínimo 10 caracteres. */
@Component({
  selector: 'app-reject-order-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Rechazar orden</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Motivo del rechazo</mat-label>
        <textarea matInput [formControl]="reason" rows="3"
                  placeholder="Mínimo 10 caracteres"></textarea>
        <mat-error>El motivo es obligatorio (mínimo 10 caracteres)</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" [disabled]="reason.invalid"
              (click)="dialogRef.close(reason.value)">Rechazar</button>
    </mat-dialog-actions>
  `,
  styles: [`.full { width: 100%; }`]
})
export class RejectOrderDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RejectOrderDialogComponent>);
  readonly reason = new FormControl('', { nonNullable: true,
    validators: [Validators.required, Validators.minLength(10)] });
}
