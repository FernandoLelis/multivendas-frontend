import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, ProdutoMaisVendido } from '../../../../services/dashboard.service';

@Component({
  selector: 'app-top-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-products.html',
  styleUrls: ['./top-products.css']
})
export class TopProductsComponent implements OnInit {
  
  topProducts: ProdutoMaisVendido[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadTopProducts();
  }

  loadTopProducts(): void {
    console.log('🔍 DEBUG: Iniciando loadTopProducts');
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getProdutosMaisVendidos(5).subscribe({
      next: (data: ProdutoMaisVendido[]) => {
        console.log('🔍 DEBUG: Dados recebidos:', data);
        console.log('🔍 DEBUG: Primeiro produto:', data[0]);
        
        this.topProducts = data;
        this.isLoading = false;
        
        // ✅ DEBUG CSS APÓS RENDERIZAÇÃO
        setTimeout(() => {
          this.debugCSS();
        }, 200);
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar produtos:', error);
        this.errorMessage = 'Erro ao carregar dados dos produtos';
        this.isLoading = false;
        
        // ✅ DADOS MOCK DE FALLBACK
        const mockData = this.getMockData();
        console.log('🔍 DEBUG: Usando dados mock:', mockData);
        this.topProducts = mockData;
        this.isLoading = false;
        
        // ✅ DEBUG CSS COM MOCK
        setTimeout(() => {
          this.debugCSS();
        }, 200);
      }
    });
  }

  private debugCSS(): void {
    const container = document.querySelector('.top-products-container');
    const content = document.querySelector('.top-products-content');
    const list = document.querySelector('.products-list');
    const items = document.querySelectorAll('.product-item');
    
    console.log('🔍 DEBUG: Elementos CSS:', {
      container: {
        exists: !!container,
        height: container?.clientHeight,
        width: container?.clientWidth,
        display: container ? getComputedStyle(container).display : 'none',
        visibility: container ? getComputedStyle(container).visibility : 'none',
        opacity: container ? getComputedStyle(container).opacity : 'none'
      },
      content: {
        exists: !!content,
        height: content?.clientHeight,
        width: content?.clientWidth,
        display: content ? getComputedStyle(content).display : 'none'
      },
      list: {
        exists: !!list,
        height: list?.clientHeight,
        width: list?.clientWidth,
        display: list ? getComputedStyle(list).display : 'none'
      },
      items: {
        count: items.length,
        firstItem: items[0] ? {
          height: items[0].clientHeight,
          width: items[0].clientWidth,
          display: getComputedStyle(items[0]).display,
          visibility: getComputedStyle(items[0]).visibility,
          opacity: getComputedStyle(items[0]).opacity
        } : 'none'
      }
    });

    // ✅ VERIFICAR SE OS TEXTOS ESTÃO VISÍVEIS
    if (items[0]) {
      const productName = items[0].querySelector('.product-name');
      const productSales = items[0].querySelector('.product-sales');
      
      console.log('🔍 DEBUG: Textos do primeiro item:', {
        productName: {
          exists: !!productName,
          text: productName?.textContent,
          color: productName ? getComputedStyle(productName).color : 'none',
          fontSize: productName ? getComputedStyle(productName).fontSize : 'none'
        },
        productSales: {
          exists: !!productSales,
          text: productSales?.textContent,
          color: productSales ? getComputedStyle(productSales).color : 'none'
        }
      });
    }
  }

  private getMockData(): ProdutoMaisVendido[] {
    return [
      { nome: 'Smartphone XYZ', quantidadeVendida: 25 },
      { nome: 'Fone Bluetooth', quantidadeVendida: 18 },
      { nome: 'Carregador USB-C', quantidadeVendida: 15 },
      { nome: 'Tablet Android', quantidadeVendida: 12 },
      { nome: 'Smartwatch', quantidadeVendida: 10 }
    ];
  }

  refreshData(): void {
    this.loadTopProducts();
  }
}