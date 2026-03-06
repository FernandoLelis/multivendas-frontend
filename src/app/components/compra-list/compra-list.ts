import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ComprasService } from '../../services/compra.service'; // Restaurado para ComprasService
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Compra, normalizarCompraDoBackend, converterCompraAntigaParaNova, isCompraSistemaAntigo } from '../../models/compra';

interface CompraComUI extends Compra {
  mostrarProdutos: boolean;
}

@Component({
  selector: 'app-compra-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CompraFormComponent,
    BrazilianCurrencyPipe,
  ],
  templateUrl: './compra-list.html',
  styleUrls: ['./compra-list.css']
})
// Restaurado para ComprasComponent para não quebrar o app.routes.ts
export class ComprasComponent implements OnInit {
  comprasOriginais: CompraComUI[] = [];
  comprasFiltradas: CompraComUI[] = [];
  comprasPaginadas: CompraComUI[] = [];

  // Paginação
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  totalPaginas: number = 1;
  paginasArray: number[] = [];

  // Filtros Padrões
  termoBusca: string = '';
  ordenacao: string = 'mais_recentes';
  periodo: string = 'todos';

  // Modais e Estados
  carregando: boolean = true;
  mostrarModal: boolean = false;
  mostrarModalFiltros: boolean = false;
  compraEditando: Compra | null = null;
  erroCarregamento: string = '';

  // Verifica se existe imagem no item
  getImagemUrl(item: any): string | null {
    return item?.imagemUrl || item?.produto?.imagemUrl || null;
  }

  // Pega até 3 imagens diferentes para quando a compra for um Lote (múltiplos produtos)
  getImagensPreview(compra: CompraComUI): string[] {
    if (!compra.itens || compra.itens.length === 0) return [];
    const imagens = compra.itens
      .map((item: any) => this.getImagemUrl(item))
      .filter((img: string | null) => img != null) as string[];
    
    // Retorna apenas imagens únicas, limitadas a 3
    return [...new Set(imagens)].slice(0, 3);
  }
  

  // Resumo Dinâmico
  resumoCompras = {
    quantidade: 0,
    totalPecas: 0,
    custoTotal: 0
  };

  constructor(
    private compraService: ComprasService, // Restaurado para ComprasService
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarCompras();
  }

  carregarCompras(): void {
    console.log('🚀 [COMPRA-LIST] Carregando compras...');
    this.carregando = true;
    this.erroCarregamento = '';
    
    this.compraService.getComprasUnificadas().subscribe({
      next: (comprasBackend: any[]) => {
        this.processarComprasUnificadas(comprasBackend);
      },
      error: (error: any) => {
        console.warn('⚠️ [COMPRA-LIST] Endpoint unificado falhou, tentando fallback...', error);
        this.tentarFallbackMultiplos();
      }
    });
  }

  private processarComprasUnificadas(comprasBackend: any[]): void {
    this.comprasOriginais = comprasBackend.map((compraBackend: any) => ({
      ...normalizarCompraDoBackend(compraBackend),
      mostrarProdutos: false
    }));
    
    this.aplicarFiltrosEOrdenacao();
    this.carregando = false;
  }

  private tentarFallbackMultiplos(): void {
    this.compraService.getComprasMultiplos().subscribe({
      next: (comprasMultiplos: any[]) => {
        this.comprasOriginais = comprasMultiplos.map((compra: any) => ({
          ...normalizarCompraDoBackend(compra),
          mostrarProdutos: false
        }));
        this.carregarEntradasAntigas();
      },
      error: (error: any) => {
        console.error('❌ [COMPRA-LIST] Endpoint múltiplos falhou, tentando legacy...', error);
        this.tentarFallbackLegacy();
      }
    });
  }

  private carregarEntradasAntigas(): void {
    this.compraService.getCompras().subscribe({
      next: (entradasAntigas: any[]) => {
        const comprasAntigas = entradasAntigas.map((entrada: any) => ({
          ...converterCompraAntigaParaNova(entrada),
          mostrarProdutos: false
        }));
        
        this.comprasOriginais = [...this.comprasOriginais, ...comprasAntigas];
        this.agruparComprasPorPedido();
        this.aplicarFiltrosEOrdenacao();
        this.carregando = false;
      },
      error: (error: any) => {
        this.aplicarFiltrosEOrdenacao();
        this.carregando = false;
      }
    });
  }

  private tentarFallbackLegacy(): void {
    this.compraService.getCompras().subscribe({
      next: (comprasLegacy: any[]) => {
        this.comprasOriginais = comprasLegacy.map((compra: any) => ({
          ...converterCompraAntigaParaNova(compra),
          mostrarProdutos: false
        }));
        
        this.agruparComprasPorPedido();
        this.aplicarFiltrosEOrdenacao();
        this.carregando = false;
        
        if (this.comprasOriginais.length === 0) {
          this.erroCarregamento = 'Nenhuma compra encontrada.';
        }
      },
      error: (error: any) => {
        this.carregando = false;
        this.erroCarregamento = 'Erro ao carregar compras. Tente novamente mais tarde.';
        this.modalService.mostrarErro('Não foi possível carregar as compras. Verifique sua conexão.');
      }
    });
  }

  private agruparComprasPorPedido(): void {
    const comprasAgrupadas = new Map<string, CompraComUI>();
    
    this.comprasOriginais.forEach((compra: CompraComUI) => {
      const key = compra.idPedidoCompra;
      if (!key) return; 

      if (comprasAgrupadas.has(key)) {
        const existente = comprasAgrupadas.get(key)!;
        if (compra.itens && compra.itens.length > 0) {
          existente.itens = [...(existente.itens || []), ...compra.itens];
        }
        existente.quantidadeTotal = (existente.quantidadeTotal || 0) + (compra.quantidadeTotal || 0);
        existente.custoTotal = (existente.custoTotal || 0) + (compra.custoTotal || 0);
      } else {
        comprasAgrupadas.set(key, { ...compra });
      }
    });
    
    this.comprasOriginais = Array.from(comprasAgrupadas.values());
  }

