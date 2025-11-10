import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      return true; // ✅ USUÁRIO NÃO LOGADO - PERMITIR ACESSO AO LOGIN
    } else {
      // ❌ USUÁRIO JÁ LOGADO - REDIRECIONAR PARA DASHBOARD
      this.router.navigate(['/dashboard']);
      return false;
    }
  }
}