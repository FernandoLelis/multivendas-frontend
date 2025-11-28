import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsCardsComponent } from './components/metrics-cards/metrics-cards';
import { SalesChartComponent } from './components/sales-chart/sales-chart';
import { TopProductsComponent } from "./components/top-products/top-products";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricsCardsComponent,
    SalesChartComponent,
    TopProductsComponent
],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  title = 'Dashboard Principal';
}