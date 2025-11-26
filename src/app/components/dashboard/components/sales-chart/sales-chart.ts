import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardService, VendasPorDia } from '../../../../services/dashboard.service';
import { ChartConfiguration, Chart, registerables } from 'chart.js';

// ✅ REGISTRAR TODOS OS COMPONENTES DO CHART.JS
Chart.register(...registerables);

@Component({
  selector: 'app-sales-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './sales-chart.html',
  styleUrls: ['./sales-chart.css']
})
export class SalesChartComponent implements AfterViewInit {
  
  isLoading: boolean = true;
  errorMessage: string = '';

  // ✅ Configuração do gráfico com duas linhas
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Mês atual', // ✅ LEGENDA ATUALIZADA
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1
      },
      {
        data: [],
        label: 'Mês anterior', // ✅ LINHA DO MÊS ANTERIOR
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6b7280',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        borderDash: [5, 5] // ✅ LINHA TRACEJADA PARA DIFERENCIAR
      }
    ]
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // ✅ LEGENDA OCULTA (USAMOS A PERSONALIZADA)
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          },
          // ✅ APENAS NÚMEROS INTEIROS
          stepSize: 1,
          callback: function(value) {
            return Number.isInteger(Number(value)) ? value : '';
          }
        },
        title: {
          display: true,
          text: 'Quantidade de Vendas',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          },
          maxTicksLimit: 10
        },
        title: {
          display: true,
          text: 'Data',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  constructor(private dashboardService: DashboardService) {}

  ngAfterViewInit(): void {
    this.loadSalesData();
  }

  loadSalesData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getVendasPorDia().subscribe({
      next: (data: VendasPorDia) => {
        this.updateChartData(data);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados:', error);
        this.errorMessage = 'Erro ao carregar dados do gráfico';
        this.isLoading = false;
        this.updateChartData(this.getMockData());
      }
    });
  }

  private updateChartData(salesData: VendasPorDia): void {
    const labels = Object.keys(salesData).sort();
    const data = labels.map(label => salesData[label]);

    const formattedLabels = labels.map(label => {
      const date = new Date(label);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    this.lineChartData = {
      labels: formattedLabels,
      datasets: [
        {
          data: data,
          label: 'Mês atual',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1
        },
        // ✅ MÊS ANTERIOR VAZIO POR ENQUANTO
        {
          data: [],
          label: 'Mês anterior',
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#6b7280',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          borderDash: [5, 5]
        }
      ]
    };
  }

  private getMockData(): VendasPorDia {
    const vendas: VendasPorDia = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      vendas[dateStr] = Math.floor(Math.random() * 10) + 1;
    }
    return vendas;
  }

  refreshChart(): void {
    this.loadSalesData();
  }
}