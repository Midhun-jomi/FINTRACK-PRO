import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  
  // Exclude external domains or static resources if needed, but attach for all backend requests
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true // Attach cookies for CSRF or refresh tokens if using cookies
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // Refresh token rotation on 401 Unauthorized, excluding the refresh endpoint itself
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(response => {
            const retriedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.token}` }
            });
            return next(retriedReq);
          }),
          catchError(refreshError => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
