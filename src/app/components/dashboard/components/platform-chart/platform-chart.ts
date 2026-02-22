import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, PlatformData } from '../../../../services/dashboard.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-platform-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-chart.html',
  styleUrl: './platform-chart.css'
})
export class PlatformChartComponent implements OnInit, OnDestroy {
  @ViewChild('pieChartCanvas') private pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  chart: Chart | null = null;
  loading: boolean = true;
  platformData: PlatformData[] = [];
  
  selectedPeriod: 'month' | 'year' = 'month'; 

  private colorMap: { [key: string]: string } = {
    'amazon': '#FF9900',
    'mercado livre': '#FFE600',
    'shopee': '#EE4D2D',
    'magalu': '#0086FF',
    'b2w': '#E60014',
    'outros': '#9E9E9E'
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadPlatformData();
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  setPeriod(period: 'month' | 'year'): void {
    if (this.selectedPeriod !== period) {
      this.selectedPeriod = period;
      this.loadPlatformData();
    }
  }

  loadPlatformData(): void {
    this.loading = true;
    
    this.dashboardService.getPlatformData(this.selectedPeriod).subscribe({
      next: (data: PlatformData[]) => {
        this.processChartData(data);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados:', error);
        this.loading = false;
      }
    });
  }

  private processChartData(rawData: PlatformData[]): void {
    const agrupado = new Map<string, number>();

    rawData.forEach(item => {
      if (item.value > 0.01) {
        const chave = item.name.trim().toLowerCase();
        const valorAtual = agrupado.get(chave) || 0;
        agrupado.set(chave, valorAtual + item.value);
      }
    });

    const labels: string[] = [];
    const values: number[] = [];
    const bgColors: string[] = [];
    let totalGeral = 0;

    agrupado.forEach((valor, chave) => {
        totalGeral += valor;
        const nomeDisplay = rawData.find(r => r.name.toLowerCase() === chave)?.name || chave.toUpperCase();
        
        labels.push(nomeDisplay);
        values.push(valor);
        bgColors.push(this.colorMap[chave] || this.gerarCorAleatoria(chave));
    });

    this.platformData = labels.map((label, i) => ({
        name: label,
        value: values[i],
        percentage: totalGeral > 0 ? parseFloat(((values[i] / totalGeral) * 100).toFixed(1)) : 0,
        color: bgColors[i]
    })).sort((a, b) => b.value - a.value);

    this.createChart(labels, values, bgColors);
  }

  private createChart(labels: string[], values: number[], colors: string[]): void {
    if (this.chart) this.chart.destroy();

    setTimeout(() => {
        if (!this.pieChartCanvas) return;
        const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
        if (ctx) {
            this.chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    // Aqui são os nomes das fatias (legenda interna)
                    labels: labels, 
                    datasets: [{
                        // Valores numéricos do gráfico
                        data: values, 
                        backgroundColor: colors,
                        borderWidth: 0,
                        hoverOffset: 4,
                        
                        // Força a desativação diretamente na fatia (Plano B)
                        datalabels: {
                            display: false,
                            color: 'transparent'
                        }
                    } as any]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        
                        // 👇 DESTRUIÇÃO DO TEXTO: Retorna vazio e zera opacidade 👇
                        datalabels: {
                            display: false,
                            opacity: 0,
                            formatter: () => { return ''; } // Obriga a escrever NADA
                        },
                        labels: {
                            display: false,
                            render: () => { return ''; } // Equivalente para o plugin 'labels'
                        },
                        // 👆 -------------------------------------------------- 👆

                        tooltip: {
                            callbacks: {
                                label: (context: any) => {
                                    const val = context.raw as number;
                                    return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                }
                            }
                        }
                    } as any
                }
            });
        }
    }, 100);
  }

  private gerarCorAleatoria(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }
}