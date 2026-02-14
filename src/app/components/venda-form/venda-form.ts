import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Venda, criarVendaVazia, calcularPrecoTotalVenda } from '../../models/venda';
import { ItemVenda, criarItemVendaDeProduto, calcularPrecoTotalItem } from '../../models/item-venda';
import { ItemVendaAgrupado, agruparItensPorProduto } from '../../models/item-venda-agrupado';
import { Produto } from '../../models/produto';
import { VendaService } from '../../services/venda.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-venda-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ProdutoFormComponent, 
    BrazilianCurrencyPipe 
  ],
  templateUrl: './venda-form.html',
  styleUrls: ['./venda-form.css']
})
export class VendaFormComponent implements OnInit {
  @Input() venda: Venda | null = null;
  @Output() fecharModal = new EventEmitter<void>();
  @Output() vendaSalva = new EventEmitter<void>();
  @Output() abrirCompraParaProduto = new EventEmitter<Produto>();
  
  vendaEdit: Venda = this.getVendaVazia();
  produtos: Produto[] = [];
  plataformas: string[] = ['Amazon', 'Mercado Livre', 'Shopee', 'Outro'];
  modoEdicao: boolean = false;
  
  produtoSelecionado: Produto | null = null;
  quantidadeSelecionada: number = 1;
  precoUnitarioSelecionado: number = 0;
  precoTotalSelecionado: number = 0;
  
  mostrarModalProduto: boolean = false;
  
  estoqueInsuficiente: boolean = false;
  estoqueDisponivel: number = 0;
  quantidadeSolicitada: number = 0;
  verificandoEstoque: boolean = false;
  
  quantidadeNoCarrinho: number = 0;
  erroEstoque: { [produtoId: number]: string } = {};

  // ✅✅✅ NOVO: Usar ItemVendaAgrupado para exibição
  itensExibicao: ItemVendaAgrupado[] = [];

  // ✅✅✅ NOVO: Para controle de edição
  vendaOriginal: Venda | null = null;
  itensOriginais: ItemVenda[] = [];

  // ✅✅✅ NOVO: Para controle de edição em tempo real
  quantidadesEditadas: Map<number, number> = new Map();

  constructor(
    private vendaService: VendaService,
    private produtoService: ProdutoService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔍 [DEBUG-v46.9.2] ngOnInit iniciado - Formulário v46.9.2');
    this.carregarProdutos();
  }

  // ✅✅✅ NOVO: Verificar se há erros de estoque
  temErroEstoque(): boolean {
    return Object.keys(this.erroEstoque).length > 0;
  }

  // ✅✅✅ NOVO: Verificar se quantidades foram modificadas (usando quantidadesEditadas)
  quantidadesModificadas(): boolean {
    if (!this.modoEdicao || !this.vendaOriginal || !this.vendaOriginal.itens) {
      return true; // Nova venda ou sem dados originais
    }
    
    // Se houve edições no Map, há modificações
    if (this.quantidadesEditadas.size > 0) {
      console.log('📊 [DEBUG-v46.9.2] Quantidades modificadas no Map:', this.quantidadesEditadas.size);
      return true;
    }
    
    // Verificar também por comparação direta (para segurança)
    const quantidadesAtuais = new Map<number, number>();
    const quantidadesOriginais = new Map<number, number>();
    
    // Somar quantidades atuais por produto
    this.vendaEdit.itens.forEach(item => {
      if (item.produtoId) {
        const atual = quantidadesAtuais.get(item.produtoId) || 0;
        quantidadesAtuais.set(item.produtoId, atual + item.quantidade);
      }
    });
    
    // Somar quantidades originais por produto
    this.vendaOriginal.itens.forEach(item => {
      if (item.produtoId) {
        const original = quantidadesOriginais.get(item.produtoId) || 0;
        quantidadesOriginais.set(item.produtoId, original + item.quantidade);
      }
    });
    
    // Comparar
    for (const [produtoId, quantidadeAtual] of quantidadesAtuais) {
      const quantidadeOriginal = quantidadesOriginais.get(produtoId) || 0;
      if (quantidadeAtual !== quantidadeOriginal) {
        console.log(`📊 [DEBUG-v46.9.2] Quantidades modificadas: Produto ${produtoId} - ${quantidadeOriginal} → ${quantidadeAtual}`);
        return true;
      }
    }
    
    console.log('📊 [DEBUG-v46.9.2] Quantidades NÃO modificadas');
    return false;
  }

