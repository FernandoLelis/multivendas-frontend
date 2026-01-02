import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra, criarCompraVazia, calcularCustoTotalCompra } from '../../models/compra';
import { ItemCompra, criarItemCompraDeProduto, calcularCustoTotalItem } from '../../models/item-compra';
import { Produto } from '../../models/produto';
import { ComprasService } from '../../services/compra.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';

@Component({
  selector: 'app-compra-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ProdutoFormComponent,
    BrazilianCurrencyPipe
  ],
  templateUrl: './compra-form.html',
  styleUrls: ['./compra-form.css']
})
export class CompraFormComponent implements OnInit {
  @Input() compra: Compra | null = null;
  @Output() fecharModal = new EventEmitter<void>();
  @Output() compraSalva = new EventEmitter<void>();
  
  // Dados da compra principal
  compraEdit: Compra = this.getCompraVazia();
  
  // Produtos disponíveis para compra
  produtos: Produto[] = [];
  categoriaFixa: string = 'Produto'; // ✅ CATEGORIA FIXA - APENAS PRODUTOS
  modoEdicao: boolean = false;
  
  // Sistema de carrinho (similar ao de vendas)
  produtoSelecionado: Produto | null = null;
  quantidadeSelecionada: number = 1;
  custoUnitarioSelecionado: number = 0;
  custoTotalSelecionado: number = 0;
  
  // Estado do modal de produto
  mostrarModalProduto: boolean = false;
  
  // Controle de estoque (para verificar se produto já existe no estoque)
  produtoJaNoEstoque: boolean = false;
  saldoAtual: number = 0;
  
  // Quantidade do produto já no carrinho
  quantidadeNoCarrinho: number = 0;

  constructor(
    private compraService: ComprasService,
    private produtoService: ProdutoService
  ) {}

  ngOnInit(): void {
    console.log('🔍 [COMPRA-FORM] ngOnInit iniciado');
    console.log('🔍 [COMPRA-FORM] compra recebida no @Input:', this.compra);
    console.log('🔍 [COMPRA-FORM] Data inicial:', this.compraEdit.dataEntrada);
    this.carregarProdutos();
  }

  // ✅ Método para criar compra vazia com data atual
  private getCompraVazia(): Compra {
    const now = new Date();
    const dataFormatada = now.toISOString().split('T')[0];
    
    return {
      dataEntrada: dataFormatada,
      idPedidoCompra: '',
      fornecedor: '',
      categoria: 'Produto', // ✅ CATEGORIA FIXA
      observacoes: '',
      itens: []
    };
  }

