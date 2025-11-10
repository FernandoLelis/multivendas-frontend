import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, CardMetrics } from '../../../../services/dashboard.service';

@Component({
  selector: 'app-metrics-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-cards.html',
  styleUrls: ['./metrics-cards.css']
})
export class MetricsCardsComponent implements OnInit {
  
  metricsData: CardMetrics | null = null;
  isLoading: boolean = true;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadMetricsData();
  }

  loadMetricsData(): void {
    this.isLoading = true;
    this.error = null;

    this.dashboardService.getCardsMetrics().subscribe({
      next: (data: CardMetrics) => {
        this.metricsData = data;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar métricas:', error);
        this.error = 'Erro ao carregar dados do dashboard';
        this.isLoading = false;
      }
    });
  }

  // ✅ CORREÇÃO: Sempre mostrar valor completo em reais
  formatCurrency(value: number): string {
    return `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // ✅ CORREÇÃO: Usar formatação consistente para ambos
  formatFaturamento(atual: number, total: number): { atual: string, total: string } {
    const atualFormatado = this.formatCurrency(atual);
    const totalFormatado = this.formatCurrency(total);
    return { atual: atualFormatado, total: totalFormatado };
  }

  formatPercentage(value: number): string {
    const formatted = value.toFixed(2).replace('.', ',');
    return `${formatted}%`;
  }

  // MÉTODO: Formatar crescimento com sinal e cor
  formatGrowth(growth: number): { value: string, isPositive: boolean } {
    const signal = growth >= 0 ? '+' : '';
    const value = `${signal}${growth.toFixed(1)}%`;
    return {
      value: value,
      isPositive: growth >= 0
    };
  }

  refreshData(): void {
    this.loadMetricsData();
  }
}