  // ==================== FILTROS E PAGINAÇÃO ====================

  aplicarFiltrosEOrdenacao(): void {
    let filtrados = [...this.comprasOriginais];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      filtrados = filtrados.filter((c: CompraComUI) => 
        (c.idPedidoCompra && c.idPedidoCompra.toLowerCase().includes(termo)) ||
        (c.fornecedor && c.fornecedor.toLowerCase().includes(termo)) ||
        (c.observacoes && c.observacoes.toLowerCase().includes(termo))
      );
    }

    if (this.periodo !== 'todos') {
      filtrados = filtrados.filter((c: CompraComUI) => {
        if (!c.data) return false;
        const dataCompra = new Date(c.data);
        if (this.periodo === 'hoje') return dataCompra >= hoje;
        if (this.periodo === '7_dias') return dataCompra >= new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (this.periodo === '30_dias') return dataCompra >= new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (this.periodo === 'este_mes') return dataCompra.getMonth() === hoje.getMonth() && dataCompra.getFullYear() === hoje.getFullYear();
        if (this.periodo === 'este_ano') return dataCompra.getFullYear() === hoje.getFullYear();
        return true;
      });
    }

    filtrados.sort((a: CompraComUI, b: CompraComUI) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0;
      const dataB = b.data ? new Date(b.data).getTime() : 0;

      switch (this.ordenacao) {
        case 'mais_recentes': return dataB - dataA;
        case 'mais_antigas': return dataA - dataB;
        case 'maior_valor': return (b.custoTotal || 0) - (a.custoTotal || 0);
        case 'menor_valor': return (a.custoTotal || 0) - (b.custoTotal || 0);
        default: return 0;
      }
    });

    this.comprasFiltradas = filtrados;
    this.paginaAtual = 1; 
    
    this.calcularResumoCompras();
    this.atualizarPaginacao();
  }

  calcularResumoCompras(): void {
    let custoTotal = 0;
    let totalPecas = 0;

    this.comprasFiltradas.forEach((compra: CompraComUI) => {
      custoTotal += Number(compra.custoTotal || 0);
      totalPecas += this.getQuantidadeTotal(compra);
    });

    this.resumoCompras = {
      quantidade: this.comprasFiltradas.length,
      totalPecas,
      custoTotal
    };
  }

  atualizarPaginacao(): void {
    this.totalPaginas = Math.ceil(this.comprasFiltradas.length / this.itensPorPagina);
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
    this.comprasPaginadas = this.comprasFiltradas.slice(inicio, fim);
  }

  mudarPagina(novaPagina: number): void {
    if (novaPagina >= 1 && novaPagina <= this.totalPaginas) {
      this.paginaAtual = novaPagina;
      this.atualizarPaginacao();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ==================== HELPERS DE UI E DADOS ====================

  getDataCompra(compra: CompraComUI): string {
    return this.compraService.formatarDataParaExibicao(compra.data);
  }

  getQuantidadeTotal(compra: CompraComUI): number {
    if (compra.itens && compra.itens.length > 0) {
      return compra.itens.reduce((total: number, item: any) => total + (item.quantidade || 0), 0);
    }
    return compra.quantidadeTotal || 0;
  }

  getNumeroProdutos(compra: CompraComUI): number {
    return compra.itens ? compra.itens.length : 0;
  }

  isSistemaAntigo(compra: CompraComUI): boolean {
    return isCompraSistemaAntigo(compra);
  }

  toggleProdutos(compra: CompraComUI): void {
    compra.mostrarProdutos = !compra.mostrarProdutos;
  }


  // ==================== AÇÕES ====================

  novaCompra(): void {
    this.compraEditando = null;
    this.mostrarModal = true;
  }

  editarCompra(compra: CompraComUI): void {
    if (this.isSistemaAntigo(compra)) {
      this.modalService.mostrarErro('Compras do sistema antigo não podem ser editadas. Crie uma nova compra.');
      return;
    }
    this.compraEditando = compra;
    this.mostrarModal = true;
  }

  excluirCompra(compra: CompraComUI): void {
    if (this.isSistemaAntigo(compra)) {
      this.modalService.mostrarErro('Compras do sistema antigo devem ser excluídas pela tela de entradas de estoque.');
      return;
    }
    
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir o pedido de compra "${compra.idPedidoCompra}"?`,
      () => {
        if (compra.id && compra.id > 0) {
          this.compraService.excluirCompraMultipla(compra.id).subscribe({
            next: () => {
              this.modalService.mostrarSucesso('Compra excluída!');
              this.carregarCompras();
            },
            error: (error: any) => {
              if (error.error && error.error.includes('Não é possível excluir um lote que já foi parcialmente consumido')) {
                this.mostrarModalPepsExclusao(error.error, compra);
              } else {
                this.modalService.mostrarErro('Erro ao excluir compra!');
              }
            }
          });
        }
      }
    );
  }

  private mostrarModalPepsExclusao(mensagemErro: string, compra: CompraComUI): void {
    const saldoMatch = mensagemErro.match(/Saldo atual: (\d+)/);
    const quantidadeMatch = mensagemErro.match(/Quantidade original: (\d+)/);
    const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
    const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;
    this.modalService.mostrarAlertaPepsExclusao(saldoAtual, quantidadeAntiga);
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.compraEditando = null;
  }

  onCompraSalva(): void {
    this.carregarCompras();
    this.fecharModal(); 
  }
}