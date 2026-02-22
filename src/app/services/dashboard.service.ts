import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlatformRevenue {
  AMAZON: number;
  MERCADO_LIVRE: number;
  SHOPEE: number;
  [key: string]: number;
}

export interface TopProduct {
  produtoId: number;
  produtoNome: string;
  quantidadeVendida: number;
  faturamento: number;
  lucroLiquido: number;
}

export interface DashboardData {
  faturamentoTotal: number;
  custoEfetivoTotal: number;
  lucroBrutoTotal: number;
  lucroLiquidoTotal: number;
  despesasOperacionaisTotal: number;
  roiTotal: number;
  totalVendas: number;
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

export interface QuantidadeVendas {
  mesAtual: number;
  anoAtual: number;
  variacao: number;
}

export interface CardMetrics {
  quantidadeVendas: { atual: number; total: number; growth: number; };
  faturamento: { atual: number, total: number, growth: number };
  custoEfetivo: { atual: number, total: number, growth: number };
  lucroBruto: { atual: number, total: number, growth: number };
  lucroLiquido: { atual: number, total: number, growth: number };
  roi: { atual: number, total: number, growth: number };
  despesasOperacionais: { atual: number, total: number, growth: number };
}

export interface VendasPorDia { [key: string]: number; }

export interface DadosComparacaoMensal {
  mesAtual: VendasPorDia;
  mesAnterior: VendasPorDia;
  mesAtualLabel: string;
  mesAnteriorLabel: string;
}

export interface ProdutoMaisVendido {
  nome: string;
  quantidadeVendida: number;
}

export interface VendasPorPlataforma {
  plataforma: string;
  faturamento: number;
  quantidadeVendas: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

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

