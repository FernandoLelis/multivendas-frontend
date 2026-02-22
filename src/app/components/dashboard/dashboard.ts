import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// ✅ IMPORTAR OS COMPONENTES FILHOS
import { MetricsCardsComponent } from './components/metrics-cards/metrics-cards';
import { SalesChartComponent } from './components/sales-chart/sales-chart';
import { TopProductsComponent } from "./components/top-products/top-products";
// 👇 Importe o PlatformChartComponent (ajuste o caminho se necessário)
import { PlatformChartComponent } from './components/platform-chart/platform-chart'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricsCardsComponent,
    SalesChartComponent,
    TopProductsComponent,
    PlatformChartComponent // 👈 ADICIONE AQUI NO ARRAY DE IMPORTS
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'] // Nota: é styleUrls (plural) ou styleUrl (singular no Angular 17+), verifique qual sua versão aceita melhor
})
export class DashboardComponent {
  title = 'Dashboard Principal';
}