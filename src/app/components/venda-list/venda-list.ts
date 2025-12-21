import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendaService } from '../../services/venda.service';
import { VendaFormComponent } from '../venda-form/venda-form';
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Produto } from '../../models/produto';
import { Venda } from '../../models/venda';
import { ItemVenda } from '../../models/item-venda';

@Component({
  selector: 'app-venda-list',
  standalone: true,
  imports: [
    CommonModule, 
    VendaFormComponent, 
    CompraFormComponent,
    BrazilianCurrencyPipe
  ],
  templateUrl: './venda-list.html',
  styleUrls: ['./venda-list.css']
})
export class VendaListComponent implements OnInit {
  vendas: any[] = [];
  mostrarFormVenda: boolean = false;
  mostrarFormCompra: boolean = false;
  vendaSelecionada: any = null;
  produtoParaCompra: Produto | null = null;
  dadosVendaPendente: any = null;

  constructor(
    private vendaService: VendaService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarVendas();
  }

  carregarVendas(): void {
    this.vendaService.getVendas().subscribe({
      next: (vendas) => {
        // ✅ ORDENAR POR DATA - MAIS RECENTES PRIMEIRO
        const vendasOrdenadas = vendas.sort((a, b) => {
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        });
        
        // ✅ Garantir que todas as vendas tenham o campo mostrarProdutos
        this.vendas = vendasOrdenadas.map(venda => {
          const vendaCalculada = this.calcularLucroERoi(venda);
          // ✅ Adicionar propriedade para controlar exibição dos produtos
          return {
            ...vendaCalculada,
            mostrarProdutos: false
          };
        });
        
        console.log('🔍 DEBUG - Vendas ordenadas:', this.vendas);
      },
      error: (error) => {
        console.error('❌ Erro ao carregar vendas:', error);
      }
    });
  }

  // ✅ NOVO: Métodos para lidar com múltiplos itens

  // Quantidade total de TODOS os itens da venda
  getQuantidadeTotal(venda: any): number {
    if (!venda.itens || venda.itens.length === 0) return 0;
    
    return venda.itens.reduce((total: number, item: ItemVenda) => {
      return total + (item.quantidade || 0);
    }, 0);
  }

  // Número de produtos diferentes na venda
  getNumeroProdutos(venda: any): number {
    return venda.itens ? venda.itens.length : 0;
  }

  // Resumo dos produtos (ex: "Produto A, Produto B + 2 mais")
  getResumoProdutos(venda: any): string {
    if (!venda.itens || venda.itens.length === 0) {
      return 'Venda sem produtos';
    }
    
    if (venda.itens.length === 1) {
      return venda.itens[0].produtoNome || 'Produto';
    }
    
    if (venda.itens.length === 2) {
      const produto1 = venda.itens[0].produtoNome || 'Produto 1';
      const produto2 = venda.itens[1].produtoNome || 'Produto 2';
      return `${produto1} e ${produto2}`;
    }
    
    // Para 3 ou mais produtos
    const primeiroProduto = venda.itens[0].produtoNome || 'Produto';
    const outrosQuantidade = venda.itens.length - 1;
    return `${primeiroProduto} + ${outrosQuantidade} mais`;
  }

  // Alternar exibição da lista de produtos
  toggleProdutos(venda: any): void {
    venda.mostrarProdutos = !venda.mostrarProdutos;
  }

