import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      return true; // ✅ USUÁRIO AUTENTICADO - PERMITIR ACESSO
    } else {
      // ❌ USUÁRIO NÃO AUTENTICADO - REDIRECIONAR PARA LOGIN
      this.router.navigate(['/login']);
      return false;
    }
  }
}