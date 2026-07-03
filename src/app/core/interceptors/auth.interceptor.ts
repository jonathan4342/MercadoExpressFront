import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta 'Authorization: Bearer <token>' a toda petición hacia la API
 * (excepto al propio login) y, si el backend responde 401, cierra la
 * sesión y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.includes('/auth/token');

  const request = isApiRequest && !isLogin && auth.token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLogin) {
        auth.logout(); // token vencido o inválido → volver al login
      }
      return throwError(() => error);
    })
  );
};
