import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../services/produto.service';
import { Produto } from '../../models/produto';
import { Router } from '@angular/router';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-produto-list',
  standalone: true,
  imports: [CommonModule, ProdutoFormComponent, FormsModule],
  templateUrl: './produto-list.html',
  styleUrls: ['./produto-list.css']
})
export class ProdutoList implements OnInit {
  produtosOriginais: Produto[] = [];
  produtosFiltrados: Produto[] = [];
  
  // ✅ NOVAS VARIÁVEIS PARA PAGINAÇÃO
  produtosPaginados: Produto[] = [];
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  totalPaginas: number = 1;
  paginasArray: number[] = [];

  // Controles de Filtro
  termoBusca: string = '';
  ordenacao: string = 'mais_vendidos';
  
  mostrarModal: boolean = false;
  produtoParaEditar: Produto | null = null;
  medidasExpandidas: Set<number> = new Set<number>();

  constructor(
    private produtoService: ProdutoService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtosOriginais = produtos;
        this.aplicarFiltrosEOrdenacao();
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  aplicarFiltrosEOrdenacao(): void {
    let filtrados = [...this.produtosOriginais];

    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      filtrados = filtrados.filter(p => 
        (p.nome && p.nome.toLowerCase().includes(termo)) ||
        (p.sku && p.sku.toLowerCase().includes(termo)) ||
        (p.asin && p.asin.toLowerCase().includes(termo)) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo))
      );
    }

    filtrados.sort((a, b) => {
      switch (this.ordenacao) {
        case 'mais_vendidos': return (b.quantidadeVendida || 0) - (a.quantidadeVendida || 0);
        case 'menos_vendidos': return (a.quantidadeVendida || 0) - (b.quantidadeVendida || 0);
        case 'ultimos_criados': return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
        case 'criados_primeiro': return new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime();
        case 'titulo_az': return (a.nome || '').localeCompare(b.nome || '');
        case 'maior_estoque': return (b.quantidadeEstoqueTotal || 0) - (a.quantidadeEstoqueTotal || 0);
        case 'menor_estoque': return (a.quantidadeEstoqueTotal || 0) - (b.quantidadeEstoqueTotal || 0);
        default: return 0;
      }
    });

    this.produtosFiltrados = filtrados;
    
    // ✅ RECALCULA A PAGINAÇÃO SEMPRE QUE FILTRAR OU ORDENAR
    this.paginaAtual = 1; 
    this.atualizarPaginacao();
  }

  // ✅ NOVO MÉTODO: FATIA A LISTA PARA MOSTRAR APENAS 10
  atualizarPaginacao(): void {
    this.totalPaginas = Math.ceil(this.produtosFiltrados.length / this.itensPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;

    this.paginasArray = Array.from({length: this.totalPaginas}, (_, i) => i + 1);

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.produtosPaginados = this.produtosFiltrados.slice(inicio, fim);
  }

  // ✅ NOVO MÉTODO: TROCA A PÁGINA CLICADA
  mudarPagina(novaPagina: number): void {
    if (novaPagina >= 1 && novaPagina <= this.totalPaginas) {
      this.paginaAtual = novaPagina;
      this.atualizarPaginacao();
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela ao trocar de página
    }
  }

  // (Os outros métodos continuam iguaizinhos...)
  toggleMedidas(produtoId: number): void {
    if (this.medidasExpandidas.has(produtoId)) {
      this.medidasExpandidas.delete(produtoId);
    } else {
      this.medidasExpandidas.add(produtoId);
    }
  }

  isEstoqueBaixo(produto: Produto): boolean {
    const estoque = produto.quantidadeEstoqueTotal || 0;
    const minimo = produto.estoqueMinimo || 0;
    return estoque < minimo;
  }

  calcularLucroMedio(produto: Produto): number {
    const preco = produto.precoMedioVenda || 0;
    const custo = produto.custoMedio || 0;
    return preco - custo;
  }

  formatarMoeda(valor: number | undefined): string {
    const val = valor || 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  excluirProduto(produto: Produto): void {
    if (!produto.id) { return; }
    
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
      () => {
        this.produtoService.excluirProduto(produto.id!).subscribe({
          next: () => {
            this.modalService.mostrarSucesso('Produto excluído com sucesso!');
            this.carregarProdutos();
          },
          error: (error) => {
            if (this.erroPossuiVendasAssociadas(error)) {
              this.modalService.mostrarAlertaProdutoExclusao();
            } else {
              this.modalService.mostrarErro('Erro ao excluir produto!');
            }
          }
        });
      }
    );
  }

  private erroPossuiVendasAssociadas(error: any): boolean {
    const errorMessage = error?.error?.message || error?.message || '';
    const errorStatus = error?.status;
    const indicadoresVendas = ['vendas', 'Venda', 'foreign key', 'constraint', 'referenced'];
    const possuiIndicador = indicadoresVendas.some(i => errorMessage.toLowerCase().includes(i.toLowerCase()));
    return possuiIndicador || [409, 400].includes(errorStatus);
  }

  editarProduto(produto: Produto): void {
    this.produtoParaEditar = produto;
    this.mostrarModal = true;
  }

  abrirModal(): void {
    this.produtoParaEditar = null;
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.produtoParaEditar = null;
  }

  onProdutoSalvo(): void {
    this.carregarProdutos();
    this.fecharModal();
  }

  formatarData(dataString: string): string {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }
}