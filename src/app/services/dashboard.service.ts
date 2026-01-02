import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces (atualizadas)
export interface PlatformRevenue {
  AMAZON: number;
  MERCADO_LIVRE: number;
  SHOPEE: number;
  [key: string]: number;
}

// ⚠️ ATUALIZADA: Mudado de 'produto' para 'produtoNome' conforme backend
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

// 🆕 Interface para quantidade de vendas
export interface QuantidadeVendas {
  mesAtual: number;
  anoAtual: number;
  variacao: number;
}

export interface CardMetrics {
  // 🆕 NOVO CARD PRIMEIRO
  quantidadeVendas: {
    atual: number;    // Vendas do mês
    total: number;    // Vendas do ano  
    growth: number;   // Variação vs mês anterior
  };
  faturamento: { 
    atual: number,    // MÊS atual
    total: number,    // ANO atual
    growth: number
  };
  custoEfetivo: { 
    atual: number,    // MÊS atual
    total: number,    // ANO atual
    growth: number
  };
  lucroBruto: {
    atual: number,    // MÊS atual
    total: number,    // ANO atual
    growth: number  
  };
  lucroLiquido: { 
    atual: number,    // MÊS atual
    total: number,    // ANO atual
    growth: number
  };
  roi: { 
    atual: number,    // ROI do MÊS
    total: number,    // ROI do ANO
    growth: number
  };
  despesasOperacionais: {
    atual: number,    // MÊS atual (DESPESAS VARIÁVEIS)
    total: number,    // ANO atual (DESPESAS VARIÁVEIS)
    growth: number
  };
}

// 🆕 Interface para vendas por dia
export interface VendasPorDia {
  [key: string]: number;
}

// 🆕 Interface para dados de comparação mensal
export interface DadosComparacaoMensal {
  mesAtual: VendasPorDia;
  mesAnterior: VendasPorDia;
  mesAtualLabel: string;
  mesAnteriorLabel: string;
}

// 🆕 Interface para produtos mais vendidos
export interface ProdutoMaisVendido {
  nome: string;
  quantidadeVendida: number;
}

