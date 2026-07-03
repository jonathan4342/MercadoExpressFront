import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="wrapper">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="logo">inventory_2</mat-icon>
            MercadoExpress
          </mat-card-title>
          <mat-card-subtitle>Sistema de Gestión de Inventario</mat-card-subtitle>
        </mat-card-header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-card-content>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Usuario</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              <mat-error>El usuario es obligatorio</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Clave</mat-label>
              <input matInput [type]="hide() ? 'password' : 'text'"
                     formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="hide.set(!hide())"
                      [attr.aria-label]="'Mostrar clave'">
                <mat-icon>{{ hide() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error>La clave es obligatoria</mat-error>
            </mat-form-field>

            @if (error()) { <p class="error">{{ error() }}</p> }
          </mat-card-content>

          <mat-card-actions>
            <button mat-flat-button color="primary" class="full" type="submit"
                    [disabled]="form.invalid || loading()">
              @if (loading()) { <mat-spinner diameter="20" class="spinner" /> }
              @else { Ingresar }
            </button>
          </mat-card-actions>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f7; }
    .card { width: 380px; padding: 8px; }
    .logo { vertical-align: -4px; margin-right: 6px; color: #3f51b5; }
    .full { width: 100%; }
    .error { color: #c62828; font-size: 13px; margin: 0 0 8px; }
    .spinner { margin: 0 auto; }
    mat-card-header { margin-bottom: 16px; }
  `]
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly hide = signal(true);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 401
          ? 'Usuario o clave incorrectos.'
          : 'No se pudo conectar con el servidor. Intenta de nuevo.');
      }
    });
  }
}
