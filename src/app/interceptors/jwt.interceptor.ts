import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

// ✅ Usando a nova abordagem com HttpInterceptorFn (mais moderna)
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Obter o token do AuthService
  const token = authService.getToken();
  
  // Clonar a requisição e adicionar o header Authorization se o token existir
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Continuar com a requisição modificada
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Tratar erros de autenticação globalmente
      if (error.status === 401) {
        // Token expirado ou inválido - fazer logout
        authService.logout();
        // Opcional: redirecionar para login
        // window.location.href = '/login';
      }
      return throwError(() => error);
    })
  );
};