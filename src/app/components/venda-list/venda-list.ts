import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FormsModule, 
    VendaFormComponent, 
    CompraFormComponent,
    BrazilianCurrencyPipe
  ],
  templateUrl: './venda-list.html',
  styleUrls: ['./venda-list.css']
})
export class VendaListComponent implements OnInit {
  vendasOriginais: any[] = [];
  vendasFiltradas: any[] = [];
  
  vendasPaginadas: any[] = [];
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  totalPaginas: number = 1;
  paginasArray: number[] = [];

  termoBusca: string = '';
  ordenacao: string = 'mais_recentes';
  periodo: string = 'todos';

  mostrarFormVenda: boolean = false;
  mostrarFormCompra: boolean = false;
  carregando: boolean = true;
  vendaSelecionada: any = null;
  produtoParaCompra: any = null;

  constructor(
    private vendaService: VendaService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarVendas();
  }

  carregarVendas(): void {
    this.carregando = true;
    this.vendaService.getVendas().subscribe({
      next: (vendas) => {
        this.vendasOriginais = (vendas || []).map((venda: any) => ({
          ...this.calcularLucroERoi(venda),
          mostrarProdutos: false
        }));
        this.aplicarFiltrosEOrdenacao();
        this.carregando = false;
      },
      error: (error) => {
        console.error('❌ Erro ao carregar vendas:', error);
        this.carregando = false;
      }
    });
  }

  aplicarFiltrosEOrdenacao(): void {
    let filtrados = [...this.vendasOriginais];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtro de Busca
    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      filtrados = filtrados.filter(v => 
        (v.idPedido && v.idPedido.toLowerCase().includes(termo)) ||
        (v.plataforma && v.plataforma.toLowerCase().includes(termo))
      );
    }

    // Filtro de Período
    if (this.periodo !== 'todos') {
      filtrados = filtrados.filter(v => {
        const dataVenda = new Date(v.data);
        if (this.periodo === 'hoje') return dataVenda >= hoje;
        if (this.periodo === '7_dias') return dataVenda >= new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (this.periodo === '30_dias') return dataVenda >= new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (this.periodo === 'este_mes') return dataVenda.getMonth() === hoje.getMonth() && dataVenda.getFullYear() === hoje.getFullYear();
        return true;
      });
    }

    // Ordenação
    filtrados.sort((a, b) => {
      const dataA = new Date(a.data).getTime();
      const dataB = new Date(b.data).getTime();

      switch (this.ordenacao) {
        case 'mais_recentes': return dataB - dataA;
        case 'mais_antigas': return dataA - dataB;
        case 'maior_lucro': return (b.lucroLiquido || 0) - (a.lucroLiquido || 0);
        case 'menor_lucro': return (a.lucroLiquido || 0) - (b.lucroLiquido || 0);
        case 'maior_valor': return (b.precoVenda || 0) - (a.precoVenda || 0);
        default: return 0;
      }
    });

    this.vendasFiltradas = filtrados;
    this.paginaAtual = 1; 
    this.atualizarPaginacao();
  }

  atualizarPaginacao(): void {
    this.totalPaginas = Math.ceil(this.vendasFiltradas.length / this.itensPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;
    
    const blocoAtual = Math.floor((this.paginaAtual - 1) / 10);
    const startPage = blocoAtual * 10 + 1;
    const endPage = Math.min(startPage + 9, this.totalPaginas);

    this.paginasArray = [];
    for (let i = startPage; i <= endPage; i++) {
      this.paginasArray.push(i);
    }

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.vendasPaginadas = this.vendasFiltradas.slice(inicio, fim);
  }

  mudarPagina(novaPagina: number): void {
    if (novaPagina >= 1 && novaPagina <= this.totalPaginas) {
      this.paginaAtual = novaPagina;
      this.atualizarPaginacao();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Busca profunda de Imagem e SKU
  getItensAgrupados(venda: any): any[] {
    if (!venda.itens || !Array.isArray(venda.itens) || venda.itens.length === 0) return [];
    const agrupados = new Map();

    venda.itens.forEach((item: any) => {
      const id = item.produto?.id || item.produtoId || item.id || 'id-desconhecido';
      const nome = item.produto?.nome || item.produtoNome || item.nome || `Produto #${id}`;
      
      // Mapeamento focado no imagemUrl e em outras variações possíveis
      let imagemUrl = item.imagemUrl || item.produto?.imagemUrl || item.imagemPrincipal || item.produto?.imagemPrincipal || item.urlImagem || item.produto?.urlImagem || item.produto?.imagem || '';
      
      if (!imagemUrl && item.produto?.imagens && item.produto.imagens.length > 0) {
        imagemUrl = item.produto.imagens[0];
      }

      const sku = item.sku || item.produto?.sku || item.produtoSku || '';
      const custoUnit = item.custoUnitario || item.produto?.precoCusto || item.precoCusto || item.produto?.custoMedio || 0;
      const qtd = item.quantidade || 0;
      
      if (!agrupados.has(id)) {
        agrupados.set(id, { nome: nome, quantidade: 0, custoTotal: 0, imagem: imagemUrl, sku: sku });
      }

      const p = agrupados.get(id);
      p.quantidade += qtd;
      p.custoTotal += (custoUnit * qtd);

      if (!p.imagem && imagemUrl) p.imagem = imagemUrl;
      if (!p.sku && sku) p.sku = sku;
    });

    return Array.from(agrupados.values()).map(p => ({
      ...p,
      custoMedio: p.quantidade > 0 ? p.custoTotal / p.quantidade : 0
    }));
  }

  // Retorna até 3 imagens válidas para o stack de pacotes
  getImagensPreview(venda: any): string[] {
    const itens = this.getItensAgrupados(venda);
    return itens.map(i => i.imagem).filter(img => img && img !== '').slice(0, 3);
  }

  getNumeroTotalUnidades(venda: any): number {
    return this.getItensAgrupados(venda).reduce((acc, item) => acc + item.quantidade, 0);
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

  getPlataformaClass(plataforma: string): string {
    const p = (plataforma || '').toLowerCase();
    if (p.includes('amazon')) return 'amazon';
    if (p.includes('mercado')) return 'mercado-livre';
    if (p.includes('shopee')) return 'shopee';
    return 'outro';
  }

  // Esconde imagens que vieram com link quebrado da API
  esconderImagemQuebrada(event: any, item?: any) {
    event.target.style.display = 'none';
    if (item) item.imagem = null; 
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