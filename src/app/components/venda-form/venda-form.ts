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
import { Router } from '@angular/router';

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
  vendaEdit: Venda = this.getVendaVazia();
  
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
    private produtoService: ProdutoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔍 [DEBUG-v46.6] ngOnInit iniciado - Formulário de venda v46.6');
    console.log('🔍 [DEBUG] venda recebida no @Input:', this.venda);
    console.log('🔍 [DEBUG] Data inicial:', this.vendaEdit.data);
    this.carregarProdutos();
  }

  // ✅ NOVO: Método para criar venda vazia com data atual
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
    console.log('🔍 [DEBUG-v46.6] Inicializando formulário v46.6...');
    console.log('🔍 [DEBUG] this.venda:', this.venda);
    
    if (this.venda && this.venda.id) {
      // MODO EDIÇÃO: Carregar venda existente
      this.modoEdicao = true;
      this.vendaEdit = { ...this.venda };
      
      // ✅✅✅ CORREÇÃO v46.6: Garantir que precoUnitarioVenda tem valor
      if (this.vendaEdit.itens && this.vendaEdit.itens.length > 0) {
        this.vendaEdit.itens = this.vendaEdit.itens.map(item => {
          // Se precoUnitarioVenda não existe mas precoUnitario existe, copiar
          const precoUnitarioVenda = item.precoUnitarioVenda || item.precoUnitario || 0;
          
          const itemMapeado = {
            ...item,
            precoUnitarioVenda: precoUnitarioVenda,
            // Garantir que precoTotalItem existe e está correto
            precoTotalItem: item.precoTotalItem || (precoUnitarioVenda * item.quantidade) || 0
          };
          
          console.log('📦 [DEBUG-v46.6] Item mapeado:', {
            id: item.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitarioBackend: item.precoUnitario,
            precoUnitarioVenda: itemMapeado.precoUnitarioVenda,
            precoTotalItem: itemMapeado.precoTotalItem
          });
          
          return itemMapeado;
        });
      }
      
      // ✅ CORREÇÃO: Garantir formato de data correto para type="date"
      if (this.vendaEdit.data && this.vendaEdit.data.includes('T')) {
        this.vendaEdit.data = this.vendaEdit.data.split('T')[0];
      }
      
      // Garantir que itens existem
      if (!this.vendaEdit.itens) {
        this.vendaEdit.itens = [];
      }
      
      console.log('🔍 [DEBUG-v46.6] Modo EDIÇÃO ativado, itens:', this.vendaEdit.itens.length);
      console.log('🔍 [DEBUG-v46.6] Primeiro item carregado:', this.vendaEdit.itens[0]);
      console.log('🔍 [DEBUG-v46.6] Itens podem ser editados:', this.modoEdicao);
      
      // ✅ NOVO: Carregar dados adicionais da venda original
      if (this.vendaEdit.id) {
        this.vendaService.getVenda(this.vendaEdit.id).subscribe({
          next: (vendaCompleta) => {
            console.log('🔍 [DEBUG-v46.6] Venda completa carregada:', vendaCompleta);
          },
          error: (error) => {
            console.error('❌ Erro ao carregar venda completa:', error);
          }
        });
      }
    } else {
      // MODO NOVA VENDA
      this.modoEdicao = false;
      console.log('🔍 [DEBUG-v46.6] Modo NOVA VENDA ativado, data:', this.vendaEdit.data);
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
      this.verificarEstoque();
    } else {
      this.estoqueInsuficiente = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  // Método chamado quando a quantidade é alterada
  onQuantidadeChange(): void {
    console.log('🔍 [DEBUG] Quantidade alterada:', this.quantidadeSelecionada);
    
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
        this.onProdutoChange();
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
    
    console.log('🛒 [DEBUG-v46.6] Produto adicionado ao carrinho');
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
      console.log('🛒 [DEBUG-v46.6] Item removido do carrinho');
    }
  }

  // ✅ NOVO: Método para verificar se produto já está no carrinho
  produtoJaNoCarrinho(produtoId: number): boolean {
    return this.vendaEdit.itens.some(item => item.produtoId === produtoId);
  }

  // ✅✅✅ CORREÇÃO v46.6: Permite editar quantidade em modo edição
  atualizarQuantidade(item: ItemVenda, novaQuantidade: string | number): void {
    const quantidade = typeof novaQuantidade === 'string' ? parseInt(novaQuantidade) : novaQuantidade;
    
    if (quantidade && quantidade > 0) {
      // ✅ Validação de estoque apenas em modo edição (para novas quantidades maiores)
      if (this.modoEdicao) {
        // Verificar estoque se for aumento
        this.verificarEstoqueItem(item, quantidade);
      }
      
      item.quantidade = quantidade;
      item.precoTotalItem = calcularPrecoTotalItem(item);
      this.atualizarPrecoTotalVenda();
      console.log('📝 [DEBUG-v46.6] Quantidade atualizada:', item.quantidade);
    }
  }

  // ✅✅✅ CORREÇÃO v46.6: Permite editar preço em modo edição
  atualizarPrecoUnitario(item: ItemVenda, novoPreco: string | number): void {
    const preco = typeof novoPreco === 'string' ? parseFloat(novoPreco) : novoPreco;
    
    if (preco && preco >= 0) {
      item.precoUnitarioVenda = preco;
      item.precoTotalItem = calcularPrecoTotalItem(item);
      this.atualizarPrecoTotalVenda();
      console.log('📝 [DEBUG-v46.6] Preço unitário atualizado:', item.precoUnitarioVenda);
    }
  }

  // ✅ NOVO: Validação de estoque para item específico durante edição
  verificarEstoqueItem(item: ItemVenda, novaQuantidade: number): void {
    if (!item.produtoId) return;
    
    this.produtoService.getProduto(item.produtoId).subscribe({
      next: (produtoAtualizado) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        
        // Verificar se a nova quantidade excede o estoque
        if (novaQuantidade > estoqueAtual) {
          this.erroEstoque[item.produtoId] = 
            `Estoque insuficiente! Disponível: ${estoqueAtual} unidades, Solicitado: ${novaQuantidade}`;
          
          // Mostrar alerta apenas se for aumento significativo
          if (novaQuantidade > item.quantidade) {
            alert(`Estoque insuficiente para ${produtoAtualizado.nome}!\n` +
                  `Disponível: ${estoqueAtual} unidades\n` +
                  `Solicitado: ${novaQuantidade} unidades`);
          }
        } else {
          delete this.erroEstoque[item.produtoId];
        }
      },
      error: () => {
        console.error('Erro ao verificar estoque do item');
      }
    });
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
    if (!this.vendaEdit.data) {
      const now = new Date();
      const dataFormatada = now.toISOString().split('T')[0];
      this.vendaEdit.data = dataFormatada;
    }
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  // ✅✅✅ NOVO: Método para preparar dados para envio (v46.6)
  prepararDadosParaEnvio(): any {
    const dadosVenda = {
      idPedido: this.vendaEdit.idPedido,
      plataforma: this.vendaEdit.plataforma,
      data: this.vendaEdit.data,
      precoVenda: this.calcularTotalCarrinho(),
      fretePagoPeloCliente: this.vendaEdit.fretePagoPeloCliente || 0,
      custoEnvio: this.vendaEdit.custoEnvio || 0,
      tarifaPlataforma: this.vendaEdit.tarifaPlataforma || 0,
      // ✅ ENVIAR ITENS MODIFICADOS (CRÍTICO para v46.6)
      itens: this.vendaEdit.itens.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitarioVenda: item.precoUnitarioVenda || 0
      }))
    };
    
    console.log('📤 [DEBUG-v46.6] Dados preparados para backend:', dadosVenda);
    console.log('📤 [DEBUG-v46.6] Número de itens:', dadosVenda.itens.length);
    console.log('📤 [DEBUG-v46.6] Modo edição:', this.modoEdicao);
    
    return dadosVenda;
  }

  salvarVenda(): void {
    console.log('💾 [DEBUG-v46.6] Salvando venda v46.6...');
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
    
    const dadosParaEnviar = this.prepararDadosParaEnvio();
    
    if (this.modoEdicao && this.vendaEdit.id) {
      // ✅ CORREÇÃO v46.6: Envia dados completos com itens para backend
      this.vendaService.atualizarVenda(this.vendaEdit.id, dadosParaEnviar).subscribe({
        next: (vendaAtualizada) => {
          console.log('✅ [DEBUG-v46.6] Venda atualizada com sucesso:', vendaAtualizada);
          this.vendaSalva.emit();
          this.fechar();
          alert('Venda atualizada com sucesso!');
        },
        error: (error) => {
          console.error('❌ [DEBUG-v46.6] Erro ao atualizar:', error);
          console.error('❌ [DEBUG-v46.6] Status:', error.status);
          console.error('❌ [DEBUG-v46.6] Mensagem:', error.error);
          alert('Erro ao atualizar venda: ' + (error.error || error.message));
        }
      });
    } else {
      // Modo criação (mantido como estava)
      this.vendaService.criarVenda(dadosParaEnviar).subscribe({
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