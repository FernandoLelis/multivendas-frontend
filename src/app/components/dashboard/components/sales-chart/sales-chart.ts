import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sales-chart',
  templateUrl: './sales-chart.html',
  styleUrls: ['./sales-chart.css'],
  imports: [CommonModule]
})
export class SalesChartComponent {
  timePeriods: string[] = ['Dia', 'Semana', 'Mês'];
  selectedPeriod: string = 'Dia';

  chartData: any[] = [
    { height: 40 },  // Dia 1
    { height: 65 },  // Dia 2
    { height: 25 },  // Dia 3
    { height: 50 },  // Dia 4
    { height: 30 },  // Dia 5
    { height: 70 },  // Dia 6
    { height: 45 },  // Dia 7
    { height: 60 },  // Dia 8
    { height: 35 },  // Dia 9
    { height: 55 },  // Dia 10
    { height: 40 },  // Dia 11
    { height: 75 },  // Dia 12
    { height: 50 },  // Dia 13
    { height: 65 },  // Dia 14
    { height: 30 },  // Dia 15
    { height: 45 },  // Dia 16
    { height: 80 },  // Dia 17
    { height: 55 },  // Dia 18
    { height: 35 },  // Dia 19
    { height: 60 },  // Dia 20
    { height: 40 }   // Dia 21
  ];

  selectPeriod(period: string): void {
    this.selectedPeriod = period;
    console.log('Período selecionado:', period);
  }
}