import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { 
  DashboardService, 
  VendasPorDia, 
  DadosComparacaoMensal
} from '../../../../services/dashboard.service';
import { ChartConfiguration, Chart, registerables, Plugin } from 'chart.js';

// ✅ PLUGIN CUSTOMIZADO: Desenha o valor dentro de uma bolinha maior no último dia
const lastPointLabelPlugin = {
  id: 'lastPointLabel',
  afterDatasetsDraw(chart: any) {
    // Só executa se for gráfico de linha
    if (chart.config.type !== 'line') return; 

    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0]; // Índice 0 é a linha azul (Mês atual)
    const meta = chart.getDatasetMeta(0);

    if (!meta.hidden && dataset.data.length > 0) {
      // Encontrar o último índice que tenha valor (ignora os nulls do futuro)
      let lastIndex = dataset.data.length - 1;
      while (lastIndex >= 0 && dataset.data[lastIndex] === null) {
        lastIndex--;
      }

      if (lastIndex >= 0) {
        const point = meta.data[lastIndex];
        const value = dataset.data[lastIndex];

        ctx.save();
        
        // 1. Desenha uma bolinha maior para caber o número
        ctx.beginPath();
        ctx.arc(point.x, point.y, 11, 0, 2 * Math.PI); // Raio 14 (aumente se os números forem gigantes)
        ctx.fillStyle = '#3b82f6'; // Fundo azul combinando com a linha
        ctx.fill();
        
        // Bordinha branca ao redor da bolinha maior para dar destaque
        ctx.strokeStyle = '#ffffff ';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Escreve o texto centralizado dentro da bolinha
        ctx.fillStyle = '#ffffff'; // Cor do texto (Branco)
        ctx.font = 'bold 12px sans-serif'; // Fonte um pouco menor para caber bem
        ctx.textAlign = 'center'; // Alinhamento horizontal no centro
        ctx.textBaseline = 'middle'; // Alinhamento vertical no centro
        
        // Desenha o número exatamente no centro do eixo X e Y do ponto
        // O "+ 1" no point.y é um truquezinho visual para centralizar a fonte verticalmente
        ctx.fillText(`${value}`, point.x, point.y + 1); 
        
        ctx.restore();
      }
    }
  }
};

// ✅ REGISTRAR TODOS OS COMPONENTES E O PLUGIN CUSTOMIZADO
Chart.register(...registerables, lastPointLabelPlugin);

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
  
  mesAtualLabel: string = '';
  mesAnteriorLabel: string = '';

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Mês atual',
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.5,
        cubicInterpolationMode: 'monotone',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1
      },
      {
        data: [],
        label: 'Mês anterior',
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.05)',
        fill: false,
        tension: 0.5,
        cubicInterpolationMode: 'monotone',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#6b7280',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        borderDash: [5, 5]
      }
    ]
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 30,
        top: 20
      }
    },
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
        border: {
          display: false // ✅ Correção: moveu do grid para o border
        },
        grid: {
          display: false
        },
        ticks: {
          display: false
        },
        title: {
          display: true,
          text: 'Vendas Acumuladas',
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 11,
            weight: 'bold'
          }
        }
      },
      x: {
        border: {
          display: false // ✅ Correção: moveu do grid para o border
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          },
          maxTicksLimit: 10
        },
        title: {
          display: false
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
        this.updateChartData(this.getMockData(), this.getMockDataAnterior());
      }
    });
  }

  private updateChartData(salesDataMesAtual: VendasPorDia, salesDataMesAnterior: VendasPorDia): void {
    const labelsMesAtual = Object.keys(salesDataMesAtual).sort();
    const dataMesAtual = labelsMesAtual.map(label => salesDataMesAtual[label]);
    
    const labelsMesAnterior = Object.keys(salesDataMesAnterior).sort();
    const dataMesAnterior = labelsMesAnterior.map(label => salesDataMesAnterior[label]);
    
    const formattedLabels = labelsMesAtual.map(label => {
      const date = new Date(label + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    });

    const maxPoints = Math.max(dataMesAtual.length, dataMesAnterior.length);
    
    while (dataMesAtual.length < maxPoints) {
      dataMesAtual.push(null as any);
    }
    
    while (dataMesAnterior.length < maxPoints) {
      dataMesAnterior.push(null as any);
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
          tension: 0.5,
          cubicInterpolationMode: 'monotone',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1
        },
        {
          data: dataMesAnterior,
          label: this.mesAnteriorLabel || 'Mês anterior',
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.05)',
          fill: false,
          tension: 0.5,
          cubicInterpolationMode: 'monotone',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
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
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
    const diasParaGerar = Math.min(diasNoMes, 30); 
    
    let acumulado = 0;
    for (let i = 1; i <= diasParaGerar; i++) {
      const dateStr = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      acumulado += Math.floor(Math.random() * 5) + 1;
      vendas[dateStr] = acumulado;
    }
    return vendas;
  }

  private getMockDataAnterior(): VendasPorDia {
    const vendas: VendasPorDia = {};
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAnterior === 12 ? anoAtual - 1 : anoAtual;
    const diasNoMes = new Date(anoAnterior, mesAnterior, 0).getDate();
    const diasParaGerar = Math.min(diasNoMes, 30); 
    
    let acumulado = 0;
    for (let i = 1; i <= diasParaGerar; i++) {
      const dateStr = `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      acumulado += Math.floor(Math.random() * 4) + 1;
      vendas[dateStr] = acumulado;
    }
    return vendas;
  }

  refreshChart(): void {
    this.loadSalesData();
  }
}