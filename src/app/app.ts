import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';
import { ModalComponent } from './components/modal/modal';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header,
    ModalComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'ERP MultiVendas';
  currentRoute = '';

  constructor(private router: Router) {
    // Monitorar mudanças de rota
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
        console.log('Rota atual:', this.currentRoute); // Para debug
      });
  }

  // 🆕 VERIFICAR SE ESTÁ NA PÁGINA DE LOGIN OU REGISTER
  isPublicPage(): boolean {
    return this.currentRoute === '/login' || this.currentRoute === '/register';
  }
}