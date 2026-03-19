import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';


@Component({
  selector: 'app-top-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-products.html',
  styleUrls: ['./top-products.css']
})
export class TopProductsComponent implements OnInit {
  
  topProducts: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  selectedPeriod: string = 'all'; // Filtro padrão

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadTopProducts();
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedPeriod = selectElement.value;
    console.log(`🔄 Filtro alterado para: ${this.selectedPeriod}`);
    this.loadTopProducts();
  }

  loadTopProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getProdutosMaisVendidos(5, this.selectedPeriod).subscribe({
      next: (data: any[]) => {
        if (data && data.length > 0) {
          this.topProducts = data.map(p => ({
            nome: p.nome,
            quantidadeVendida: p.quantidadeVendida,
            // Remova o fallback para assets aqui para que o HTML assuma o placeholder
            imagemUrl: p.imagemUrl, 
            precoMedioVenda: p.precoMedioVenda,
            custoMedio: p.custoMedio,
            lucroPorUnidade: p.lucroPorUnidade
          }));
        } else {
          this.topProducts = [];
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar produtos reais:', error);
        this.errorMessage = 'Não foi possível carregar os produtos.';
        this.topProducts = []; 
        this.isLoading = false;
      }
    });
  }

  calcularLucro(produto: any): number {
    return produto.lucroPorUnidade !== undefined ? produto.lucroPorUnidade : (produto.precoMedioVenda - produto.custoMedio);
  }

  formatarMoeda(valor: number | undefined): string {
    const val = valor || 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  refreshData(): void {
    this.loadTopProducts();
  }
}