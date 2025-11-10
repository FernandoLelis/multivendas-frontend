import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // ← ADICIONAR IMPORT

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html', 
  styleUrls: ['./header.css']
})
export class Header {
  isMenuOpen = false;

  constructor(
    private router: Router,
    public authService: AuthService // ← INJETAR AUTH SERVICE
  ) {}

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen; // ← CORRIGIDO: isMenuOpen
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  navegarPara(rota: string): void {
    this.router.navigate([rota]);
    this.closeMenu();
  }

  // 🆕 MÉTODO LOGOUT
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeMenu();
  }

  // Fechar menu ao pressionar ESC - CORREÇÃO DO TIPO
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeMenu();
    }
  }

  // Fechar menu ao redimensionar para desktop - CORREÇÃO DO TIPO
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    const window = event.target as Window;
    if (window.innerWidth > 1024) {
      this.closeMenu();
    }
  }
}