  // Mock para cálculos de crescimento (previous month)
  private previousMonthData = {
    faturamento: 4500,
    custoEfetivo: 3200,
    lucroBruto: 1300,
    lucroLiquido: 850,
    despesasOperacionais: 450,
    roi: 40,
    quantidadeVendas: 7
  };

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/api/vendas/dashboard`).pipe(
      catchError(error => {
        console.error('Erro ao buscar dados do dashboard:', error);
        return of(this.getMockDashboardData());
      })
    );
  }

  getTotalDespesas(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/despesas/total-ano-atual`).pipe(
      map((total: any) => typeof total === 'object' ? total : Number(total)),
      catchError(() => of(0))
    );
  }

  getTotalDespesasMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/despesas/total-mes-atual`).pipe(
      map((total: any) => typeof total === 'object' ? total : Number(total)),
      catchError(() => of(0))
    );
  }

  // --- MÉTODOS SIMPLES DE DADOS ---
  getFaturamentoMesAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/faturamento-mes-atual`).pipe(catchError(() => of(0))); }
  getCustoEfetivoMesAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/custo-efetivo-mes-atual`).pipe(catchError(() => of(0))); }
  getLucroBrutoMesAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/lucro-bruto-mes-atual`).pipe(catchError(() => of(0))); }
  getLucroLiquidoMesAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/lucro-liquido-mes-atual`).pipe(catchError(() => of(0))); }
  
  getQuantidadeVendas(): Observable<QuantidadeVendas> {
    return this.http.get<QuantidadeVendas>(`${this.apiUrl}/api/vendas/quantidade-vendas`).pipe(
      catchError(() => of({ mesAtual: 0, anoAtual: 0, variacao: 0 }))
    );
  }

  getFaturamentoAnoAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/faturamento-ano-atual`).pipe(catchError(() => of(0))); }
  getCustoEfetivoAnoAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/custo-efetivo-ano-atual`).pipe(catchError(() => of(0))); }
  getLucroBrutoAnoAtual(): Observable<number> { return this.http.get<number>(`${this.apiUrl}/api/vendas/lucro-bruto-ano-atual`).pipe(catchError(() => of(0))); }

  // --- CARDS METRICS (AGREGADO) ---
  getCardsMetrics(): Observable<CardMetrics> {
    return forkJoin({
      faturamentoAno: this.getFaturamentoAnoAtual(),
      custoEfetivoAno: this.getCustoEfetivoAnoAtual(),
      lucroBrutoAno: this.getLucroBrutoAnoAtual(),
      despesasMes: this.getTotalDespesasMesAtual(),
      despesasAno: this.getTotalDespesas(),
      faturamentoMes: this.getFaturamentoMesAtual(),
      custoEfetivoMes: this.getCustoEfetivoMesAtual(),
      quantidadeVendas: this.getQuantidadeVendas()
    }).pipe(
      map(({ faturamentoAno, custoEfetivoAno, lucroBrutoAno, despesasMes, despesasAno, faturamentoMes, custoEfetivoMes, quantidadeVendas }) => {
        
        // Cálculos no Frontend para garantir consistência
        const lucroBrutoMes = faturamentoMes - custoEfetivoMes;
        const lucroLiquidoMes = lucroBrutoMes - despesasMes;
        const roiMes = custoEfetivoMes > 0 ? (lucroLiquidoMes / custoEfetivoMes) * 100 : 0;
        
        const lucroLiquidoAno = lucroBrutoAno - despesasAno;
        const roiAno = custoEfetivoAno > 0 ? (lucroLiquidoAno / custoEfetivoAno) * 100 : 0;
        
        return {
          quantidadeVendas: {
            atual: quantidadeVendas.mesAtual || 0,
            total: quantidadeVendas.anoAtual || 0,
            growth: quantidadeVendas.variacao || 0
          },
          faturamento: { 
            atual: faturamentoMes, total: faturamentoAno, 
            growth: this.calculateGrowth(faturamentoMes, this.previousMonthData.faturamento)
          },
          custoEfetivo: { 
            atual: custoEfetivoMes, total: custoEfetivoAno, 
            growth: this.calculateGrowth(custoEfetivoMes, this.previousMonthData.custoEfetivo)
          },
          lucroBruto: {
            atual: lucroBrutoMes, total: lucroBrutoAno,
            growth: this.calculateGrowth(lucroBrutoMes, this.previousMonthData.lucroBruto)
          },
          lucroLiquido: { 
            atual: lucroLiquidoMes, total: lucroLiquidoAno,
            growth: this.calculateGrowth(lucroLiquidoMes, this.previousMonthData.lucroLiquido)
          },
          despesasOperacionais: {
            atual: despesasMes, total: despesasAno,
            growth: this.calculateGrowth(despesasMes, this.previousMonthData.despesasOperacionais)
          },
          roi: { 
            atual: roiMes, total: roiAno,
            growth: this.calculateGrowth(roiMes, this.previousMonthData.roi)
          }
        };
      }),
      catchError(error => {
        console.error('Erro Metrics:', error);
        return of(this.getMockCardsMetrics());
      })
    );
  }

  // ✅ CORREÇÃO AQUI: Adicionado parâmetro 'period'
  getPlatformData(period: 'month' | 'year' = 'month'): Observable<PlatformData[]> {
    // Agora chama o endpoint específico do DashboardController que criamos
    return this.http.get<any[]>(`${this.apiUrl}/api/dashboard/platform-data?period=${period}`).pipe(
      map(rawData => {
        // Mapeia o retorno {name: "...", value: ...} para PlatformData
        const total = rawData.reduce((acc, item) => acc + item.value, 0);
        return rawData.map(item => ({
            name: this.platformNames[item.name.toUpperCase()] || item.name,
            value: item.value,
            color: this.platformColors[item.name.toUpperCase()] || this.gerarCorAleatoria(item.name),
            percentage: total > 0 ? (item.value / total) * 100 : 0
        }));
      }),
      catchError(error => {
        console.error('Erro PlatformData:', error);
        return of(this.getMockPlatformData());
      })
    );
  }

  getVendasPorDia(mes?: number, ano?: number): Observable<VendasPorDia> {
    let url = `${this.apiUrl}/api/vendas/vendas-por-dia`;
    if (mes && ano) url += `?mes=${mes}&ano=${ano}`;
    return this.http.get<VendasPorDia>(url).pipe(catchError(() => of(this.getMockVendasPorDia())));
  }

  getDadosComparacaoMensal(): Observable<DadosComparacaoMensal> {
    const agora = new Date();
    const mesAtualNumero = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    const mesAnteriorNumero = mesAtualNumero === 1 ? 12 : mesAtualNumero - 1;
    const anoAnterior = mesAnteriorNumero === 12 ? anoAtual - 1 : anoAtual;

    return forkJoin({
      mesAtual: this.getVendasPorDia(mesAtualNumero, anoAtual),
      mesAnterior: this.getVendasPorDia(mesAnteriorNumero, anoAnterior)
    }).pipe(
      map(({ mesAtual, mesAnterior }) => ({
        mesAtual, mesAnterior,
        mesAtualLabel: this.getNomeMes(mesAtualNumero) + ' ' + anoAtual,
        mesAnteriorLabel: this.getNomeMes(mesAnteriorNumero) + ' ' + anoAnterior
      })),
      catchError(() => of({
          mesAtual: this.getMockVendasPorDia(),
          mesAnterior: this.getMockVendasPorDia(),
          mesAtualLabel: 'Atual', mesAnteriorLabel: 'Anterior'
      }))
    );
  }

  getProdutosMaisVendidos(limite: number = 5): Observable<ProdutoMaisVendido[]> {
    return this.http.get<DashboardData>(`${this.apiUrl}/api/vendas/dashboard`).pipe(
      map(dashboardData => {
        const produtos = dashboardData.produtosMaisVendidos || [];
        return produtos.slice(0, limite).map(item => ({
          nome: item.produtoNome || 'Produto sem nome',
          quantidadeVendida: item.quantidadeVendida || 0
        }));
      }),
      catchError(() => of(this.getMockProdutosMaisVendidos(limite)))
    );
  }

  // --- UTILITÁRIOS E MOCKS ---
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private gerarCorAleatoria(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  private getNomeMes(mes: number): string {
    return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mes - 1];
  }

  private getMockDashboardData(): DashboardData {
    return {
      faturamentoTotal: 4900, custoEfetivoTotal: 3200, roiTotal: 42,
      lucroBrutoTotal: 1700, lucroLiquidoTotal: 890, despesasOperacionaisTotal: 810,
      totalVendas: 45, vendasMesAtual: 3,
      faturamentoPorPlataforma: { AMAZON: 2800, MERCADO_LIVRE: 1300, SHOPEE: 800 }
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
      quantidadeVendas: { atual: 8, total: 45, growth: 14.3 },
      faturamento: { atual: 580, total: 2500, growth: 8.9 },
      custoEfetivo: { atual: 380, total: 1800, growth: 0 },
      lucroBruto: { atual: 200, total: 700, growth: 30.8 },
      lucroLiquido: { atual: 120, total: 450, growth: 4.7 },
      despesasOperacionais: { atual: 80, total: 250, growth: 25.0 },
      roi: { atual: 42, total: 25, growth: 5.0 }
    };
  }
  private getMockVendasPorDia(): VendasPorDia { return {}; }
  private getMockProdutosMaisVendidos(limite: number): ProdutoMaisVendido[] { return []; }
}