// 🆕 Interface para vendas por plataforma
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

  private previousMonthData = {
    faturamento: 4500,
    custoEfetivo: 3200,
    lucroBruto: 1300,
    lucroLiquido: 850,
    despesasOperacionais: 450,
    roi: 40,
    quantidadeVendas: 7 // 🆕 ADICIONADO para cálculo de variação
  };

  constructor(private http: HttpClient) {
    // DEBUG TEMPORÁRIO
    this.debugCalculos();
  }

  // ✅ MÉTODOS EXISTENTES
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/api/vendas/dashboard`).pipe(
      catchError(error => {
        console.error('Erro ao buscar dados do dashboard:', error);
        return of(this.getMockDashboardData());
      })
    );
  }

  // ✅ MÉTODO PARA DESPESAS DO ANO ATUAL (DESPESAS VARIÁVEIS)
  getTotalDespesas(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/despesas/total-ano-atual`).pipe(
      map((total: any) => {
        return typeof total === 'object' ? total : Number(total);
      }),
      catchError(error => {
        console.error('Erro ao buscar total de despesas do ano atual:', error);
        return of(0);
      })
    );
  }

  // ✅ MÉTODO PARA DESPESAS DO MÊS ATUAL (DESPESAS VARIÁVEIS)
  getTotalDespesasMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/despesas/total-mes-atual`).pipe(
      map((total: any) => {
        return typeof total === 'object' ? total : Number(total);
      }),
      catchError(error => {
        console.error('Erro ao buscar despesas do mês atual:', error);
        return of(0);
      })
    );
  }

  // ✅ MÉTODOS PARA DADOS DO MÊS ATUAL DE VENDAS

  // Faturamento do mês atual
  getFaturamentoMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/vendas/faturamento-mes-atual`).pipe(
      catchError(error => {
        console.error('Erro ao buscar faturamento do mês atual:', error);
        return of(0);
      })
    );
  }

  // Custo efetivo do mês atual
  getCustoEfetivoMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/vendas/custo-efetivo-mes-atual`).pipe(
      catchError(error => {
        console.error('Erro ao buscar custo efetivo do mês atual:', error);
        return of(0);
      })
    );
  }

  // Lucro bruto do mês atual - ATENÇÃO: Backend corrigido agora
  getLucroBrutoMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/vendas/lucro-bruto-mes-atual`).pipe(
      catchError(error => {
        console.error('Erro ao buscar lucro bruto do mês atual:', error);
        return of(0);
      })
    );
  }

  // ⚠️ OBSERVAÇÃO: NÃO vamos usar lucroLiquidoMesAtual do backend para cálculos
  getLucroLiquidoMesAtual(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/vendas/lucro-liquido-mes-atual`).pipe(
      catchError(error => {
        console.error('Erro ao buscar lucro líquido do mês atual:', error);
        return of(0);
      })
    );
  }

  // 🆕 MÉTODO: Quantidade de vendas (mês atual, ano atual, variação)
  getQuantidadeVendas(): Observable<QuantidadeVendas> {
    return this.http.get<QuantidadeVendas>(`${this.apiUrl}/api/vendas/quantidade-vendas`).pipe(
      catchError(error => {
        console.error('Erro ao buscar quantidade de vendas:', error);
        return of({
          mesAtual: 0,
          anoAtual: 0,
          variacao: 0
        });
      })
    );
  }

  // ✅ MÉTODO ATUALIZADO: Cálculos corretos conforme fórmulas estabelecidas
  getCardsMetrics(): Observable<CardMetrics> {
    // Buscar TODOS os dados em paralelo
    return forkJoin({
      vendas: this.getDashboardData(),           // Dados anuais das vendas
      despesasMes: this.getTotalDespesasMesAtual(), // Despesas variáveis do MÊS
      despesasAno: this.getTotalDespesas(),        // Despesas variáveis do ANO
      faturamentoMes: this.getFaturamentoMesAtual(),
      custoEfetivoMes: this.getCustoEfetivoMesAtual(),
      // 🆕 ADICIONAR: quantidade de vendas
      quantidadeVendas: this.getQuantidadeVendas()
    }).pipe(
      map(({ 
        vendas, 
        despesasMes, 
        despesasAno, 
        faturamentoMes,
        custoEfetivoMes,
        quantidadeVendas // 🆕 NOVO
      }) => {
        
        console.log('🔍 DEBUG getCardsMetrics - Valores recebidos:');
        console.log('  Faturamento Mês:', faturamentoMes);
        console.log('  Custo Efetivo Mês:', custoEfetivoMes);
        console.log('  Despesas Mês:', despesasMes);
        console.log('  Quantidade Vendas Mês:', quantidadeVendas.mesAtual);
        console.log('  Quantidade Vendas Ano:', quantidadeVendas.anoAtual);
        console.log('  Variação Vendas:', quantidadeVendas.variacao);
        
        // 🎯 CÁLCULOS CONFORME FÓRMULAS ESTABELECIDAS:
        // Fórmulas: https://github.com/FernandoLelis/multivendas-backend
        
        // 1. LUCRO BRUTO MENSAL (CALCULAR NO FRONTEND - fórmula correta)
        // 📊 LUCRO BRUTO = FATURAMENTO - CUSTO EFETIVO
        const lucroBrutoMes = faturamentoMes - custoEfetivoMes;
        console.log('  Lucro Bruto Calculado:', lucroBrutoMes);
        
        // 2. LUCRO LÍQUIDO MENSAL (FÓRMULA CORRETA)
        // 💵 LUCRO LÍQUIDO = LUCRO BRUTO - DESPESAS VARIÁVEIS
        const lucroLiquidoMes = lucroBrutoMes - despesasMes;
        console.log('  Lucro Líquido Calculado:', lucroLiquidoMes);
        
        // 3. ROI MENSAL (FÓRMULA CORRETA)
        // 🎯 ROI = (LUCRO LÍQUIDO / CUSTO EFETIVO) × 100
        const roiMes = custoEfetivoMes > 0 ? 
          (lucroLiquidoMes / custoEfetivoMes) * 100 : 0;
        console.log('  ROI Mês:', roiMes);
        
        // 4. LUCRO LÍQUIDO ANUAL (FÓRMULA CORRETA)
        // 💵 LUCRO LÍQUIDO = LUCRO BRUTO - DESPESAS VARIÁVEIS
        const lucroLiquidoAno = vendas.lucroBrutoTotal - despesasAno;
        
        // 5. ROI ANUAL (FÓRMULA CORRETA)
        // 🎯 ROI = (LUCRO LÍQUIDO / CUSTO EFETIVO) × 100
        const roiAno = vendas.custoEfetivoTotal > 0 ? 
          (lucroLiquidoAno / vendas.custoEfetivoTotal) * 100 : 0;
        
        // 6. Calcular growths
        const faturamentoGrowth = this.calculateGrowth(faturamentoMes, this.previousMonthData.faturamento);
        const custoEfetivoGrowth = this.calculateGrowth(custoEfetivoMes, this.previousMonthData.custoEfetivo);
        const lucroBrutoGrowth = this.calculateGrowth(lucroBrutoMes, this.previousMonthData.lucroBruto);
        const lucroLiquidoGrowth = this.calculateGrowth(lucroLiquidoMes, this.previousMonthData.lucroLiquido);
        const despesasGrowth = this.calculateGrowth(despesasMes, this.previousMonthData.despesasOperacionais);
        const roiGrowth = this.calculateGrowth(roiMes, this.previousMonthData.roi);
        
        // 🆕 Calcular growth para quantidade de vendas
        const quantidadeVendasGrowth = quantidadeVendas.variacao || 0;
        
        // 7. Retornar métricas calculadas corretamente
        return {
          // 🆕 NOVO CARD PRIMEIRO (como você pediu)
          quantidadeVendas: {
            atual: quantidadeVendas.mesAtual || 0,
            total: quantidadeVendas.anoAtual || 0,
            growth: quantidadeVendasGrowth
          },
          faturamento: { 
            atual: faturamentoMes,           // MÊS atual
            total: vendas.faturamentoTotal,  // ANO atual
            growth: faturamentoGrowth
          },
          custoEfetivo: { 
            atual: custoEfetivoMes,           // MÊS atual
            total: vendas.custoEfetivoTotal,  // ANO atual
            growth: custoEfetivoGrowth
          },
          lucroBruto: {
            atual: lucroBrutoMes,           // MÊS atual (CALCULADO CORRETAMENTE)
            total: vendas.lucroBrutoTotal,  // ANO atual (backend corrigido)
            growth: lucroBrutoGrowth
          },
          lucroLiquido: { 
            atual: lucroLiquidoMes,           // MÊS atual
            total: lucroLiquidoAno,           // ANO atual
            growth: lucroLiquidoGrowth
          },
          despesasOperacionais: {
            atual: despesasMes,    // MÊS atual
            total: despesasAno,    // ANO atual
            growth: despesasGrowth
          },
          roi: { 
            atual: roiMes,         // ROI do MÊS
            total: roiAno,         // ROI do ANO
            growth: roiGrowth
          }
        };
      }),
      catchError(error => {
        console.error('Erro ao processar métricas dos cards:', error);
        return of(this.getMockCardsMetrics());
      })
    );
  }

  // 🆕 MÉTODO TEMPORÁRIO PARA DEBUG
  private debugCalculos(): void {
    setTimeout(() => {
      forkJoin({
        faturamento: this.getFaturamentoMesAtual(),
        custoEfetivo: this.getCustoEfetivoMesAtual(),
        lucroBrutoBackend: this.getLucroBrutoMesAtual(),
        quantidadeVendas: this.getQuantidadeVendas()
      }).subscribe(({ faturamento, custoEfetivo, lucroBrutoBackend, quantidadeVendas }) => {
        console.log('🔍 DEBUG SERVICE - Cálculos:');
        console.log('  Faturamento:', faturamento);
        console.log('  Custo Efetivo:', custoEfetivo);
        console.log('  Lucro Bruto (Backend):', lucroBrutoBackend);
        console.log('  Lucro Bruto (Calculado):', faturamento - custoEfetivo);
        console.log('  Diferença:', (faturamento - custoEfetivo) - lucroBrutoBackend);
        console.log('  Quantidade Vendas Mês:', quantidadeVendas.mesAtual);
        console.log('  Quantidade Vendas Ano:', quantidadeVendas.anoAtual);
        console.log('  Variação Vendas:', quantidadeVendas.variacao);
      });
    }, 3000);
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

  // 🆕 MÉTODO PARA VENDAS POR DIA (com filtro opcional)
  getVendasPorDia(mes?: number, ano?: number): Observable<VendasPorDia> {
    let url = `${this.apiUrl}/api/vendas/vendas-por-dia`;
    
    if (mes && ano) {
      url += `?mes=${mes}&ano=${ano}`;
    }
    
    return this.http.get<VendasPorDia>(url).pipe(
      catchError(error => {
        console.error('Erro ao buscar vendas por dia:', error);
        return of(this.getMockVendasPorDia());
      })
    );
  }

  // 🆕 MÉTODO PARA DADOS DE COMPARAÇÃO MENSAL - CORRIGIDO
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
        mesAtual,
        mesAnterior,
        mesAtualLabel: this.getNomeMes(mesAtualNumero) + ' ' + anoAtual,
        mesAnteriorLabel: this.getNomeMes(mesAnteriorNumero) + ' ' + anoAnterior
      })),
      catchError(error => {
        console.error('Erro ao buscar dados de comparação mensal:', error);
        return of({
          mesAtual: this.getMockVendasPorDia(),
          mesAnterior: this.getMockVendasPorDia(),
          mesAtualLabel: this.getNomeMes(mesAtualNumero) + ' ' + anoAtual,
          mesAnteriorLabel: this.getNomeMes(mesAnteriorNumero) + ' ' + anoAnterior
        });
      })
    );
  }

  // 🆕 MÉTODO CORRIGIDO PARA PRODUTOS MAIS VENDIDOS
  getProdutosMaisVendidos(limite: number = 5): Observable<ProdutoMaisVendido[]> {
    return this.http.get<DashboardData>(`${this.apiUrl}/api/vendas/dashboard`).pipe(
      map(dashboardData => {
        const produtos = dashboardData.produtosMaisVendidos || [];
        
        // DEBUG: Verificar estrutura dos dados
        console.log('🔍 DEBUG getProdutosMaisVendidos - Dados do backend:', produtos);
        if (produtos.length > 0) {
          console.log('🔍 DEBUG - Estrutura do primeiro item:', Object.keys(produtos[0]));
          console.log('🔍 DEBUG - Primeiro item completo:', produtos[0]);
        }
        
        // Converter para o formato esperado pelo componente
        const produtosConvertidos = produtos.slice(0, limite).map(item => {
          // O backend retorna 'produtoNome' (com N maiúsculo)
          const nomeProduto = item.produtoNome || 'Produto sem nome';
          
          return {
            nome: nomeProduto,
            quantidadeVendida: item.quantidadeVendida || 0
          };
        });
        
        console.log('🔍 DEBUG - Produtos convertidos:', produtosConvertidos);
        return produtosConvertidos;
      }),
      catchError(error => {
        console.error('Erro ao buscar produtos mais vendidos:', error);
        return of(this.getMockProdutosMaisVendidos(limite));
      })
    );
  }

  // 🆕 MÉTODO PARA VENDAS POR PLATAFORMA
  getVendasPorPlataforma(): Observable<VendasPorPlataforma[]> {
    const url = `${this.apiUrl}/api/vendas/vendas-por-plataforma`;
    return this.http.get<VendasPorPlataforma[]>(url).pipe(
      catchError(error => {
        console.error('Erro ao buscar vendas por plataforma:', error);
        return of(this.getMockVendasPorPlataforma());
      })
    );
  }

  // 🆕 MÉTODO PARA COMPARAÇÃO MENSAL (legado)
  getComparacaoMensal(): Observable<any> {
    const url = `${this.apiUrl}/api/vendas/comparacao-mensal`;
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Erro ao buscar dados de comparação mensal:', error);
        return of(this.getMockComparacaoMensal());
      })
    );
  }

  // ✅ MÉTODOS PRIVADOS EXISTENTES
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

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    const growth = ((current - previous) / previous) * 100;
    return Number(growth.toFixed(1));
  }

  // 🆕 MÉTODOS MOCK
  private getMockVendasPorDia(): VendasPorDia {
    const vendas: VendasPorDia = {};
    const hoje = new Date();
    for (let i = 29; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);
      const dataStr = data.toISOString().split('T')[0];
      vendas[dataStr] = Math.floor(Math.random() * 15) + 1;
    }
    return vendas;
  }

  private getMockProdutosMaisVendidos(limite: number): ProdutoMaisVendido[] {
    const produtos = [
      { nome: 'Smartphone XYZ', quantidadeVendida: 25 },
      { nome: 'Fone Bluetooth', quantidadeVendida: 18 },
      { nome: 'Carregador USB-C', quantidadeVendida: 15 },
      { nome: 'Tablet Android', quantidadeVendida: 12 },
      { nome: 'Smartwatch', quantidadeVendida: 10 },
      { nome: 'Cabo HDMI', quantidadeVendida: 8 },
      { nome: 'Power Bank', quantidadeVendida: 7 }
    ];
    return produtos.slice(0, limite);
  }

  private getMockVendasPorPlataforma(): VendasPorPlataforma[] {
    return [
      { plataforma: 'AMAZON', faturamento: 2800, quantidadeVendas: 18 },
      { plataforma: 'MERCADO_LIVRE', faturamento: 1300, quantidadeVendas: 12 },
      { plataforma: 'SHOPEE', faturamento: 800, quantidadeVendas: 8 }
    ];
  }

  private getMockComparacaoMensal(): any {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
    
    return {
      mesAtual: this.gerarDadosMensal(30),
      mesAnterior: this.gerarDadosMensal(30),
      mesAtualLabel: this.getNomeMes(mesAtual) + ' ' + anoAtual,
      mesAnteriorLabel: this.getNomeMes(mesAnterior) + ' ' + anoAnterior
    };
  }

  private gerarDadosMensal(dias: number): { [key: string]: number } {
    const dados: { [key: string]: number } = {};
    const hoje = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);
      const dataStr = data.toISOString().split('T')[0];
      dados[dataStr] = Math.floor(Math.random() * 12) + 1;
    }
    return dados;
  }

  private getNomeMes(mes: number): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
  }

  // ✅ MÉTODOS MOCK EXISTENTES
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
        { produtoId: 1, produtoNome: 'Smartphone XYZ', quantidadeVendida: 15, faturamento: 7500, lucroLiquido: 1200 },
        { produtoId: 2, produtoNome: 'Fone Bluetooth', quantidadeVendida: 12, faturamento: 1200, lucroLiquido: 400 },
        { produtoId: 3, produtoNome: 'Carregador USB-C', quantidadeVendida: 10, faturamento: 500, lucroLiquido: 150 }
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
      // 🆕 NOVO CARD PRIMEIRO
      quantidadeVendas: {
        atual: 8,
        total: 45,
        growth: 14.3
      },
      faturamento: { 
        atual: 580,
        total: 4900,
        growth: 8.9
      },
      custoEfetivo: { 
        atual: 380,
        total: 3200,
        growth: 0
      },
      lucroBruto: { 
        atual: 200,
        total: 1700,
        growth: 30.8
      },
      lucroLiquido: { 
        atual: 120,
        total: 890,
        growth: 4.7
      },
      despesasOperacionais: {
        atual: 80,
        total: 810,
        growth: 25.0
      },
      roi: { 
        atual: 42,
        total: 42,
        growth: 5.0
      }
    };
  }
}