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
    console.log('🔍 MetricsCardsComponent inicializado');
    this.loadMetricsData();
  }

  loadMetricsData(): void {
    this.isLoading = true;
    this.error = null;

    this.dashboardService.getCardsMetrics().subscribe({
      next: (data: CardMetrics) => {
        // ✅ O Service já calcula o Growth corretamente baseado nos dados reais do Java.
        // A gambiarra "recalcularCrescimentos" foi removida!
        
        this.metricsData = data;
        this.isLoading = false;
        
        // DEBUG: Verificar cálculos reais que chegaram do service
        console.log('📊 DEBUG Component - Valores recebidos:');
        console.log('  Faturamento Mês Atual:', data.faturamento.atual);
        console.log('  Crescimento Real (Growth):', data.faturamento.growth + '%');
      },
      error: (error: any) => {
        console.error('Erro ao carregar métricas:', error);
        this.error = 'Erro ao carregar dados do dashboard';
        this.isLoading = false;
      }
    });
  }

  // ✅ CORREÇÃO 1: Valores >= 1000 perdem as casas decimais para não quebrar layout
  formatCurrency(value: number): string {
    const absValue = Math.abs(value);
    const decimais = absValue >= 1000 ? 0 : 2; // Se passar de 1000, esconde os centavos

    return `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais
    })}`;
  }

  formatFaturamento(atual: number, total: number): { atual: string, total: string } {
    const atualFormatado = this.formatCurrency(atual);
    const totalFormatado = this.formatCurrency(total);
    return { atual: atualFormatado, total: totalFormatado };
  }

  formatPercentage(value: number): string {
    const formatted = value.toFixed(2).replace('.', ',');
    return `${formatted}%`;
  }

  // Formata o Growth para visualização
  formatGrowth(growth: number): { value: string, isPositive: boolean } {
    // Se o valor for "Infinity" ou erro matemático do JS, força zero
    if (!isFinite(growth) || isNaN(growth)) {
       growth = 0;
    }

    const signal = growth >= 0 ? '+' : '';
    const value = `${signal}${growth.toFixed(1)}%`;
    return {
      value: value,
      isPositive: growth >= 0
    };
  }

  refreshData(): void {
    console.log('🔄 Atualizando dados...');
    this.loadMetricsData();
  }
}