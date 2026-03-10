import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Despesa } from '../../models/despesa';
import { DespesaService } from '../../services/despesa.service';
import { ModalService } from '../../services/modal.service';
import { DespesaFormComponent } from '../despesa-form/despesa-form';

// Interface unificada com flag de UI
interface DespesaComUI extends Despesa {
  mostrarObservacoes: boolean;
}

@Component({
  selector: 'app-despesa-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DespesaFormComponent],
  templateUrl: './despesa-list.html',
  styleUrls: ['./despesa-list.css']
})
export class DespesaListComponent implements OnInit {
  despesasOriginais: DespesaComUI[] = [];
  despesasFiltradas: DespesaComUI[] = [];
  despesasPaginadas: DespesaComUI[] = [];

  // Paginação
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  totalPaginas: number = 1;
  paginasArray: number[] = [];

  // Filtros Padrões e Busca
  termoBusca: string = '';
  ordenacao: string = 'mais_recentes';
  periodo: string = 'todos';
  filtroCategoria: string = '';

  // Variáveis Temporárias para o Modal de Filtros
  mostrarModalFiltros: boolean = false;
  filtroCategoriaTemp: string = '';
  ordenacaoTemp: string = 'mais_recentes';

  // Modais e Estados
  carregando: boolean = true;
  mostrarFormDespesa: boolean = false;
  despesaSelecionada: Despesa | null = null;
  categorias: string[] = [];

  // Resumo Dinâmico
  resumoDespesas = {
    quantidade: 0,
    custoTotal: 0
  };

  constructor(
    private despesaService: DespesaService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarDespesas();
    this.carregarCategorias();
  }

  carregarDespesas(): void {
    console.log('🚀 [DESPESA-LIST] Carregando despesas...');
    this.carregando = true;
    
    this.despesaService.getDespesas().subscribe({
      next: (despesasBackend: Despesa[]) => {
        this.processarDespesas(despesasBackend);
      },
      error: (error: any) => {
        console.error('❌ [DESPESA-LIST] Erro ao carregar despesas:', error);
        this.carregando = false;
        this.modalService.mostrarErro('Erro ao carregar despesas. Verifique sua conexão.');
      }
    });
  }

  private processarDespesas(despesasBackend: Despesa[]): void {
    this.despesasOriginais = despesasBackend.map((despesa: Despesa) => ({
      ...despesa,
      mostrarObservacoes: false
    }));
    
    this.aplicarFiltrosEOrdenacao();
    this.carregando = false;
  }

