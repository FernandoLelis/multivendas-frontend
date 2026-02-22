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
        // ✅ CORREÇÃO 2: Aplica a proporção MTD (Month-To-Date) antes de salvar no state
        this.recalcularCrescimentos(data);

        this.metricsData = data;
        this.isLoading = false;
        
        // DEBUG: Verificar cálculos
        console.log('📊 DEBUG Component - Valores recebidos:');
        console.log('  Faturamento Mês:', data.faturamento.atual);
        console.log('  Custo Efetivo Mês:', data.custoEfetivo.atual);
        console.log('  Lucro Bruto Mês:', data.lucroBruto.atual);
        console.log('  Cálculo esperado:', 
          data.faturamento.atual - data.custoEfetivo.atual);
        console.log('  Diferença:', 
          data.lucroBruto.atual - (data.faturamento.atual - data.custoEfetivo.atual));
      },
      error: (error: any) => {
        console.error('Erro ao carregar métricas:', error);
        this.error = 'Erro ao carregar dados do dashboard';
        this.isLoading = false;
      }
    });
  }

  /**
   * ✅ NOVA LÓGICA: Calcula o crescimento comparando apenas os dias transcorridos do mês
   */
  private recalcularCrescimentos(data: any): void {
    const hoje = new Date();
    const diaAtual = Math.max(1, hoje.getDate()); // O dia de hoje (ex: 15)
    // Quantidade total de dias que o mês passado teve (ex: 30 ou 31)
    const diasMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate() || 30; 

    const ajustarProporcao = (metric: any) => {
      if (!metric || metric.atual === undefined || metric.growth === undefined) return;
      
      const atual = metric.atual;
      const originalGrowth = metric.growth;

      // Se for 0 ou se o crescimento já veio -100%, ignora a matemática para não dividir por zero
      if (atual === 0 || originalGrowth <= -100) return;
      
      // 1. Engenharia reversa: descobre qual foi o valor cheio do mês passado usando o growth original
      const anteriorCompleto = atual / ((originalGrowth / 100) + 1);
      if (anteriorCompleto === 0 || isNaN(anteriorCompleto)) return;

      // 2. Descobre quanto o mês passado tinha feito ATÉ esse mesmo dia do mês
      const valorProporcionalAnterior = (anteriorCompleto / diasMesAnterior) * diaAtual;
      
      if (valorProporcionalAnterior === 0) {
        metric.growth = originalGrowth > 0 ? 100 : 0;
        return;
      }

      // 3. Substitui o growth antigo pelo crescimento justo (proporcional)
      metric.growth = ((atual / valorProporcionalAnterior) - 1) * 100;
    };

    // Aplica a regra em todos os cards
    ajustarProporcao(data.quantidadeVendas);
    ajustarProporcao(data.faturamento);
    ajustarProporcao(data.custoEfetivo);
    ajustarProporcao(data.lucroBruto);
    ajustarProporcao(data.despesasOperacionais);
    ajustarProporcao(data.lucroLiquido);
    ajustarProporcao(data.roi);
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

  formatGrowth(growth: number): { value: string, isPositive: boolean } {
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