import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra, criarCompraVazia, calcularCustoTotalCompra } from '../../models/compra';
import { ItemCompra, criarItemCompraVazio, validarItemCompra } from '../../models/item-compra';
import { Produto } from '../../models/produto';
import { ComprasService } from '../../services/compra.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { ModalService } from '../../services/modal.service';

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
  categoriaFixa: string = 'Produto';
  modoEdicao: boolean = false;
  
  // Sistema de carrinho
  produtoSelecionado: Produto | null = null;
  quantidadeSelecionada: number = 1;
  custoUnitarioSelecionado: number = 0;
  custoTotalSelecionado: number = 0;
  
  // Estado do modal de produto
  mostrarModalProduto: boolean = false;
  
  // Controle de estoque
  produtoJaNoEstoque: boolean = false;
  saldoAtual: number = 0;
  
  // Quantidade do produto já no carrinho
  quantidadeNoCarrinho: number = 0;

  constructor(
    private compraService: ComprasService,
    private produtoService: ProdutoService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    console.log('🔍 [COMPRA-FORM-v46.6] ngOnInit iniciado');
    console.log('🔍 [COMPRA-FORM] compra recebida no @Input:', this.compra);
    console.log('🔍 [COMPRA-FORM] Data inicial:', this.compraEdit.dataEntrada);
    this.carregarProdutos();
  }

  private getCompraVazia(): Compra {
    const now = new Date();
    const dataFormatada = now.toISOString().split('T')[0];
    
    return {
      dataEntrada: dataFormatada,
      idPedidoCompra: '',
      fornecedor: '',
      categoria: 'Produto',
      observacoes: '',
      itens: []
    };
  }

  private formatarDataParaBackend(data: string): string {
    if (!data) {
      const now = new Date();
      return now.toISOString().split('T')[0] + 'T00:00:00Z';
    }
    
    if (data.includes('T') && data.includes('Z')) {
      return data;
    }
    
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${data}T00:00:00Z`;
    }
    
    return data;
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
    console.log('🔍 [COMPRA-FORM-v46.6] Inicializando formulário...');
    console.log('🔍 [COMPRA-FORM] this.compra:', this.compra);
    
    if (this.compra && this.compra.id) {
      this.modoEdicao = true;
      this.compraEdit = { ...this.compra };
      
      if (this.compraEdit.dataEntrada && this.compraEdit.dataEntrada.includes('T')) {
        this.compraEdit.dataEntrada = this.compraEdit.dataEntrada.split('T')[0];
      }
      
      if (!this.compraEdit.itens) {
        this.compraEdit.itens = [];
      }
      
      console.log('🔍 [COMPRA-FORM-v46.6] Modo EDIÇÃO, itens:', this.compraEdit.itens.length);
    } else {
      this.modoEdicao = false;
      console.log('🔍 [COMPRA-FORM-v46.6] Modo NOVA COMPRA, data:', this.compraEdit.dataEntrada);
    }
  }

  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    
    const quantidadeTotal = this.compraEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
    
    return quantidadeTotal;
  }

  onProdutoChange(): void {
    console.log('🔍 [COMPRA-FORM] Produto alterado:', this.produtoSelecionado?.nome);
    
    if (this.produtoSelecionado) {
      this.verificarProdutoNoEstoque();
    } else {
      this.produtoJaNoEstoque = false;
      this.quantidadeNoCarrinho = 0;
    }
  }

  verificarProdutoNoEstoque(): void {
    if (!this.produtoSelecionado) return;
    
    const produtoId = this.produtoSelecionado.id!;
    
    this.quantidadeNoCarrinho = this.calcularQuantidadeNoCarrinho(produtoId);
    
    this.produtoService.getProduto(produtoId).subscribe({
      next: (produtoAtualizado: Produto) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        this.saldoAtual = estoqueAtual;
        
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

  onQuantidadeChange(): void {
    console.log('🔍 [COMPRA-FORM] Quantidade alterada:', this.quantidadeSelecionada);
    this.calcularCustoTotal();
  }

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
        this.onProdutoChange();
      } else {
        this.produtoSelecionado = null;
        this.produtoJaNoEstoque = false;
        this.quantidadeNoCarrinho = 0;
      }
    }
  }

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

  adicionarAoCarrinho(): void {
    if (!this.produtoSelecionado) {
      this.modalService.mostrarErro('Por favor, selecione um produto primeiro.');
      return;
    }
    
    if (this.quantidadeSelecionada <= 0) {
      this.modalService.mostrarErro('A quantidade deve ser maior que zero.');
      return;
    }
    
    if (this.custoTotalSelecionado <= 0) {
      this.modalService.mostrarErro('O custo total deve ser maior que zero.');
      return;
    }
    
    const produtoId = this.produtoSelecionado.id!;
    
    const itemExistente = this.compraEdit.itens.find(
      item => item.produtoId === produtoId
    );
    
    if (itemExistente) {
      if (this.modoEdicao) {
        itemExistente.quantidade = this.quantidadeSelecionada;
        itemExistente.custoUnitario = this.custoUnitarioSelecionado;
        itemExistente.custoTotal = this.calcularCustoTotalItem(itemExistente);
      } else {
        itemExistente.quantidade += this.quantidadeSelecionada;
        itemExistente.custoUnitario = this.custoUnitarioSelecionado;
        itemExistente.custoTotal = this.calcularCustoTotalItem(itemExistente);
      }
    } else {
      const novoItem: ItemCompra = {
        produtoId: this.produtoSelecionado.id!,
        produtoNome: this.produtoSelecionado.nome,
        produtoSku: this.produtoSelecionado.sku || '',
        quantidade: this.quantidadeSelecionada,
        custoUnitario: this.custoUnitarioSelecionado,
        custoTotal: this.custoTotalSelecionado
      };
      
      this.compraEdit.itens.push(novoItem);
    }
    
    this.atualizarCustoTotalCompra();
    this.limparSelecaoProduto();
    
    console.log('🛒 [COMPRA-FORM-v46.6] Produto adicionado ao carrinho');
    console.log('🛒 [COMPRA-FORM] Itens no carrinho:', this.compraEdit.itens);
  }

  private calcularCustoTotalItem(item: ItemCompra): number {
    return (item.custoUnitario || 0) * (item.quantidade || 0);
  }

  limparSelecaoProduto(): void {
    this.produtoSelecionado = null;
    this.quantidadeSelecionada = 1;
    this.custoUnitarioSelecionado = 0;
    this.custoTotalSelecionado = 0;
    this.produtoJaNoEstoque = false;
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
        this.compraEdit.itens.splice(index, 1);
        this.atualizarCustoTotalCompra();
        console.log('🛒 [COMPRA-FORM] Item removido do carrinho');
      }
    );
  }

  produtoJaNoCarrinho(produtoId: number): boolean {
    return this.compraEdit.itens.some(item => item.produtoId === produtoId);
  }

  atualizarQuantidade(item: ItemCompra, novaQuantidade: string | number): void {
    const quantidade = typeof novaQuantidade === 'string' ? parseInt(novaQuantidade) : novaQuantidade;
    
    if (quantidade && quantidade > 0) {
      item.quantidade = quantidade;
      item.custoTotal = this.calcularCustoTotalItem(item);
      this.atualizarCustoTotalCompra();
      console.log('📝 [COMPRA-FORM-v46.6] Quantidade atualizada:', item.quantidade);
    }
  }

  atualizarCustoUnitario(item: ItemCompra, novoCusto: string | number): void {
    const custo = typeof novoCusto === 'string' ? parseFloat(novoCusto) : novoCusto;
    
    if (custo && custo >= 0) {
      item.custoUnitario = custo;
      item.custoTotal = this.calcularCustoTotalItem(item);
      this.atualizarCustoTotalCompra();
      console.log('📝 [COMPRA-FORM-v46.6] Custo unitário atualizado:', item.custoUnitario);
    }
  }

  atualizarCustoTotalCompra(): void {
    this.compraEdit.custoTotal = calcularCustoTotalCompra(this.compraEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.compraEdit.itens.reduce((total, item) => {
      return total + (item.custoTotal || 0);
    }, 0);
  }

  prepararDadosParaEnvio(): any {
    const dadosCompra = {
      idPedidoCompra: this.compraEdit.idPedidoCompra,
      fornecedor: this.compraEdit.fornecedor,
      data: this.compraEdit.dataEntrada,
      observacoes: this.compraEdit.observacoes || '',
      itens: this.compraEdit.itens.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario || 0
      }))
    };
    
    console.log('📤 [COMPRA-FORM-v46.6] Dados preparados para backend:', dadosCompra);
    console.log('📤 [COMPRA-FORM-v46.6] Número de itens:', dadosCompra.itens.length);
    console.log('📤 [COMPRA-FORM-v46.6] Modo edição:', this.modoEdicao);
    
    return dadosCompra;
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

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarCompra(): void {
    console.log('💾 [COMPRA-FORM-v46.6] Salvando compra v46.6...');
    console.log('💾 [COMPRA-FORM] Modo:', this.modoEdicao ? 'EDIÇÃO' : 'NOVA COMPRA');
    console.log('💾 [COMPRA-FORM] Compra completa:', this.compraEdit);
    console.log('💾 [COMPRA-FORM] Número de itens:', this.compraEdit.itens.length);
    
    if (this.compraEdit.itens.length === 0) {
      this.modalService.mostrarErro('Adicione pelo menos um produto ao carrinho.');
      return;
    }
    
    if (!this.compraEdit.idPedidoCompra.trim()) {
      this.modalService.mostrarErro('ID do Pedido de Compra é obrigatório.');
      return;
    }
    
    if (!this.compraEdit.fornecedor.trim()) {
      this.modalService.mostrarErro('Fornecedor é obrigatório.');
      return;
    }
    
    this.compraEdit.categoria = 'Produto';
    this.continuarSalvamento();
  }

  private continuarSalvamento(): void {
    const dadosParaEnviar = this.prepararDadosParaEnvio();
    dadosParaEnviar.data = this.formatarDataParaBackend(dadosParaEnviar.data);
    
    if (this.modoEdicao && this.compraEdit.id) {
      this.compraService.atualizarCompra(this.compraEdit.id, dadosParaEnviar).subscribe({
        next: (compraAtualizada: Compra) => {
          console.log('✅ [COMPRA-FORM-v46.6] Compra atualizada:', compraAtualizada);
          this.compraSalva.emit();
          this.fechar();
          this.modalService.mostrarSucesso('Compra atualizada com sucesso!');
        },
        error: (error: any) => {
          console.error('❌ [COMPRA-FORM-v46.6] Erro ao atualizar:', error);
          console.error('❌ [COMPRA-FORM-v46.6] Status:', error.status);
          console.error('❌ [COMPRA-FORM-v46.6] Mensagem:', error.error);
          
          this.tratarErroCompra(error);
        }
      });
    } else {
      this.compraService.criarCompra(dadosParaEnviar).subscribe({
        next: (compraSalva: Compra) => {
          console.log('✅ [COMPRA-FORM-v46.6] Compra criada:', compraSalva);
          this.compraSalva.emit();
          this.fechar();
          this.modalService.mostrarSucesso('Compra criada com sucesso!');
        },
        error: (error: any) => {
          console.error('❌ [COMPRA-FORM-v46.6] Erro ao criar compra:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Mensagem:', error.message);
          
          this.tratarErroCompra(error);
        }
      });
    }
  }

  private tratarErroCompra(error: any): void {
    const errorMessage = error.error || error.message || 'Erro desconhecido';
    
    // ✅ 1. ERRO DE ID DUPLICADO - COMPRA
    if (errorMessage.includes('Já existe uma compra com este ID do pedido') ||
        errorMessage.includes('Já existe uma compra cadastrada com este ID do Pedido') ||
        errorMessage.includes('Já existe outra compra com este ID do pedido')) {
      
      // ✅✅✅ USANDO MÉTODO ESPECÍFICO PARA COMPRAS
      this.modalService.mostrarErroIdDuplicadoCompra(this.compraEdit.idPedidoCompra);
      return;
    }
    
    // ✅ 2. ERRO PEPS - LOTE PARCIALMENTE CONSUMIDO (EDIÇÃO)
    if (errorMessage.includes('lote que já foi parcialmente consumido') ||
        errorMessage.includes('não é possível alterar quantidade') ||
        errorMessage.includes('Saldo atual')) {
      
      const saldoMatch = errorMessage.match(/Saldo atual: (\d+)/);
      const quantidadeMatch = errorMessage.match(/Quantidade (?:antiga|original): (\d+)/);
      
      const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
      const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;
      
      if (saldoAtual > 0 && quantidadeAntiga > 0) {
        this.modalService.mostrarAlertaPeps(saldoAtual, quantidadeAntiga);
      } else {
        this.modalService.mostrarErro(errorMessage);
      }
      return;
    }
    
    // ✅ 3. ERRO PEPS - EXCLUSÃO BLOQUEADA
    if (errorMessage.includes('Não é possível excluir') &&
        errorMessage.includes('parcialmente consumido')) {
      
      const saldoMatch = errorMessage.match(/Saldo atual: (\d+)/);
      const quantidadeMatch = errorMessage.match(/Quantidade original: (\d+)/);
      
      const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
      const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;
      
      if (saldoAtual > 0 && quantidadeAntiga > 0) {
        this.modalService.mostrarAlertaPepsExclusao(saldoAtual, quantidadeAntiga);
      } else {
        this.modalService.mostrarErro(errorMessage);
      }
      return;
    }
    
    // ✅ 4. ERRO GENÉRICO
    this.modalService.mostrarErro('Erro ao salvar compra: ' + errorMessage);
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Compra' : 'Nova Compra';
  }
}