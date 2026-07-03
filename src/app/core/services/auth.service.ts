import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthToken } from '../models/models';

const TOKEN_KEY = 'mx_token';
const EXPIRY_KEY = 'mx_token_expiry';

/** Sesión JWT: pide el token a /auth/token y lo guarda con su expiración. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  login(username: string, password: string): Observable<AuthToken> {
    return this.http
      .post<AuthToken>(`${environment.apiUrl}/auth/token`, { username, password })
      .pipe(tap((auth) => this.store(auth)));
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return this.tokenSignal();
  }

  private store(auth: AuthToken): void {
    const expiry = Date.now() + auth.expiresIn * 1000;
    sessionStorage.setItem(TOKEN_KEY, auth.accessToken);
    sessionStorage.setItem(EXPIRY_KEY, String(expiry));
    this.tokenSignal.set(auth.accessToken);
  }

  private readStoredToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0);
    if (!token || Date.now() >= expiry) return null; // expirado: se pedirá login
    return token;
  }
}