  // ✅✅✅ NOVO: Verificar se apenas campos básicos mudaram
  apenasCamposBasicosModificados(): boolean {
    if (!this.modoEdicao || !this.vendaOriginal) {
      return false;
    }
    
    // Verificar se apenas estes campos mudaram:
    const camposParaIgnorar = ['data', 'plataforma', 'fretePagoPeloCliente', 'custoEnvio', 'tarifaPlataforma'];
    
    for (const campo of camposParaIgnorar) {
      if (JSON.stringify(this.vendaEdit[campo as keyof Venda]) !== 
          JSON.stringify(this.vendaOriginal[campo as keyof Venda])) {
        console.log(`📊 [DEBUG-v46.9.2] Campo básico modificado: ${campo}`);
        return false;
      }
    }
    
    // Verificar se ID do pedido mudou
    if (this.vendaEdit.idPedido !== this.vendaOriginal.idPedido) {
      console.log('📊 [DEBUG-v46.9.2] ID do pedido modificado');
      return false;
    }
    
    // Verificar se preço mudou (pode ser apenas recálculo)
    const precoEdit = Math.round(this.vendaEdit.precoVenda * 100) / 100;
    const precoOriginal = Math.round(this.vendaOriginal.precoVenda * 100) / 100;
    if (precoEdit !== precoOriginal) {
      console.log(`📊 [DEBUG-v46.9.2] Preço modificado: ${precoOriginal} → ${precoEdit}`);
      return false;
    }
    
    return true && !this.quantidadesModificadas();
  }

  private getVendaVazia(): Venda {
    const now = new Date();
    const dataFormatada = now.toISOString().split('T')[0];
    
    return {
      data: dataFormatada,
      idPedido: '',
      plataforma: 'Mercado Livre',
      precoVenda: 0,
      fretePagoPeloCliente: 0,
      custoEnvio: 0,
      tarifaPlataforma: 0,
      itens: []
    };
  }

  carregarProdutos(): void {
    console.log('🔍 [DEBUG-v46.9.2] Carregando produtos...');
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        console.log('✅ [DEBUG-v46.9.2] Produtos carregados:', produtos.length);
        this.inicializarFormulario();
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  inicializarFormulario(): void {
    console.log('🔍 [DEBUG-v46.9.2] Inicializando formulário...');
    
    if (this.venda && this.venda.id) {
      this.modoEdicao = true;
      this.vendaEdit = { ...this.venda };
      
      // ✅✅✅ CORREÇÃO CRÍTICA: Salvar cópia ORIGINAL para comparação
      this.vendaOriginal = { ...this.venda };
      this.itensOriginais = [...(this.venda.itens || [])];
      
      if (this.vendaEdit.itens && this.vendaEdit.itens.length > 0) {
        this.vendaEdit.itens = this.vendaEdit.itens.map(item => {
          const precoUnitarioVenda = item.precoUnitarioVenda || item.precoUnitario || 0;
          
          return {
            ...item,
            precoUnitarioVenda: precoUnitarioVenda,
            precoTotalItem: item.precoTotalItem || (precoUnitarioVenda * item.quantidade) || 0
          };
        });
        
        console.log('✅ [DEBUG-v46.9.2] Itens carregados:', this.vendaEdit.itens.length);
        this.atualizarItensExibicao();
      }
      
      if (this.vendaEdit.data && this.vendaEdit.data.includes('T')) {
        this.vendaEdit.data = this.vendaEdit.data.split('T')[0];
      }
      
      if (!this.vendaEdit.itens) {
        this.vendaEdit.itens = [];
      }
      
    } else {
      this.modoEdicao = false;
      console.log('🔍 [DEBUG-v46.9.2] Modo NOVA VENDA ativado');
    }
  }

  // ✅✅✅ NOVO: Método para atualizar itens de exibição
  private atualizarItensExibicao(): void {
    console.log('🔍 [DEBUG-v46.9.2] Atualizando itens para exibição...');
    
    this.itensExibicao = agruparItensPorProduto(this.vendaEdit.itens);
    
    console.log('✅ [DEBUG-v46.9.2] Itens de exibição atualizados:', {
      lotesOriginais: this.vendaEdit.itens.length,
      itensAgrupados: this.itensExibicao.length
    });
  }

  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    
    const quantidadeTotal = this.vendaEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
    
    return quantidadeTotal;
  }

