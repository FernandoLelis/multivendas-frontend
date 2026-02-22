import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { 
  DashboardService, 
  VendasPorDia, 
  DadosComparacaoMensal
} from '../../../../services/dashboard.service';
import { ChartConfiguration, Chart, registerables } from 'chart.js';

// ✅ PLUGIN CUSTOMIZADO: Bolinhas coloridas (verde/vermelho) com sombra suave e texto branco
const conditionalPointsPlugin = {
  id: 'conditionalPoints',
  afterDatasetsDraw(chart: any) {
    if (chart.config.type !== 'line') return; 

    const ctx = chart.ctx;
    const datasetAtual = chart.data.datasets[0];    // Mês atual
    const datasetAnterior = chart.data.datasets[1]; // Mês anterior
    const metaAtual = chart.getDatasetMeta(0);

    if (!metaAtual.hidden && datasetAtual.data.length > 0) {
      
      // Descobre qual é o índice do último dia com dados
      let lastIndex = datasetAtual.data.length - 1;
      while (lastIndex >= 0 && (datasetAtual.data[lastIndex] === null || datasetAtual.data[lastIndex] === undefined)) {
        lastIndex--;
      }

      ctx.save();

      for (let i = 0; i < datasetAtual.data.length; i++) {
        const valorAtual = datasetAtual.data[i];
        
        // Ignora dias futuros vazios
        if (valorAtual === null || valorAtual === undefined) continue;

        const point = metaAtual.data[i];
        const valorAnterior = (datasetAnterior.data[i] !== null && datasetAnterior.data[i] !== undefined) ? datasetAnterior.data[i] : 0;

        // Lógica de tamanhos e cores
        const isLast = (i === lastIndex);
        const isPositive = valorAtual >= valorAnterior;
        
        // Volta a cor da bolinha para verde/vermelho
        const corFundoBolinha = isPositive ? '#7df525' : '#E53935'; 
        const corTexto = '#00305C'; // Texto sempre branco para contraste
        
        const raio = isLast ? 12 : 10;
        const fontSize = isLast ? 11 : 10;

        // Bordinha branca ao redor
        ctx.strokeStyle = '#00305C';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 1. Configura a Sombra Suave (Box-Shadow no Canvas)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; // Cor da sombra (preto translúcido)
        ctx.shadowBlur = 6;       // O quão "esfumaçada" é a sombra
        ctx.shadowOffsetX = 0;    // Deslocamento horizontal
        ctx.shadowOffsetY = 3;    // Deslocamento vertical (para baixo)

        // 2. Desenha a bolinha preenchida
        ctx.beginPath();
        ctx.arc(point.x, point.y, raio, 0, 2 * Math.PI); 
        ctx.fillStyle = corFundoBolinha; 
        ctx.fill();
        
        // --- IMPORTANTE: Limpa a sombra para não afetar o texto a seguir ---
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        // ------------------------------------------------------------------

        // 3. Escreve o texto centralizado (branco)
        ctx.fillStyle = corTexto; 
        ctx.font = `600 ${fontSize}px sans-serif`; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle'; 
        
        ctx.fillText(`${valorAtual}`, point.x, point.y + 1); 
      }
      
      ctx.restore();
    }
  }
};

// ✅ REGISTRAR TODOS OS COMPONENTES E O PLUGIN CUSTOMIZADO
Chart.register(...registerables, conditionalPointsPlugin);

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
    datasets: []
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
          display: false
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
          display: false
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
          pointRadius: 0,
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