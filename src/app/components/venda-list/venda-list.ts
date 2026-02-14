import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendaService } from '../../services/venda.service';
import { VendaFormComponent } from '../venda-form/venda-form';
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Produto } from '../../models/produto';

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
  produtoParaCompra: any = null; // Alterado para any para evitar conflitos de tipo se o componente compra esperar algo específico

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
        this.vendas = (vendas || [])
          .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
          .map((venda: any) => ({
            ...this.calcularLucroERoi(venda),
            mostrarProdutos: false
          }));
      },
      error: (error) => console.error('❌ Erro ao carregar vendas:', error)
    });
  }

  getItensAgrupados(venda: any): any[] {
    if (!venda.itens || !Array.isArray(venda.itens) || venda.itens.length === 0) return [];
    const agrupados = new Map();

    venda.itens.forEach((item: any) => {
      const id = item.produtoId || item.produto?.id || 'id-desconhecido';
      const nome = item.produtoNome || item.produto?.nome || item.nome || `Produto #${id}`;

      if (!agrupados.has(id)) {
        agrupados.set(id, { nome: nome, quantidade: 0, custoTotal: 0 });
      }

      const p = agrupados.get(id);
      p.quantidade += (item.quantidade || 0);
      p.custoTotal += ((item.custoUnitario || 0) * (item.quantidade || 0));
    });

    return Array.from(agrupados.values()).map(p => ({
      ...p,
      custoMedio: p.quantidade > 0 ? p.custoTotal / p.quantidade : 0
    }));
  }

  getResumoProdutos(venda: any): string {
    const itens = this.getItensAgrupados(venda);
    if (itens.length === 0) return 'Venda sem produtos';
    if (itens.length === 1) return `${itens[0].nome} (${itens[0].quantidade} un)`;
    return `${itens[0].nome} + ${itens.length - 1} outros`;
  }

  getNumeroProdutos(venda: any): number {
    return this.getItensAgrupados(venda).length;
  }

  calcularLucroERoi(venda: any): any {
    const custoProduto = Number(venda.custoProdutoVendido || 0);
    const custoEnvio = Number(venda.custoEnvio || 0);
    const tarifa = Number(venda.tarifaPlataforma || 0);
    const precoVenda = Number(venda.precoVenda || 0);
    const fretePago = Number(venda.fretePagoPeloCliente || 0);
    const despesasOperacionais = Number(venda.despesasOperacionais || 0);

    const faturamento = precoVenda + fretePago;
    const custoEfetivoTotal = custoProduto + custoEnvio + tarifa;
    const lucroLiquido = (faturamento - custoEfetivoTotal) - despesasOperacionais;
    const roi = custoEfetivoTotal > 0 ? (lucroLiquido / custoEfetivoTotal) * 100 : 0;

    return { ...venda, custoEfetivoTotal, lucroLiquido, roi };
  }

  formatarROI(roi: number): string {
    return (roi || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  getPlataformaClass(plataforma: string): string {
    const p = (plataforma || '').toLowerCase();
    if (p.includes('amazon')) return 'amazon';
    if (p.includes('mercado')) return 'mercado-livre';
    if (p.includes('shopee')) return 'shopee';
    return 'outro';
  }

  novaVenda() { this.vendaSelecionada = null; this.mostrarFormVenda = true; }
  editarVenda(venda: any) { this.vendaSelecionada = venda; this.mostrarFormVenda = true; }
  detalhesVenda(venda: any) { this.modalService.mostrarDetalhesVenda(venda); }
  
  excluirVenda(venda: any) {
    this.modalService.confirmarExclusao(`Excluir pedido ${venda.idPedido}?`, () => {
      this.vendaService.excluirVenda(venda.id).subscribe(() => {
        this.modalService.mostrarSucesso('Excluído!');
        this.carregarVendas();
      });
    });
  }

  toggleProdutos(venda: any): void {
    venda.mostrarProdutos = !venda.mostrarProdutos;
  }

  fecharFormVenda() { this.mostrarFormVenda = false; }
  
  abrirCompraParaProduto(produto: Produto) { 
    this.mostrarFormVenda = false; 
    this.produtoParaCompra = produto; 
    this.mostrarFormCompra = true; 
  }

  fecharFormCompra() { 
    this.mostrarFormCompra = false; 
    this.produtoParaCompra = null;
  }
  
  onCompraSalva() { 
    this.fecharFormCompra(); 
    setTimeout(() => this.mostrarFormVenda = true, 500); 
  }
}