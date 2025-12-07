import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { 
  DashboardService, 
  VendasPorDia, 
  DadosComparacaoMensal  // 🆕 IMPORTAR NOVA INTERFACE
} from '../../../../services/dashboard.service';
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
  
  // 🆕 ADICIONAR PROPRIEDADES PARA LABELS
  mesAtualLabel: string = '';
  mesAnteriorLabel: string = '';

  // ✅ Configuração do gráfico com duas linhas
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
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
      {
        data: [],
        label: 'Mês anterior',
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.05)', // 🆕 TRANSPARENTE
        fill: false, // 🆕 APENAS LINHA, SEM PREENCHIMENTO
        tension: 0.4,
        borderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6b7280',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        borderDash: [5, 5] // 🆕 LINHA TRACEJADA
      }
    ]
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
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

    // 🆕 MUDAR PARA USAR O NOVO MÉTODO DE COMPARAÇÃO
    this.dashboardService.getDadosComparacaoMensal().subscribe({
      next: (dados: DadosComparacaoMensal) => {
        this.mesAtualLabel = dados.mesAtualLabel;
        this.mesAnteriorLabel = dados.mesAnteriorLabel;
        this.updateChartData(dados.mesAtual, dados.mesAnterior);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados:', error);
        this.errorMessage = 'Erro ao carregar dados do gráfico';
        this.isLoading = false;
        // 🆕 ATUALIZAR MOCK PARA DOIS CONJUNTOS
        this.updateChartData(this.getMockData(), this.getMockDataAnterior());
      }
    });
  }

  // 🆕 MODIFICAR PARA ACEITAR DOIS CONJUNTOS DE DADOS
  private updateChartData(salesDataMesAtual: VendasPorDia, salesDataMesAnterior: VendasPorDia): void {
    // Processar mês atual
    const labelsMesAtual = Object.keys(salesDataMesAtual).sort();
    const dataMesAtual = labelsMesAtual.map(label => salesDataMesAtual[label]);
    
    // Processar mês anterior
    const labelsMesAnterior = Object.keys(salesDataMesAnterior).sort();
    const dataMesAnterior = labelsMesAnterior.map(label => salesDataMesAnterior[label]);
    
    // 🆕 USAR DATAS DO MÊS ATUAL PARA OS LABELS (evita bug de datas acumuladas)
    const formattedLabels = labelsMesAtual.map(label => {
      const date = new Date(label + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    });

    // 🆕 GARANTIR QUE OS DOIS DATASETS TENHAM O MESMO NÚMERO DE PONTOS
    const maxPoints = Math.max(dataMesAtual.length, dataMesAnterior.length);
    
    // Preencher dados faltantes com 0
    while (dataMesAtual.length < maxPoints) {
      dataMesAtual.push(0);
    }
    
    while (dataMesAnterior.length < maxPoints) {
      dataMesAnterior.push(0);
    }

    this.lineChartData = {
      labels: formattedLabels,
      datasets: [
        {
          data: dataMesAtual,
          label: this.mesAtualLabel || 'Mês atual',
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
          data: dataMesAnterior,
          label: this.mesAnteriorLabel || 'Mês anterior',
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          fill: false, // 🆕 APENAS LINHA
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

  // 🆕 MOCK PARA MÊS ATUAL
  private getMockData(): VendasPorDia {
    const vendas: VendasPorDia = {};
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Gerar dados para o mês atual (últimos 30 dias do mês atual)
    const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
    const diasParaGerar = Math.min(diasNoMes, 30); // Máximo 30 dias
    
    for (let i = 1; i <= diasParaGerar; i++) {
      const dateStr = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      vendas[dateStr] = Math.floor(Math.random() * 10) + 1;
    }
    return vendas;
  }

  // 🆕 MOCK PARA MÊS ANTERIOR
  private getMockDataAnterior(): VendasPorDia {
    const vendas: VendasPorDia = {};
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAnterior === 12 ? anoAtual - 1 : anoAtual;
    
    // Gerar dados para o mês anterior
    const diasNoMes = new Date(anoAnterior, mesAnterior, 0).getDate();
    const diasParaGerar = Math.min(diasNoMes, 30); // Máximo 30 dias
    
    for (let i = 1; i <= diasParaGerar; i++) {
      const dateStr = `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      vendas[dateStr] = Math.floor(Math.random() * 8) + 1; // 🆕 Valores menores para mês anterior
    }
    return vendas;
  }

  refreshChart(): void {
    this.loadSalesData();
  }
}