  verificarEstoque(): void {
    if (!this.produtoSelecionado) return;
    
    const quantidade = this.quantidadeSelecionada;
    const produtoId = this.produtoSelecionado.id!;
    
    if (quantidade && quantidade > 0) {
      this.verificandoEstoque = true;
      this.quantidadeSolicitada = quantidade;
      
      this.quantidadeNoCarrinho = this.calcularQuantidadeNoCarrinho(produtoId);
      
      this.produtoService.getProduto(produtoId).subscribe({
        next: (produtoAtualizado) => {
          const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
          this.estoqueDisponivel = estoqueAtual;
          
          const quantidadeTotalRequisitada = this.quantidadeNoCarrinho + quantidade;
          this.estoqueInsuficiente = quantidadeTotalRequisitada > estoqueAtual;
          
          this.verificandoEstoque = false;
        },
        error: (error) => {
          console.error('Erro ao buscar estoque:', error);
          this.verificandoEstoque = false;
          this.estoqueInsuficiente = false;
        }
      });
    } else {
      this.estoqueInsuficiente = false;
      this.verificandoEstoque = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  onProdutoChange(): void {
    if (this.produtoSelecionado) {
      this.verificarEstoque();
    } else {
      this.estoqueInsuficiente = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  onQuantidadeChange(): void {
    if (this.produtoSelecionado) {
      this.verificarEstoque();
    }
  }

  onProdutoSelecionado(event: any): void {
    const produtoId = event.target.value;
    
    if (produtoId === 'novo') {
      this.abrirModalProduto();
      this.produtoSelecionado = null;
      this.estoqueInsuficiente = false;
      this.quantidadeNoCarrinho = 0;
      setTimeout(() => {
        event.target.value = '';
      });
    } else {
      const produtoSelecionado = this.produtos.find(p => p.id === Number(produtoId));
      if (produtoSelecionado) {
        this.produtoSelecionado = produtoSelecionado;
        this.onProdutoChange();
      } else {
        this.produtoSelecionado = null;
        this.estoqueInsuficiente = false;
        this.quantidadeNoCarrinho = 0;
      }
    }
  }

  abrirModalCompra(): void {
    if (this.produtoSelecionado) {
      this.abrirCompraParaProduto.emit(this.produtoSelecionado);
    } else {
      this.modalService.mostrarErro('Por favor, selecione um produto primeiro.');
    }
  }

  calcularPrecoTotal(): void {
    const precoUnitario = this.precoUnitarioSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    
    if (precoUnitario && quantidade) {
      this.precoTotalSelecionado = precoUnitario * quantidade;
      this.precoTotalSelecionado = Math.round(this.precoTotalSelecionado * 100) / 100;
    } else {
      this.precoTotalSelecionado = 0;
    }
  }

  calcularPrecoUnitario(): void {
    const precoTotal = this.precoTotalSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    
    if (precoTotal && quantidade && quantidade > 0) {
      this.precoUnitarioSelecionado = precoTotal / quantidade;
      this.precoUnitarioSelecionado = Math.round(this.precoUnitarioSelecionado * 100) / 100;
    } else {
      this.precoUnitarioSelecionado = 0;
    }
  }

  adicionarAoCarrinho(): void {
    if (!this.produtoSelecionado) {
      this.modalService.mostrarErro('Por favor, selecione um produto primeiro.');
      return;
    }
    
    if (this.quantidadeSelecionada <= 0) {
      this.modalService.mostrarErro('A quantidade deve ser maior que zero.');
      return;
    }
    
    if (this.precoTotalSelecionado <= 0) {
      this.modalService.mostrarErro('O preço total deve ser maior que zero.');
      return;
    }
    
    if (this.estoqueInsuficiente) {
      this.modalService.mostrarErro(
        `Estoque insuficiente!\n\n` +
        `Disponível: ${this.estoqueDisponivel} unidades\n` +
        `Já no carrinho: ${this.quantidadeNoCarrinho} unidades\n` +
        `Solicitado: ${this.quantidadeSolicitada} unidades\n\n` +
        `Clique em "Comprar Mais Estoque" para adicionar estoque.`
      );
      return;
    }
    
    const produtoId = this.produtoSelecionado.id!;
    
    const itemExistente = this.vendaEdit.itens.find(
      item => item.produtoId === produtoId
    );
    
    if (itemExistente) {
      const novaQuantidadeTotal = itemExistente.quantidade + this.quantidadeSelecionada;
      
      if (novaQuantidadeTotal > this.estoqueDisponivel && !this.estoqueInsuficiente) {
        this.modalService.mostrarErro(
          `Estoque insuficiente! Você já tem ${itemExistente.quantidade} unidades no carrinho. 
          Disponível: ${this.estoqueDisponivel} unidades.
          Não é possível adicionar mais ${this.quantidadeSelecionada} unidades.`
        );
        return;
      }
      
      itemExistente.quantidade = novaQuantidadeTotal;
      itemExistente.precoUnitarioVenda = this.precoUnitarioSelecionado;
      itemExistente.precoTotalItem = calcularPrecoTotalItem(itemExistente);
    } else {
      const novoItem: ItemVenda = criarItemVendaDeProduto(
        this.produtoSelecionado, 
        this.quantidadeSelecionada
      );
      
      novoItem.precoUnitarioVenda = this.precoUnitarioSelecionado;
      novoItem.precoTotalItem = this.precoTotalSelecionado;
      
      this.vendaEdit.itens.push(novoItem);
    }
    
    this.atualizarPrecoTotalVenda();
    this.atualizarItensExibicao();
    this.limparSelecaoProduto();
  }

  limparSelecaoProduto(): void {
    this.produtoSelecionado = null;
    this.quantidadeSelecionada = 1;
    this.precoUnitarioSelecionado = 0;
    this.precoTotalSelecionado = 0;
    this.estoqueInsuficiente = false;
    this.quantidadeNoCarrinho = 0;
    
    const selectElement = document.getElementById('produtoSelecionado') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = '';
    }
  }

  removerDoCarrinho(index: number): void {
    this.modalService.confirmarExclusao(
      'Remover este produto do carrinho?',
      () => {
        const itemExibicao = this.itensExibicao[index];
        
        if (itemExibicao) {
          // Remover todos os itens deste produto
          this.vendaEdit.itens = this.vendaEdit.itens.filter(
            item => item.produtoId !== itemExibicao.produtoId
          );
          
          this.atualizarItensExibicao();
          this.atualizarPrecoTotalVenda();
          
          // Limpar edições deste produto
          this.quantidadesEditadas.delete(itemExibicao.produtoId);
        }
      }
    );
  }

  // ✅✅✅ CORREÇÃO CRÍTICA v46.9.2: Novo método para atualizar quantidade TOTAL
  atualizarQuantidadeTotal(itemExibicao: ItemVendaAgrupado, novaQuantidadeTotal: number): void {
    console.log(`🔧 [DEBUG-v46.9.2] Atualizando quantidade total: Produto ${itemExibicao.produtoId} - ${itemExibicao.quantidadeTotal} → ${novaQuantidadeTotal}`);
    
    if (!this.modoEdicao) {
      console.log('⚠️ [DEBUG-v46.9.2] Não é modo edição - ignorando');
      return;
    }
    
    if (novaQuantidadeTotal <= 0) {
      console.log('⚠️ [DEBUG-v46.9.2] Quantidade inválida');
      this.modalService.mostrarErro('A quantidade deve ser maior que zero.');
      return;
    }
    
    // Verificar se a quantidade realmente mudou
    if (novaQuantidadeTotal === itemExibicao.quantidadeTotal) {
      console.log('ℹ️ [DEBUG-v46.9.2] Quantidade não mudou');
      return;
    }
    
    // Salvar a edição no Map
    this.quantidadesEditadas.set(itemExibicao.produtoId, novaQuantidadeTotal);
    
    // Verificar estoque
    this.verificarEstoqueParaEdicao(itemExibicao.produtoId, novaQuantidadeTotal);
  }

  // ✅✅✅ NOVO: Verificar estoque considerando lotes já consumidos
  private verificarEstoqueParaEdicao(produtoId: number, novaQuantidadeTotal: number): void {
    this.produtoService.getProduto(produtoId).subscribe({
      next: (produtoAtualizado) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        
        // ✅✅✅ CORREÇÃO: Considerar que na edição, os lotes originais serão REVERTIDOS
        // Portanto, temos que considerar o estoque ORIGINAL (antes da venda)
        const quantidadeNaVendaOriginal = this.calcularQuantidadeTotalOriginal(produtoId);
        
        console.log(`📦 [DEBUG-v46.9.2] Verificando estoque para edição:`, {
          produtoId,
          estoqueAtual,
          novaQuantidadeTotal,
          quantidadeNaVendaOriginal
        });
        
        // O estoque disponível REAL para edição é:
        // estoqueAtual + quantidadeNaVendaOriginal (porque vamos reverter)
        const estoqueDisponivelParaEdicao = estoqueAtual + quantidadeNaVendaOriginal;
        
        if (novaQuantidadeTotal > estoqueDisponivelParaEdicao) {
          this.erroEstoque[produtoId] = 
            `⚠️ Estoque insuficiente para edição! Disponível: ${estoqueDisponivelParaEdicao} unidades, Solicitado: ${novaQuantidadeTotal}`;
          
          console.log(`❌ [DEBUG-v46.9.2] Estoque insuficiente: ${estoqueDisponivelParaEdicao} < ${novaQuantidadeTotal}`);
        } else {
          delete this.erroEstoque[produtoId];
          console.log(`✅ [DEBUG-v46.9.2] Estoque suficiente: ${estoqueDisponivelParaEdicao} >= ${novaQuantidadeTotal}`);
        }
      },
      error: () => {
        console.error('❌ [DEBUG-v46.9.2] Erro ao verificar estoque do produto', produtoId);
      }
    });
  }

  // ✅✅✅ NOVO: Calcular quantidade total original (antes da edição)
  private calcularQuantidadeTotalOriginal(produtoId: number): number {
    if (!this.vendaOriginal || !this.vendaOriginal.itens) return 0;
    
    return this.vendaOriginal.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
  }

  atualizarPrecoUnitarioTotal(itemExibicao: ItemVendaAgrupado, novoPrecoUnitario: number): void {
    console.log(`🔧 [DEBUG-v46.9.2] Atualizando preço unitário: Produto ${itemExibicao.produtoId} - ${itemExibicao.precoUnitarioVenda} → ${novoPrecoUnitario}`);
    
    if (!this.modoEdicao || novoPrecoUnitario < 0) return;
    
    // Atualizar preço unitário em todos os lotes deste produto
    let precoTotalAtualizado = 0;
    
    this.vendaEdit.itens.forEach(item => {
      if (item.produtoId === itemExibicao.produtoId) {
        item.precoUnitarioVenda = novoPrecoUnitario;
        item.precoTotalItem = calcularPrecoTotalItem(item);
        precoTotalAtualizado += item.precoTotalItem;
      }
    });
    
    // Atualizar exibição
    this.atualizarItensExibicao();
    this.atualizarPrecoTotalVenda();
    
    console.log(`💰 [DEBUG-v46.9.2] Preço total atualizado: ${precoTotalAtualizado}`);
  }

  atualizarPrecoTotalVenda(): void {
    this.vendaEdit.precoVenda = calcularPrecoTotalVenda(this.vendaEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.vendaEdit.itens.reduce((total, item) => {
      return total + (item.precoTotalItem || 0);
    }, 0);
  }

  abrirModalProduto(): void {
    this.mostrarModalProduto = true;
  }

  fecharModalProduto(): void {
    this.mostrarModalProduto = false;
  }

  onProdutoSalvo(): void {
    this.fecharModalProduto();
    this.carregarProdutos();
  }

  validarData(): void {
    if (!this.vendaEdit.data) {
      const now = new Date();
      const dataFormatada = now.toISOString().split('T')[0];
      this.vendaEdit.data = dataFormatada;
    }
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  // ✅✅✅ CORREÇÃO CRÍTICA v46.9.2: Preparar dados inteligentes para backend
  prepararDadosParaEnvio(): any {
    const apenasCamposBasicos = this.apenasCamposBasicosModificados();
    const quantidadesModificadas = this.quantidadesModificadas();
    
    console.log('📊 [DEBUG-v46.9.2] Análise de modificações:');
    console.log('📊 [DEBUG] Apenas campos básicos:', apenasCamposBasicos);
    console.log('📊 [DEBUG] Quantidades modificadas:', quantidadesModificadas);
    console.log('📊 [DEBUG] Quantidades editadas:', Array.from(this.quantidadesEditadas.entries()));
    
    const dadosVenda: any = {
      idPedido: this.vendaEdit.idPedido,
      plataforma: this.vendaEdit.plataforma,
      data: this.vendaEdit.data,
      precoVenda: this.calcularTotalCarrinho(),
      fretePagoPeloCliente: this.vendaEdit.fretePagoPeloCliente || 0,
      custoEnvio: this.vendaEdit.custoEnvio || 0,
      tarifaPlataforma: this.vendaEdit.tarifaPlataforma || 0
    };
    
    // ✅✅✅ CORREÇÃO: Usar quantidades EDITADAS do Map, não as exibidas
    if (this.modoEdicao && quantidadesModificadas && this.quantidadesEditadas.size > 0) {
      // Reconstruir itens baseado nas quantidades editadas
      dadosVenda.itens = [];
      
      this.quantidadesEditadas.forEach((novaQuantidade, produtoId) => {
        // Buscar informações do produto
        const produto = this.produtos.find(p => p.id === produtoId);
        const itemExibicao = this.itensExibicao.find(i => i.produtoId === produtoId);
        
        if (produto && itemExibicao) {
          dadosVenda.itens.push({
            produtoId: produtoId,
            quantidade: novaQuantidade,
            precoUnitarioVenda: itemExibicao.precoUnitarioVenda || 0
          });
        }
      });
      
      console.log('📤 [DEBUG-v46.9.2] Enviando ITENS EDITADOS (quantidades modificadas)');
    } else if (this.modoEdicao && apenasCamposBasicos) {
      // Apenas campos básicos mudaram - NÃO enviar itens
      console.log('📤 [DEBUG-v46.9.2] NÃO enviando itens (apenas campos básicos modificados)');
      // Backend manterá os itens originais
    } else {
      // Nova venda ou outras modificações - enviar todos os itens
      dadosVenda.itens = this.vendaEdit.itens.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitarioVenda: item.precoUnitarioVenda || 0
      }));
      console.log('📤 [DEBUG-v46.9.2] Enviando TODOS OS ITENS');
    }
    
    console.log('📤 [DEBUG-v46.9.2] Dados preparados para backend:', {
      temItens: !!dadosVenda.itens,
      numItens: dadosVenda.itens ? dadosVenda.itens.length : 0,
      dadosVenda: dadosVenda
    });
    
    return dadosVenda;
  }

  salvarVenda(): void {
    console.log('💾 [DEBUG-v46.9.2] Salvando venda...');
    console.log('💾 [DEBUG] Modo:', this.modoEdicao ? 'EDIÇÃO' : 'NOVA VENDA');
    console.log('💾 [DEBUG] Quantidades modificadas:', this.quantidadesModificadas());
    console.log('💾 [DEBUG] Quantidades editadas:', Array.from(this.quantidadesEditadas.entries()));
    
    if (this.vendaEdit.itens.length === 0) {
      this.modalService.mostrarErro('Adicione pelo menos um produto ao carrinho.');
      return;
    }
    
    if (!this.vendaEdit.idPedido.trim()) {
      this.modalService.mostrarErro('ID do Pedido é obrigatório.');
      return;
    }
    
    if (this.temErroEstoque()) {
      this.modalService.confirmarExclusao(
        'Alguns produtos têm estoque insuficiente. Deseja continuar mesmo assim?',
        () => {
          this.continuarSalvamento();
        }
      );
      return;
    }
    
    this.continuarSalvamento();
  }

  private continuarSalvamento(): void {
    const dadosParaEnviar = this.prepararDadosParaEnvio();
    
    // ✅✅✅ AVISO PARA EDIÇÃO COM QUANTIDADES MODIFICADAS
    if (this.modoEdicao && this.quantidadesModificadas()) {
      this.modalService.confirmarExclusao(
        '⚠️ ATENÇÃO: Quantidades modificadas!\n\n' +
        'A alteração de quantidades irá:\n' +
        '1. Reverter estoque dos lotes antigos\n' +
        '2. Aplicar PEPS novamente com as novas quantidades\n' +
        '3. Criar novos registros de lotes consumidos\n\n' +
        'Deseja continuar?',
        () => {
          this.executarSalvamento(dadosParaEnviar);
        }
      );
      return;
    }
    
    this.executarSalvamento(dadosParaEnviar);
  }

  private executarSalvamento(dadosParaEnviar: any): void {
    if (this.modoEdicao && this.vendaEdit.id) {
      this.vendaService.atualizarVenda(this.vendaEdit.id, dadosParaEnviar).subscribe({
        next: (vendaAtualizada) => {
          console.log('✅ [DEBUG-v46.9.2] Venda atualizada com sucesso:', vendaAtualizada.id);
          this.vendaSalva.emit();
          this.fechar();
          this.modalService.mostrarSucesso('Venda atualizada com sucesso!');
        },
        error: (error) => {
          console.error('❌ [DEBUG-v46.9.2] Erro ao atualizar:', error);
          
          if (error.error && (error.error.includes('ID do pedido já existe') || 
                             error.error.includes('Já existe outra venda') ||
                             error.error.includes('Já existe uma venda com este ID do pedido'))) {
            this.modalService.mostrarErroIdDuplicadoVenda(this.vendaEdit.idPedido);
          } else {
            this.modalService.mostrarErro('Erro ao atualizar venda: ' + (error.error || error.message));
          }
        }
      });
    } else {
      this.vendaService.criarVenda(dadosParaEnviar).subscribe({
        next: (vendaSalva) => {
          console.log('✅ [DEBUG-v46.9.2] Venda criada:', vendaSalva.id);
          this.vendaSalva.emit();
          this.fechar();
          this.modalService.mostrarSucesso('Venda criada com sucesso!');
        },
        error: (error) => {
          console.error('❌ [DEBUG-v46.9.2] Erro ao criar venda:', error);
          
          if (error.error && error.error.includes('Já existe uma venda com este ID do pedido')) {
            this.modalService.mostrarErroIdDuplicadoVenda(this.vendaEdit.idPedido);
          } else {
            this.modalService.mostrarErro('Erro ao criar venda: ' + (error.error || error.message));
          }
        }
      });
    }
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Venda' : 'Nova Venda';
  }

  // ✅✅✅ NOVO MÉTODO: Converter valor do input para número
  converterParaNumero(event: Event): number {
    const input = event.target as HTMLInputElement;
    const valor = input.value;
    
    console.log(`🔢 [DEBUG-v46.9.2] Converter para número: "${valor}" (tipo: ${input.type}, min: ${input.min})`);
    
    if (!valor || valor.trim() === '') {
      console.log('🔢 [DEBUG] Valor vazio, retornando 0');
      return 0;
    }
    
    // Tentar converter para número
    let numero: number;
    
    if (input.type === 'number' && input.min === '1') {
      // Para quantidade, usar parseInt (números inteiros)
      numero = parseInt(valor, 10);
      console.log(`🔢 [DEBUG] Usando parseInt para quantidade: ${valor} → ${numero}`);
    } else {
      // Para preço, usar parseFloat (números decimais)
      numero = parseFloat(valor);
      console.log(`🔢 [DEBUG] Usando parseFloat para preço: ${valor} → ${numero}`);
    }
    
    // Verificar se a conversão foi bem sucedida
    if (isNaN(numero)) {
      console.warn('⚠️ [DEBUG] Valor não é um número válido:', valor);
      
      // Tentar limpar o valor (remover caracteres não numéricos)
      const valorLimpo = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
      numero = parseFloat(valorLimpo);
      
      if (isNaN(numero)) {
        console.error('❌ [DEBUG] Não foi possível converter para número:', valor);
        return 0;
      }
      
      console.log(`🔢 [DEBUG] Valor limpo e convertido: ${valor} → ${valorLimpo} → ${numero}`);
    }
    
    // Garantir valores mínimos
    if (input.type === 'number' && input.min === '1') {
      // Quantidade mínima 1
      numero = Math.max(1, Math.floor(numero));
      console.log(`🔢 [DEBUG] Garantindo mínimo 1: → ${numero}`);
    } else if (input.type === 'number' && input.min === '0') {
      // Preço mínimo 0
      numero = Math.max(0, numero);
      console.log(`🔢 [DEBUG] Garantindo mínimo 0: → ${numero}`);
    }
    
    // Arredondar para 2 casas decimais para preços
    if (input.step === '0.01') {
      numero = Math.round(numero * 100) / 100;
      console.log(`🔢 [DEBUG] Arredondando para 2 casas decimais: → ${numero}`);
    }
    
    console.log(`✅ [DEBUG-v46.9.2] Valor final convertido: ${numero}`);
    return numero;
  }
}