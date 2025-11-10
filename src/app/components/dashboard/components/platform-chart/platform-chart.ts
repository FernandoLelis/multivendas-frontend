import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, PlatformData } from '../../../../services/dashboard.service';

@Component({
  selector: 'app-platform-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-chart.html',
  styleUrl: './platform-chart.css'
})
export class PlatformChartComponent implements OnInit {
  platformData: PlatformData[] = [];
  loading: boolean = true;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadPlatformData();
  }

  loadPlatformData(): void {
    this.dashboardService.getPlatformData().subscribe({
      next: (data: PlatformData[]) => {
        this.platformData = data;
        this.loading = false;
        console.log('Dados das plataformas carregados:', data);
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados das plataformas:', error);
        this.loading = false;
        // Fallback para dados mock em caso de erro
        this.platformData = [
          { name: 'Amazon', value: 1300, color: '#ff9800', percentage: 54.2 },
          { name: 'Mercado Livre', value: 860, color: '#2196f3', percentage: 35.8 },
          { name: 'Shopee', value: 240, color: '#b388ff', percentage: 10.0 }
        ];
      }
    });
  }

  // Método para calcular o stroke-dasharray do SVG
  calculateDashArray(percentage: number): string {
    const circumference = 377; // 2 * π * 60 (raio)
    const dash = (percentage / 100) * circumference;
    const gap = circumference - dash;
    return `${dash} ${gap}`;
  }

  // Método para calcular a rotação de cada fatia
  calculateRotation(index: number): number {
    if (this.platformData.length === 0) return -90;
    
    let rotation = -90; // Começa no topo (-90 graus)
    for (let i = 0; i < index; i++) {
      rotation += (this.platformData[i]?.percentage || 0) * 3.6; // 3.6 = 360/100
    }
    return rotation;
  }

  // Método para retornar a porcentagem total (sempre 100%)
  getTotalPercentage(): number {
    return 100;
  }

  // Método para calcular o caminho SVG de cada fatia da pizza
  calculateSlicePath(percentage: number, index: number): string {
    const centerX = 70;
    const centerY = 70;
    const radius = 60;
    
    // Calcular ângulos
    let startAngle = -90; // Começa no topo
    for (let i = 0; i < index; i++) {
      startAngle += (this.platformData[i]?.percentage || 0) * 3.6;
    }
    const endAngle = startAngle + (percentage * 3.6);
    
    // Converter para radianos
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Calcular pontos
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    // Criar comando de arco
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  // Método para criar o gráfico de pizza com conic-gradient
  getPieChartBackground(): string {
    console.log('Método getPieChartBackground chamado!', this.platformData);
    if (this.platformData.length === 0) return '';
    
    let gradient = 'conic-gradient(';
    let currentAngle = 0;
    
    this.platformData.forEach((platform, index) => {
      const percentage = platform.percentage;
      if (index > 0) gradient += ', ';
      gradient += `${platform.color} ${currentAngle}deg ${currentAngle + percentage}deg`;
      currentAngle += percentage;
    });
    
    gradient += ')';
    console.log('Gradient gerado:', gradient);
    return gradient;
  }
}