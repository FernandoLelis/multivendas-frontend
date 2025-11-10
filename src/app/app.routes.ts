import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent),
    canActivate: [GuestGuard] // ✅ SÓ ACESSAR SE NÃO ESTIVER LOGADO
  },
  { 
    path: 'register', // 🆕 NOVA ROTA DE REGISTRO
    loadComponent: () => import('./components/register/register').then(m => m.RegisterComponent),
    canActivate: [GuestGuard] // ✅ SÓ ACESSAR SE NÃO ESTIVER LOGADO
  },
  { 
    path: '', 
    component: DashboardComponent,
    canActivate: [AuthGuard] // ✅ SÓ ACESSAR SE ESTIVER LOGADO
  },
  { 
    path: 'produtos', 
    loadComponent: () => import('./components/produto-list/produto-list').then(m => m.ProdutoList),
    canActivate: [AuthGuard]
  },
  { 
    path: 'vendas', 
    loadComponent: () => import('./components/venda-list/venda-list').then(m => m.VendaListComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'compras', 
    loadComponent: () => import('./components/compra-list/compra-list').then(m => m.ComprasComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: 'despesas', 
    loadComponent: () => import('./components/despesa-list/despesa-list').then(m => m.DespesaListComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];