  carregarCategorias(): void {
    this.despesaService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (error: any) => {
        console.error('Erro ao carregar categorias:', error);
      }
    });
  }

  // ==================== CONTROLE DO MODAL DE FILTROS ====================

  abrirModalFiltros(): void {
    // Sincroniza os temporários com os atuais antes de abrir
    this.filtroCategoriaTemp = this.filtroCategoria;
    this.ordenacaoTemp = this.ordenacao;
    this.mostrarModalFiltros = true;
  }

  fecharModalFiltros(): void {
    this.mostrarModalFiltros = false;
  }

  aplicarFiltrosModal(): void {
    // Aplica os temporários nos reais e executa a filtragem
    this.filtroCategoria = this.filtroCategoriaTemp;
    this.ordenacao = this.ordenacaoTemp;
    this.aplicarFiltrosEOrdenacao();
    this.fecharModalFiltros();
  }

  // ==================== FILTROS E PAGINAÇÃO ====================

  aplicarFiltrosEOrdenacao(): void {
    let filtradas = [...this.despesasOriginais];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtro por texto (Busca)
    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      filtradas = filtradas.filter((d: DespesaComUI) => 
        d.descricao.toLowerCase().includes(termo) ||
        (d.observacoes && d.observacoes.toLowerCase().includes(termo))
      );
    }

    // 2. Filtro de Período
    if (this.periodo !== 'todos') {
      filtradas = filtradas.filter(v => {
        const dataVenda = new Date(v.data);
        if (this.periodo === 'hoje') return dataVenda >= hoje;
        if (this.periodo === '7_dias') return dataVenda >= new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (this.periodo === '30_dias') return dataVenda >= new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (this.periodo === 'este_mes') return dataVenda.getMonth() === hoje.getMonth() && dataVenda.getFullYear() === hoje.getFullYear();
        if (this.periodo === 'este_ano') return dataVenda.getFullYear() === hoje.getFullYear();
        return true;
      });
    }

    // Filtro por Categoria
    if (this.filtroCategoria !== '') {
      filtradas = filtradas.filter((d: DespesaComUI) => d.categoria === this.filtroCategoria);
    }

    // Ordenação
    filtradas.sort((a: DespesaComUI, b: DespesaComUI) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0;
      const dataB = b.data ? new Date(b.data).getTime() : 0;

      switch (this.ordenacao) {
        case 'mais_recentes': return dataB - dataA;
        case 'mais_antigas': return dataA - dataB;
        case 'maior_valor': return (b.valor || 0) - (a.valor || 0);
        case 'menor_valor': return (a.valor || 0) - (b.valor || 0);
        default: return 0;
      }
    });

    this.despesasFiltradas = filtradas;
    this.paginaAtual = 1; 
    
    this.calcularResumoDespesas();
    this.atualizarPaginacao();
  }

  calcularResumoDespesas(): void {
    const custoTotal = this.despesasFiltradas.reduce((total, despesa) => total + Number(despesa.valor || 0), 0);

    this.resumoDespesas = {
      quantidade: this.despesasFiltradas.length,
      custoTotal
    };
  }

  atualizarPaginacao(): void {
    this.totalPaginas = Math.ceil(this.despesasFiltradas.length / this.itensPorPagina);
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
    this.despesasPaginadas = this.despesasFiltradas.slice(inicio, fim);
  }

  mudarPagina(novaPagina: number): void {
    if (novaPagina >= 1 && novaPagina <= this.totalPaginas) {
      this.paginaAtual = novaPagina;
      this.atualizarPaginacao();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  limparFiltros(): void {
    this.filtroCategoria = '';
    this.termoBusca = '';
    this.ordenacao = 'mais_recentes';
    // Sincroniza temporários também
    this.filtroCategoriaTemp = '';
    this.ordenacaoTemp = 'mais_recentes';
    this.carregarDespesas();
  }

  // ==================== HELPERS DE UI E DADOS ====================

  getClasseCategoria(categoria: string): string {
    const classes: { [key: string]: string } = {
      'Material de Escritório': 'badge-material',
      'Embalagem': 'badge-embalagem',
      'Manutenção': 'badge-manutencao',
      'Marketing': 'badge-marketing',
      'Transporte': 'badge-transporte',
      'Outros': 'badge-outros'
    };
    return classes[categoria] || 'badge-default';
  }

  getIconeCategoria(categoria: string): string {
    const icones: { [key: string]: string } = {
      'Material de Escritório': '🖨️',
      'Embalagem': '📦',
      'Manutenção': '🔧',
      'Marketing': '📢',
      'Transporte': '🚚',
      'Outros': '🏷️'
    };
    return icones[categoria] || '🧾';
  }

  toggleObservacoes(despesa: DespesaComUI): void {
    despesa.mostrarObservacoes = !despesa.mostrarObservacoes;
  }

  // ==================== AÇÕES ====================

  novaDespesa(): void {
    this.despesaSelecionada = null;
    this.mostrarFormDespesa = true;
  }

  editarDespesa(despesa: Despesa): void {
    this.despesaSelecionada = { ...despesa };
    this.mostrarFormDespesa = true;
  }

  excluirDespesa(despesa: Despesa): void {
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a despesa "${despesa.descricao}"?`,
      () => {
        if (despesa.id) {
          this.despesaService.excluirDespesa(despesa.id).subscribe({
            next: () => {
              this.carregarDespesas();
              this.modalService.mostrarSucesso('Despesa excluída com sucesso!');
            },
            error: (error: any) => {
              console.error('Erro ao excluir despesa:', error);
              this.modalService.mostrarErro('Erro ao excluir despesa');
            }
          });
        }
      }
    );
  }

  fecharFormDespesa(): void {
    this.mostrarFormDespesa = false;
    this.despesaSelecionada = null;
  }

  onDespesaSalva(): void {
    this.carregarDespesas();
    this.fecharFormDespesa();
  }
}