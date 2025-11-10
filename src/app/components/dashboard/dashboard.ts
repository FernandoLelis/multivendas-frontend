import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsCardsComponent } from './components/metrics-cards/metrics-cards';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricsCardsComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  title = 'Dashboard Principal';
}