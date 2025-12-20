import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Venda, criarVendaVazia, calcularPrecoTotalVenda } from '../../models/venda';
import { ItemVenda, criarItemVendaDeProduto, calcularPrecoTotalItem } from '../../models/item-venda';
import { Produto } from '../../models/produto';
import { VendaService } from '../../services/venda.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';

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
  
  // Dados da venda principal
  vendaEdit: Venda = this.getVendaVazia(); // ✅ ALTERADO: Usar método que já preenche data
  
  // Produtos disponíveis para venda
  produtos: Produto[] = [];
  plataformas: string[] = ['Amazon', 'Mercado Livre', 'Shopee', 'Outro'];
  modoEdicao: boolean = false;
  
  // Sistema de carrinho
  produtoSelecionado: Produto | null = null;
  quantidadeSelecionada: number = 1;
  precoUnitarioSelecionado: number = 0;
  precoTotalSelecionado: number = 0;
  
  // Estado do modal de produto
  mostrarModalProduto: boolean = false;
  
  // Controle de estoque
  estoqueInsuficiente: boolean = false;
  estoqueDisponivel: number = 0;
  quantidadeSolicitada: number = 0;
  verificandoEstoque: boolean = false;
  
  // Quantidade do produto já no carrinho
  quantidadeNoCarrinho: number = 0;
  
  // Validações para itens no carrinho
  erroEstoque: { [produtoId: number]: string } = {};

  constructor(
    private vendaService: VendaService,
    private produtoService: ProdutoService
  ) {}

  ngOnInit(): void {
    console.log('🔍 [DEBUG] ngOnInit iniciado');
    console.log('🔍 [DEBUG] venda recebida no @Input:', this.venda);
    console.log('🔍 [DEBUG] Data inicial:', this.vendaEdit.data); // ✅ DEBUG
    this.carregarProdutos();
  }

  // ✅ NOVO: Método para criar venda vazia com data atual (igual aos outros formulários)
  private getVendaVazia(): Venda {
    const now = new Date();
    // ✅ Formato correto para type="date": YYYY-MM-DD
    const dataFormatada = now.toISOString().split('T')[0];
    
    return {
      data: dataFormatada, // ✅ Já vem preenchida com data atual
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
    console.log('🔍 [DEBUG] Carregando produtos...');
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        console.log('✅ [DEBUG] Produtos carregados:', produtos.length);
        
        this.inicializarFormulario();
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  inicializarFormulario(): void {
    console.log('🔍 [DEBUG] Inicializando formulário...');
    console.log('🔍 [DEBUG] this.venda:', this.venda);
    
    if (this.venda && this.venda.id) {
      // MODO EDIÇÃO: Carregar venda existente
      this.modoEdicao = true;
      this.vendaEdit = { ...this.venda };
      
      // ✅ CORREÇÃO: Garantir formato de data correto para type="date"
      if (this.vendaEdit.data && this.vendaEdit.data.includes('T')) {
        // Se data veio com datetime, converter para date only
        this.vendaEdit.data = this.vendaEdit.data.split('T')[0];
      }
      
      // Garantir que itens existem (para compatibilidade)
      if (!this.vendaEdit.itens) {
        this.vendaEdit.itens = [];
      }
      
      console.log('🔍 [DEBUG] Modo EDIÇÃO, itens:', this.vendaEdit.itens.length);
    } else {
      // MODO NOVA VENDA: Já iniciou com data preenchida no getVendaVazia()
      this.modoEdicao = false;
      console.log('🔍 [DEBUG] Modo NOVA VENDA, data:', this.vendaEdit.data);
    }
  }

  // Método para calcular quantidade já no carrinho
  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    
    const quantidadeTotal = this.vendaEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
    
    return quantidadeTotal;
  }

  // Verificação de estoque considerando carrinho
  verificarEstoque(): void {
    if (!this.produtoSelecionado) return;
    
    const quantidade = this.quantidadeSelecionada;
    const produtoId = this.produtoSelecionado.id!;
    
    if (quantidade && quantidade > 0) {
      this.verificandoEstoque = true;
      this.quantidadeSolicitada = quantidade;
      
      // Calcular quanto já está no carrinho
      this.quantidadeNoCarrinho = this.calcularQuantidadeNoCarrinho(produtoId);
      
      // Buscar produto atualizado para pegar estoque correto
      this.produtoService.getProduto(produtoId).subscribe({
        next: (produtoAtualizado) => {
          const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
          this.estoqueDisponivel = estoqueAtual;
          
          // ✅ ATUALIZADO: Verificação considerando carrinho
          const quantidadeTotalRequisitada = this.quantidadeNoCarrinho + quantidade;
          this.estoqueInsuficiente = quantidadeTotalRequisitada > estoqueAtual;
          
          this.verificandoEstoque = false;
          
          console.log(`📦 ESTOQUE VERIFICADO:`);
          console.log(`📦 Disponível: ${estoqueAtual} unidades`);
          console.log(`📦 No carrinho: ${this.quantidadeNoCarrinho} unidades`);
          console.log(`📦 Solicitado: ${quantidade} unidades`);
          console.log(`📦 Total requisitado: ${quantidadeTotalRequisitada} unidades`);
          console.log(`📦 Insuficiente: ${this.estoqueInsuficiente}`);
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

  // Método chamado quando o produto é alterado
  onProdutoChange(): void {
    console.log('🔍 [DEBUG] Produto alterado:', this.produtoSelecionado?.nome);
    
    if (this.produtoSelecionado) {
      // Verificar estoque quando um produto é selecionado
      this.verificarEstoque();
    } else {
      this.estoqueInsuficiente = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  // Método chamado quando a quantidade é alterada
  onQuantidadeChange(): void {
    console.log('🔍 [DEBUG] Quantidade alterada:', this.quantidadeSelecionada);
    
    // Verificar estoque
    if (this.produtoSelecionado) {
      this.verificarEstoque();
    }
  }

  // Método para lidar com seleção de produto no select
  onProdutoSelecionado(event: any): void {
    const produtoId = event.target.value;
    console.log('🔍 [DEBUG] onProdutoSelecionado chamado:', produtoId);
    
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
        this.onProdutoChange(); // Chamar verificação de estoque
      } else {
        this.produtoSelecionado = null;
        this.estoqueInsuficiente = false;
        this.quantidadeNoCarrinho = 0;
      }
    }
  }

  // ✅ ATUALIZADO: Botão "Comprar Mais" sempre habilitado quando sem estoque
  abrirModalCompra(): void {
    console.log('🔍 [DEBUG] Abrindo modal de compra para produto:', this.produtoSelecionado?.id);
    
    if (this.produtoSelecionado) {
      this.abrirCompraParaProduto.emit(this.produtoSelecionado);
    } else {
      alert('Por favor, selecione um produto primeiro.');
    }
  }

  // Métodos para cálculo automático
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

  // ✅ ATUALIZADO: Validação melhorada
  adicionarAoCarrinho(): void {
    if (!this.produtoSelecionado) {
      alert('Por favor, selecione um produto primeiro.');
      return;
    }
    
    if (this.quantidadeSelecionada <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    
    if (this.precoTotalSelecionado <= 0) {
      alert('O preço total deve ser maior que zero.');
      return;
    }
    
    // ✅ ATUALIZADO: Se sem estoque, não bloqueia - apenas alerta
    if (this.estoqueInsuficiente) {
      const confirmar = confirm(`Estoque insuficiente!\n\n` +
        `Disponível: ${this.estoqueDisponivel} unidades\n` +
        `Já no carrinho: ${this.quantidadeNoCarrinho} unidades\n` +
        `Solicitado: ${this.quantidadeSolicitada} unidades\n\n` +
        `Deseja continuar mesmo assim?`);
      
      if (!confirmar) {
        return;
      }
    }
    
    const produtoId = this.produtoSelecionado.id!;
    
    // Verificar se produto já está no carrinho
    const itemExistente = this.vendaEdit.itens.find(
      item => item.produtoId === produtoId
    );
    
    if (itemExistente) {
      // Verificar se ainda tem estoque disponível
      const novaQuantidadeTotal = itemExistente.quantidade + this.quantidadeSelecionada;
      
      if (novaQuantidadeTotal > this.estoqueDisponivel && !this.estoqueInsuficiente) {
        alert(`Estoque insuficiente! Você já tem ${itemExistente.quantidade} unidades no carrinho. 
        Disponível: ${this.estoqueDisponivel} unidades.
        Não é possível adicionar mais ${this.quantidadeSelecionada} unidades.`);
        return;
      }
      
      // Atualizar quantidade e preço do item existente
      itemExistente.quantidade = novaQuantidadeTotal;
      itemExistente.precoUnitarioVenda = this.precoUnitarioSelecionado;
      itemExistente.precoTotalItem = calcularPrecoTotalItem(itemExistente);
    } else {
      // Criar novo item no carrinho
      const novoItem: ItemVenda = criarItemVendaDeProduto(
        this.produtoSelecionado, 
        this.quantidadeSelecionada
      );
      
      novoItem.precoUnitarioVenda = this.precoUnitarioSelecionado;
      novoItem.precoTotalItem = this.precoTotalSelecionado;
      
      this.vendaEdit.itens.push(novoItem);
    }
    
    // Atualizar preço total da venda
    this.atualizarPrecoTotalVenda();
    
    // Limpar seleção
    this.limparSelecaoProduto();
    
    console.log('🛒 [DEBUG] Produto adicionado ao carrinho');
    console.log('🛒 [DEBUG] Itens no carrinho:', this.vendaEdit.itens);
  }

  // Método para limpar seleção
  limparSelecaoProduto(): void {
    this.produtoSelecionado = null;
    this.quantidadeSelecionada = 1;
    this.precoUnitarioSelecionado = 0;
    this.precoTotalSelecionado = 0;
    this.estoqueInsuficiente = false;
    this.quantidadeNoCarrinho = 0;
    
    // Resetar o select
    const selectElement = document.getElementById('produtoSelecionado') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = '';
    }
  }

  removerDoCarrinho(index: number): void {
    if (confirm('Remover este produto do carrinho?')) {
      this.vendaEdit.itens.splice(index, 1);
      this.atualizarPrecoTotalVenda();
      console.log('🛒 [DEBUG] Item removido do carrinho');
    }
  }

  // ✅ NOVO: Método para verificar se produto já está no carrinho
  produtoJaNoCarrinho(produtoId: number): boolean {
    return this.vendaEdit.itens.some(item => item.produtoId === produtoId);
  }

  // ✅ ATUALIZADO: Carrinho bloqueado para edição
  atualizarQuantidade(item: ItemVenda, novaQuantidade: number): void {
    // ✅ BLOQUEADO: Não permite editar quantidade no carrinho
    alert('Para alterar a quantidade, remova o produto do carrinho e adicione novamente com a nova quantidade na seção "Adicionar Produto".');
    return;
  }

  atualizarPrecoUnitario(item: ItemVenda, novoPreco: number): void {
    // ✅ BLOQUEADO: Não permite editar preço no carrinho
    alert('Para alterar o preço, remova o produto do carrinho e adicione novamente com o novo preço na seção "Adicionar Produto".');
    return;
  }

  atualizarPrecoTotalVenda(): void {
    this.vendaEdit.precoVenda = calcularPrecoTotalVenda(this.vendaEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.vendaEdit.itens.reduce((total, item) => {
      return total + (item.precoTotalItem || 0);
    }, 0);
  }

  verificarEstoqueProduto(item: ItemVenda): void {
    if (!item.produtoId || !item.produto) return;
    
    this.verificandoEstoque = true;
    
    this.produtoService.getProduto(item.produtoId).subscribe({
      next: (produtoAtualizado) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        
        if (item.quantidade > estoqueAtual) {
          this.erroEstoque[item.produtoId] = 
            `Estoque insuficiente! Disponível: ${estoqueAtual} unidades`;
        } else {
          delete this.erroEstoque[item.produtoId];
        }
        
        this.verificandoEstoque = false;
      },
      error: () => {
        this.verificandoEstoque = false;
      }
    });
  }

  temErroEstoque(): boolean {
    return Object.keys(this.erroEstoque).length > 0;
  }

  // Modal de produto
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

  // ✅ ATUALIZADO: Validação de data já vem preenchida
  validarData(): void {
    // Data já vem preenchida automaticamente no getVendaVazia()
    // Este método mantém compatibilidade
    if (!this.vendaEdit.data) {
      const now = new Date();
      const dataFormatada = now.toISOString().split('T')[0];
      this.vendaEdit.data = dataFormatada;
    }
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarVenda(): void {
    console.log('💾 [DEBUG] Salvando venda...');
    console.log('💾 [DEBUG] Modo:', this.modoEdicao ? 'EDIÇÃO' : 'NOVA VENDA');
    console.log('💾 [DEBUG] Venda completa:', this.vendaEdit);
    console.log('💾 [DEBUG] Número de itens:', this.vendaEdit.itens.length);
    
    if (this.vendaEdit.itens.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho.');
      return;
    }
    
    if (!this.vendaEdit.idPedido.trim()) {
      alert('ID do Pedido é obrigatório.');
      return;
    }
    
    if (this.temErroEstoque()) {
      const confirmar = confirm('Alguns produtos têm estoque insuficiente. Deseja continuar mesmo assim?');
      if (!confirmar) return;
    }
    
    if (this.modoEdicao && this.vendaEdit.id) {
      this.vendaService.atualizarVenda(this.vendaEdit.id, this.vendaEdit).subscribe({
        next: (vendaAtualizada) => {
          console.log('✅ Venda atualizada:', vendaAtualizada);
          this.vendaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro ao atualizar:', error);
          alert('Erro ao atualizar venda! Verifique o console.');
        }
      });
    } else {
      this.vendaService.criarVenda(this.vendaEdit).subscribe({
        next: (vendaSalva) => {
          console.log('✅ Venda criada:', vendaSalva);
          this.vendaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro ao criar venda:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Mensagem:', error.message);
          alert('Erro ao salvar venda! Verifique o console.');
        }
      });
    }
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Venda' : 'Nova Venda';
  }
}