  calcularLucroERoi(venda: any): any {
    const custoProduto = venda.custoProdutoVendido || 0;
    const custoEnvio = venda.custoEnvio || 0;
    const tarifa = venda.tarifaPlataforma || 0;
    const precoVenda = venda.precoVenda || 0;
    const fretePago = venda.fretePagoPeloCliente || 0;
    const despesasOperacionais = venda.despesasOperacionais || 0;

    // ✅ FÓRMULAS CORRETAS:
    const faturamento = precoVenda + fretePago;
    const custoEfetivoTotal = custoProduto + custoEnvio + tarifa; // ✅ CUSTO PEPS + ENVIO + TARIFA
    const lucroBruto = faturamento - custoEfetivoTotal; // ✅ FATURAMENTO - CUSTO EFETIVO
    const lucroLiquido = lucroBruto - despesasOperacionais; // ✅ LUCRO BRUTO - DESPESAS
    const roi = custoEfetivoTotal > 0 ? (lucroLiquido / custoEfetivoTotal) * 100 : 0;

    console.log('🔍 DEBUG CÁLCULOS - Venda:', venda.idPedido);
    console.log('🔍 DEBUG CÁLCULOS - Faturamento:', faturamento, '(Preço:', precoVenda, '+ Frete:', fretePago, ')');
    console.log('🔍 DEBUG CÁLCULOS - Custo Efetivo:', custoEfetivoTotal, '(PEPS:', custoProduto, '+ Envio:', custoEnvio, '+ Tarifa:', tarifa, ')');
    console.log('🔍 DEBUG CÁLCULOS - Lucro Bruto:', lucroBruto);
    console.log('🔍 DEBUG CÁLCULOS - Lucro Líquido:', lucroLiquido, '(Bruto:', lucroBruto, '- Despesas:', despesasOperacionais, ')');
    console.log('🔍 DEBUG CÁLCULOS - ROI:', roi);

    return {
      ...venda,
      faturamento: parseFloat(faturamento.toFixed(2)),
      custoEfetivoTotal: parseFloat(custoEfetivoTotal.toFixed(2)),
      lucroBruto: parseFloat(lucroBruto.toFixed(2)),
      lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
      roi: parseFloat(roi.toFixed(2))
    };
  }

  formatarROI(roi: number): string {
    if (roi === undefined || roi === null) return '0,00%';
    return roi.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '%';
  }

  getPlataformaClass(plataforma: string | undefined): string {
    if (!plataforma) return 'outro';
    
    const plataformaLower = plataforma.toLowerCase();
    
    if (plataformaLower.includes('amazon')) return 'amazon';
    if (plataformaLower.includes('mercado') || plataformaLower.includes('livre')) return 'mercado-livre';
    if (plataformaLower.includes('shopee')) return 'shopee';
    
    return 'outro';
  }

  novaVenda(): void {
    this.vendaSelecionada = null;
    this.dadosVendaPendente = null;
    this.mostrarFormVenda = true;
  }

  editarVenda(venda: any): void {
    this.vendaSelecionada = venda;
    this.dadosVendaPendente = null;
    this.mostrarFormVenda = true;
  }

  detalhesVenda(venda: any): void {
    this.modalService.mostrarDetalhesVenda(venda);
  }

  excluirVenda(venda: any): void {
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a venda "${venda.idPedido}"?`,
      () => {
        if (venda.id) {
          this.vendaService.excluirVenda(venda.id).subscribe({
            next: () => {
              this.modalService.mostrarSucesso('Venda excluída com sucesso!');
              this.carregarVendas();
            },
            error: (error) => {
              console.error('❌ Erro ao excluir venda:', error);
              this.modalService.mostrarErro('Erro ao excluir venda!');
            }
          });
        }
      }
    );
  }

  fecharFormVenda(): void {
    this.mostrarFormVenda = false;
    this.vendaSelecionada = null;
    this.dadosVendaPendente = null;
  }

  abrirCompraParaProduto(produto: Produto): void {
    console.log('🔍 DEBUG - Abrindo compra para produto:', produto);
    
    this.dadosVendaPendente = {
      produto: produto,
    };
    
    this.mostrarFormVenda = false;
    this.produtoParaCompra = produto;
    this.mostrarFormCompra = true;
    
    console.log('🔍 DEBUG - Dados venda pendente:', this.dadosVendaPendente);
  }

  fecharFormCompra(): void {
    this.mostrarFormCompra = false;
    this.produtoParaCompra = null;
  }

  onCompraSalva(): void {
    console.log('✅ Compra salva - voltando para venda');
    
    this.fecharFormCompra();
    this.modalService.mostrarSucesso('Compra registrada com sucesso! Estoque atualizado. Continue com a venda.');
    
    setTimeout(() => {
      this.mostrarFormVenda = true;
      console.log('🔍 DEBUG - Voltando para formulário de venda');
    }, 800);
  }
}