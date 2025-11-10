import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

// Interfaces
export interface PlatformRevenue {
  AMAZON: number;
  MERCADO_LIVRE: number;
  SHOPEE: number;
  [key: string]: number;
}

export interface TopProduct {
  produto: string;
  quantidadeVendida: number;
  faturamento: number;
  lucroLiquido: number;
}

export interface DashboardData {
  // ✅ CAMPOS QUE EXISTEM NO BACKEND:
  faturamentoTotal: number;
  custoEfetivoTotal: number;
  lucroBrutoTotal: number;
  lucroLiquidoTotal: number;
  despesasOperacionaisTotal: number;
  roiTotal: number;
  totalVendas: number;
  
  // ✅ CAMPOS OPCIONAIS (para compatibilidade):
  vendasMesAtual?: number;
  faturamentoPorPlataforma?: PlatformRevenue;
  produtosMaisVendidos?: TopProduct[];
}

export interface PlatformData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface CardMetrics {
  faturamento: { 
    atual: number, 
    total: number,
    growth: number
  };
  custoEfetivo: { 
    atual: number, 
    total: number,
    growth: number
  };
  lucroBruto: {
    atual: number, 
    total: number,
    growth: number  
  };
  lucroLiquido: { 
    atual: number, 
    total: number,
    growth: number
  };
  roi: { 
    atual: number, 
    total: number,
    growth: number
  };
  despesasOperacionais: {
    atual: number,
    total: number,
    growth: number
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // ✅ ENDPOINT CORRETO: DashboardController
  private apiUrl = 'http://localhost:8080';

  private platformColors: { [key: string]: string } = {
    'AMAZON': '#1E88E5',
    'MERCADO_LIVRE': '#43A047', 
    'SHOPEE': '#b388ff'
  };

  private platformNames: { [key: string]: string } = {
    'AMAZON': 'Amazon',
    'MERCADO_LIVRE': 'Mercado Livre',
    'SHOPEE': 'Shopee'
  };

  // ✅ Dados do mês anterior para cálculo de crescimento
  private previousMonthData = {
    faturamento: 4500,
    custoEfetivo: 3200,
    lucroBruto: 1300,
    lucroLiquido: 850,
    despesasOperacionais: 450,
    roi: 40
  };

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`).pipe(
      catchError(error => {
        console.error('Erro ao buscar dados do dashboard:', error);
        return of(this.getMockDashboardData());
      })
    );
  }

  getPlatformData(): Observable<PlatformData[]> {
    return this.getDashboardData().pipe(
      map(dashboardData => this.transformPlatformData(dashboardData.faturamentoPorPlataforma)),
      catchError(error => {
        console.error('Erro ao processar dados das plataformas:', error);
        return of(this.getMockPlatformData());
      })
    );
  }

  getCardsMetrics(): Observable<CardMetrics> {
    return this.getDashboardData().pipe(
      map(dashboardData => this.transformCardsMetrics(dashboardData)),
      catchError(error => {
        console.error('Erro ao processar métricas dos cards:', error);
        return of(this.getMockCardsMetrics());
      })
    );
  }

  private transformPlatformData(faturamentoMap: PlatformRevenue | undefined): PlatformData[] {
    if (!faturamentoMap) {
      return this.getMockPlatformData();
    }
    
    const entries = Object.entries(faturamentoMap);
    const total = entries.reduce((sum, [_, value]) => sum + value, 0);
    
    return entries.map(([platform, value]) => ({
      name: this.platformNames[platform] || platform,
      value: value,
      color: this.platformColors[platform] || '#b0b0b0',
      percentage: total > 0 ? (value / total) * 100 : 0
    }));
  }

  private transformCardsMetrics(dashboardData: DashboardData): CardMetrics {
    // ✅ USA DADOS REAIS DO BACKEND (com fallback para valores padrão)
    const faturamentoAtual = dashboardData.faturamentoTotal || 0;
    
    const faturamentoGrowth = this.calculateGrowth(faturamentoAtual, this.previousMonthData.faturamento);
    const custoEfetivoGrowth = this.calculateGrowth(dashboardData.custoEfetivoTotal, this.previousMonthData.custoEfetivo);
    const lucroBrutoGrowth = this.calculateGrowth(dashboardData.lucroBrutoTotal, this.previousMonthData.lucroBruto);
    const lucroLiquidoGrowth = this.calculateGrowth(dashboardData.lucroLiquidoTotal, this.previousMonthData.lucroLiquido);
    const despesasGrowth = this.calculateGrowth(dashboardData.despesasOperacionaisTotal, this.previousMonthData.despesasOperacionais);
    const roiGrowth = this.calculateGrowth(dashboardData.roiTotal, this.previousMonthData.roi);
    
    return {
      faturamento: { 
        atual: faturamentoAtual,
        total: faturamentoAtual,
        growth: faturamentoGrowth
      },
      custoEfetivo: { 
        atual: dashboardData.custoEfetivoTotal, 
        total: dashboardData.custoEfetivoTotal,
        growth: custoEfetivoGrowth
      },
      lucroBruto: {
        atual: dashboardData.lucroBrutoTotal, 
        total: dashboardData.lucroBrutoTotal,
        growth: lucroBrutoGrowth
      },
      lucroLiquido: { 
        atual: dashboardData.lucroLiquidoTotal, 
        total: dashboardData.lucroLiquidoTotal,
        growth: lucroLiquidoGrowth
      },
      despesasOperacionais: {
        atual: dashboardData.despesasOperacionaisTotal,
        total: dashboardData.despesasOperacionaisTotal,
        growth: despesasGrowth
      },
      roi: { 
        atual: dashboardData.roiTotal, 
        total: dashboardData.roiTotal,
        growth: roiGrowth
      }
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    const growth = ((current - previous) / previous) * 100;
    return Number(growth.toFixed(1));
  }

  private getMockDashboardData(): DashboardData {
    return {
      faturamentoTotal: 4900,
      custoEfetivoTotal: 3200,
      roiTotal: 42,
      lucroBrutoTotal: 1700,
      lucroLiquidoTotal: 890,
      despesasOperacionaisTotal: 810,
      totalVendas: 45,
      vendasMesAtual: 3,
      faturamentoPorPlataforma: {
        AMAZON: 2800,
        MERCADO_LIVRE: 1300,
        SHOPEE: 800
      },
      produtosMaisVendidos: [
        { produto: 'Smartphone XYZ', quantidadeVendida: 15, faturamento: 7500, lucroLiquido: 1200 },
        { produto: 'Fone Bluetooth', quantidadeVendida: 12, faturamento: 1200, lucroLiquido: 400 },
        { produto: 'Carregador USB-C', quantidadeVendida: 10, faturamento: 500, lucroLiquido: 150 }
      ]
    };
  }

  private getMockPlatformData(): PlatformData[] {
    return [
      { name: 'Amazon', value: 2800, color: '#1E88E5', percentage: 57 },
      { name: 'Mercado Livre', value: 1300, color: '#43A047', percentage: 27 },
      { name: 'Shopee', value: 800, color: '#b388ff', percentage: 16 }
    ];
  }

  private getMockCardsMetrics(): CardMetrics {
    return {
      faturamento: { 
        atual: 4900, 
        total: 4900,
        growth: 8.9
      },
      custoEfetivo: { 
        atual: 3200, 
        total: 3200,
        growth: 0
      },
      lucroBruto: { 
        atual: 1700, 
        total: 1700,
        growth: 30.8
      },
      lucroLiquido: { 
        atual: 890, 
        total: 890,
        growth: 4.7
      },
      despesasOperacionais: {
        atual: 810,
        total: 810,
        growth: 80.0
      },
      roi: { 
        atual: 42, 
        total: 42,
        growth: 5.0
      }
    };
  }
}