  carregarProdutos(): void {
    console.log('🔍 [COMPRA-FORM] Carregando produtos...');
    this.produtoService.getProdutos().subscribe({
      next: (produtos: Produto[]) => {
        this.produtos = produtos;
        console.log('✅ [COMPRA-FORM] Produtos carregados:', produtos.length);
        
        this.inicializarFormulario();
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  inicializarFormulario(): void {
    console.log('🔍 [COMPRA-FORM] Inicializando formulário...');
    console.log('🔍 [COMPRA-FORM] this.compra:', this.compra);
    
    if (this.compra && this.compra.id) {
      // MODO EDIÇÃO: Carregar compra existente
      this.modoEdicao = true;
      this.compraEdit = { ...this.compra };
      
      // ✅ CORREÇÃO: Garantir formato de data correto para type="date"
      if (this.compraEdit.dataEntrada && this.compraEdit.dataEntrada.includes('T')) {
        this.compraEdit.dataEntrada = this.compraEdit.dataEntrada.split('T')[0];
      }
      
      // Garantir que itens existem (para compatibilidade)
      if (!this.compraEdit.itens) {
        this.compraEdit.itens = [];
      }
      
      console.log('🔍 [COMPRA-FORM] Modo EDIÇÃO, itens:', this.compraEdit.itens.length);
    } else {
      // MODO NOVA COMPRA: Já iniciou com data preenchida no getCompraVazia()
      this.modoEdicao = false;
      console.log('🔍 [COMPRA-FORM] Modo NOVA COMPRA, data:', this.compraEdit.dataEntrada);
    }
  }

  // Método para calcular quantidade já no carrinho
  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    
    const quantidadeTotal = this.compraEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
    
    return quantidadeTotal;
  }

  // Método chamado quando o produto é alterado
  onProdutoChange(): void {
    console.log('🔍 [COMPRA-FORM] Produto alterado:', this.produtoSelecionado?.nome);
    
    if (this.produtoSelecionado) {
      // Verificar se produto já tem estoque
      this.verificarProdutoNoEstoque();
    } else {
      this.produtoJaNoEstoque = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  // Verificar se produto já existe no estoque
  verificarProdutoNoEstoque(): void {
    if (!this.produtoSelecionado) return;
    
    const produtoId = this.produtoSelecionado.id!;
    
    // Calcular quanto já está no carrinho
    this.quantidadeNoCarrinho = this.calcularQuantidadeNoCarrinho(produtoId);
    
    // Buscar produto atualizado para pegar estoque
    this.produtoService.getProduto(produtoId).subscribe({
      next: (produtoAtualizado: Produto) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        this.saldoAtual = estoqueAtual;
        
        // Produto já tem estoque
        this.produtoJaNoEstoque = estoqueAtual > 0;
        
        console.log(`📦 [COMPRA-FORM] VERIFICAÇÃO ESTOQUE:`);
        console.log(`📦 Disponível: ${estoqueAtual} unidades`);
        console.log(`📦 No carrinho: ${this.quantidadeNoCarrinho} unidades`);
        console.log(`📦 Já no estoque: ${this.produtoJaNoEstoque}`);
      },
      error: (error: any) => {
        console.error('Erro ao verificar estoque:', error);
        this.produtoJaNoEstoque = false;
      }
    });
  }

  // Método chamado quando a quantidade é alterada
  onQuantidadeChange(): void {
    console.log('🔍 [COMPRA-FORM] Quantidade alterada:', this.quantidadeSelecionada);
    
    // Calcular custo total quando quantidade muda
    this.calcularCustoTotal();
  }

  // Método para lidar com seleção de produto no select
  onProdutoSelecionado(event: any): void {
    const produtoId = event.target.value;
    console.log('🔍 [COMPRA-FORM] onProdutoSelecionado chamado:', produtoId);
    
    if (produtoId === 'novo') {
      this.abrirModalProduto();
      this.produtoSelecionado = null;
      this.produtoJaNoEstoque = false;
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
        this.produtoJaNoEstoque = false;
        this.quantidadeNoCarrinho = 0;
      }
    }
  }

  // Métodos para cálculo automático
  calcularCustoTotal(): void {
    const custoUnitario = this.custoUnitarioSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    
    if (custoUnitario && quantidade) {
      this.custoTotalSelecionado = custoUnitario * quantidade;
      this.custoTotalSelecionado = Math.round(this.custoTotalSelecionado * 100) / 100;
    } else {
      this.custoTotalSelecionado = 0;
    }
  }

  calcularCustoUnitario(): void {
    const custoTotal = this.custoTotalSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    
    if (custoTotal && quantidade && quantidade > 0) {
      this.custoUnitarioSelecionado = custoTotal / quantidade;
      this.custoUnitarioSelecionado = Math.round(this.custoUnitarioSelecionado * 100) / 100;
    } else {
      this.custoUnitarioSelecionado = 0;
    }
  }

  // ✅ ATUALIZADO: Validação para adicionar ao carrinho
  adicionarAoCarrinho(): void {
    if (!this.produtoSelecionado) {
      alert('Por favor, selecione um produto primeiro.');
      return;
    }
    
    if (this.quantidadeSelecionada <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    
    if (this.custoTotalSelecionado <= 0) {
      alert('O custo total deve ser maior que zero.');
      return;
    }
    
    const produtoId = this.produtoSelecionado.id!;
    
    // Verificar se produto já está no carrinho
    const itemExistente = this.compraEdit.itens.find(
      item => item.produtoId === produtoId
    );
    
    if (itemExistente) {
      // Atualizar quantidade e custo do item existente
      itemExistente.quantidade += this.quantidadeSelecionada;
      itemExistente.custoUnitario = this.custoUnitarioSelecionado;
      itemExistente.custoTotal = calcularCustoTotalItem(itemExistente);
    } else {
      // Criar novo item no carrinho
      const novoItem: ItemCompra = criarItemCompraDeProduto(
        this.produtoSelecionado, 
        this.quantidadeSelecionada,
        this.custoUnitarioSelecionado
      );
      
      novoItem.custoTotal = this.custoTotalSelecionado;
      
      this.compraEdit.itens.push(novoItem);
    }
    
    // Atualizar custo total da compra
    this.atualizarCustoTotalCompra();
    
    // Limpar seleção
    this.limparSelecaoProduto();
    
    console.log('🛒 [COMPRA-FORM] Produto adicionado ao carrinho');
    console.log('🛒 [COMPRA-FORM] Itens no carrinho:', this.compraEdit.itens);
  }

  // Método para limpar seleção
  limparSelecaoProduto(): void {
    this.produtoSelecionado = null;
    this.quantidadeSelecionada = 1;
    this.custoUnitarioSelecionado = 0;
    this.custoTotalSelecionado = 0;
    this.produtoJaNoEstoque = false;
    this.quantidadeNoCarrinho = 0;
    
    // Resetar o select
    const selectElement = document.getElementById('produtoSelecionado') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = '';
    }
  }

  removerDoCarrinho(index: number): void {
    if (confirm('Remover este produto do carrinho?')) {
      this.compraEdit.itens.splice(index, 1);
      this.atualizarCustoTotalCompra();
      console.log('🛒 [COMPRA-FORM] Item removido do carrinho');
    }
  }

  // ✅ NOVO: Método para verificar se produto já está no carrinho
  produtoJaNoCarrinho(produtoId: number): boolean {
    return this.compraEdit.itens.some(item => item.produtoId === produtoId);
  }

  // ✅ ATUALIZADO: Carrinho bloqueado para edição (mesmo padrão de vendas)
  atualizarQuantidade(item: ItemCompra, novaQuantidade: number): void {
    alert('Para alterar a quantidade, remova o produto do carrinho e adicione novamente com a nova quantidade na seção "Adicionar Produto".');
    return;
  }

  atualizarCustoUnitario(item: ItemCompra, novoCusto: number): void {
    alert('Para alterar o custo, remova o produto do carrinho e adicione novamente com o novo custo na seção "Adicionar Produto".');
    return;
  }

  atualizarCustoTotalCompra(): void {
    this.compraEdit.custoTotal = calcularCustoTotalCompra(this.compraEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.compraEdit.itens.reduce((total, item) => {
      return total + (item.custoTotal || 0);
    }, 0);
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

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarCompra(): void {
    console.log('💾 [COMPRA-FORM] Salvando compra...');
    console.log('💾 [COMPRA-FORM] Modo:', this.modoEdicao ? 'EDIÇÃO' : 'NOVA COMPRA');
    console.log('💾 [COMPRA-FORM] Compra completa:', this.compraEdit);
    console.log('💾 [COMPRA-FORM] Número de itens:', this.compraEdit.itens.length);
    
    if (this.compraEdit.itens.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho.');
      return;
    }
    
    if (!this.compraEdit.idPedidoCompra.trim()) {
      alert('ID do Pedido de Compra é obrigatório.');
      return;
    }
    
    if (!this.compraEdit.fornecedor.trim()) {
      alert('Fornecedor é obrigatório.');
      return;
    }
    
    // ✅ GARANTIR CATEGORIA FIXA
    this.compraEdit.categoria = 'Produto';
    
    if (this.modoEdicao && this.compraEdit.id) {
      this.compraService.atualizarCompraMultiplos(this.compraEdit.id, this.compraEdit).subscribe({
        next: (compraAtualizada: Compra) => {
          console.log('✅ Compra atualizada:', compraAtualizada);
          this.compraSalva.emit();
          this.fechar();
        },
        error: (error: any) => {
          console.error('❌ Erro ao atualizar:', error);
          alert('Erro ao atualizar compra! Verifique o console.');
        }
      });
    } else {
      this.compraService.criarCompra(this.compraEdit).subscribe({
        next: (compraSalva: Compra) => {
          console.log('✅ Compra criada:', compraSalva);
          this.compraSalva.emit();
          this.fechar();
        },
        error: (error: any) => {
          console.error('❌ Erro ao criar compra:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Mensagem:', error.message);
          alert('Erro ao salvar compra! Verifique o console.');
        }
      });
    }
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Compra' : 'Nova Compra';
  }
}