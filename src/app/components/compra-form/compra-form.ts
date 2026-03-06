import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
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
  
  compraEdit: Compra = this.getCompraVazia();
  produtos: Produto[] = [];
  categoriaFixa: string = 'Produto';
  modoEdicao: boolean = false;
  
  produtoSelecionado: Produto | null = null;
  quantidadeSelecionada: number = 1;
  custoUnitarioSelecionado: number = 0;
  custoTotalSelecionado: number = 0;
  
  termoBuscaProduto: string = '';
  mostrarDropdownProduto: boolean = false;
  mostrarModalProduto: boolean = false;
  
  produtoJaNoEstoque: boolean = false;
  saldoAtual: number = 0;
  quantidadeNoCarrinho: number = 0;

  constructor(
    private compraService: ComprasService,
    private produtoService: ProdutoService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
  }

  @HostListener('document:click', ['$event'])
  fecharDropdownClickFora(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.mostrarDropdownProduto = false;
    }
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
    if (data.includes('T') && data.includes('Z')) return data;
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) return `${data}T00:00:00Z`;
    return data;
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe({
      next: (produtos: Produto[]) => {
        this.produtos = produtos;
        this.inicializarFormulario();
      },
      error: (error: any) => console.error('❌ Erro ao carregar produtos:', error)
    });
  }

  inicializarFormulario(): void {
    if (this.compra && this.compra.id) {
      this.modoEdicao = true;
      this.compraEdit = { ...this.compra };
      if (this.compraEdit.dataEntrada && this.compraEdit.dataEntrada.includes('T')) {
        this.compraEdit.dataEntrada = this.compraEdit.dataEntrada.split('T')[0];
      }
      if (!this.compraEdit.itens) this.compraEdit.itens = [];
    } else {
      this.modoEdicao = false;
    }
  }

  get produtosFiltrados(): Produto[] {
    if (!this.termoBuscaProduto) return this.produtos;
    const termo = this.termoBuscaProduto.toLowerCase();
    return this.produtos.filter(p => 
      p.nome.toLowerCase().includes(termo) || 
      (p.sku && p.sku.toLowerCase().includes(termo))
    );
  }

  filtrarProdutos(): void {
    this.mostrarDropdownProduto = true;
  }

  selecionarProduto(produto: Produto | 'novo'): void {
    if (produto === 'novo') {
      this.abrirModalProduto();
      this.limparSelecaoProduto();
    } else {
      this.produtoSelecionado = produto;
      this.termoBuscaProduto = `${produto.nome} (${produto.sku || 'Sem SKU'})`;
      this.onProdutoChange();
    }
    this.mostrarDropdownProduto = false;
  }

  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    return this.compraEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
  }

  onProdutoChange(): void {
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
      },
      error: (error: any) => {
        console.error('Erro ao verificar estoque:', error);
        this.produtoJaNoEstoque = false;
      }
    });
  }

  onQuantidadeChange(): void { this.calcularCustoTotal(); }

  calcularCustoTotal(): void {
    const custoUnitario = this.custoUnitarioSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    this.custoTotalSelecionado = (custoUnitario && quantidade) 
      ? Math.round(custoUnitario * quantidade * 100) / 100 
      : 0;
  }

  calcularCustoUnitario(): void {
    const custoTotal = this.custoTotalSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    this.custoUnitarioSelecionado = (custoTotal && quantidade > 0)
      ? Math.round((custoTotal / quantidade) * 100) / 100
      : 0;
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
    const itemExistente = this.compraEdit.itens.find(item => item.produtoId === produtoId);
    
    if (itemExistente) {
      if (this.modoEdicao) {
        itemExistente.quantidade = this.quantidadeSelecionada;
        itemExistente.custoUnitario = this.custoUnitarioSelecionado;
      } else {
        itemExistente.quantidade += this.quantidadeSelecionada;
        itemExistente.custoUnitario = this.custoUnitarioSelecionado;
      }
      itemExistente.custoTotal = this.calcularCustoTotalItem(itemExistente);
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
  }

  private calcularCustoTotalItem(item: ItemCompra): number {
    return (item.custoUnitario || 0) * (item.quantidade || 0);
  }

  limparSelecaoProduto(): void {
    this.produtoSelecionado = null;
    this.termoBuscaProduto = '';
    this.quantidadeSelecionada = 1;
    this.custoUnitarioSelecionado = 0;
    this.custoTotalSelecionado = 0;
    this.produtoJaNoEstoque = false;
    this.quantidadeNoCarrinho = 0;
  }

  removerDoCarrinho(index: number): void {
    this.modalService.confirmarExclusao(
      'Remover este produto do carrinho?',
      () => {
        this.compraEdit.itens.splice(index, 1);
        this.atualizarCustoTotalCompra();
      }
    );
  }

  atualizarQuantidade(item: ItemCompra, novaQuantidade: string | number): void {
    const quantidade = typeof novaQuantidade === 'string' ? parseInt(novaQuantidade) : novaQuantidade;
    if (quantidade && quantidade > 0) {
      item.quantidade = quantidade;
      item.custoTotal = this.calcularCustoTotalItem(item);
      this.atualizarCustoTotalCompra();
    }
  }

  atualizarCustoUnitario(item: ItemCompra, novoCusto: string | number): void {
    const custo = typeof novoCusto === 'string' ? parseFloat(novoCusto) : novoCusto;
    if (custo && custo >= 0) {
      item.custoUnitario = custo;
      item.custoTotal = this.calcularCustoTotalItem(item);
      this.atualizarCustoTotalCompra();
    }
  }

  atualizarCustoTotalCompra(): void {
    this.compraEdit.custoTotal = calcularCustoTotalCompra(this.compraEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.compraEdit.itens.reduce((total, item) => total + (item.custoTotal || 0), 0);
  }

  getImagemProduto(produtoId: number): string {
    const produto = this.produtos.find(p => p.id === produtoId);
    return produto?.imagemUrl || (produto as any)?.imagem || 'assets/no-image.png';
  }

  prepararDadosParaEnvio(): any {
    return {
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
  }

  abrirModalProduto(): void { this.mostrarModalProduto = true; }
  fecharModalProduto(): void { this.mostrarModalProduto = false; }

  onProdutoSalvo(): void {
    this.fecharModalProduto();
    this.carregarProdutos();
  }

  fechar(): void { this.fecharModal.emit(); }

  salvarCompra(): void {
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
    
    const request$ = (this.modoEdicao && this.compraEdit.id) 
      ? this.compraService.atualizarCompra(this.compraEdit.id, dadosParaEnviar)
      : this.compraService.criarCompra(dadosParaEnviar);

    request$.subscribe({
      next: () => {
        this.compraSalva.emit();
        this.fechar();
        this.modalService.mostrarSucesso(`Compra ${this.modoEdicao ? 'atualizada' : 'criada'} com sucesso!`);
      },
      error: (error: any) => this.tratarErroCompra(error)
    });
  }

  private tratarErroCompra(error: any): void {
    const errorMessage = error.error || error.message || 'Erro desconhecido';
    
    if (errorMessage.includes('ID do pedido') || errorMessage.includes('ID do Pedido')) {
      this.modalService.mostrarErroIdDuplicadoCompra(this.compraEdit.idPedidoCompra);
      return;
    }
    
    if (errorMessage.includes('lote que já foi parcialmente consumido') || errorMessage.includes('não é possível alterar quantidade') || errorMessage.includes('Não é possível excluir')) {
      const saldoMatch = errorMessage.match(/Saldo atual: (\d+)/);
      const quantidadeMatch = errorMessage.match(/Quantidade (?:antiga|original): (\d+)/);
      const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
      const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;
      
      if (saldoAtual > 0 && quantidadeAntiga > 0) {
        if (errorMessage.includes('excluir')) {
          this.modalService.mostrarAlertaPepsExclusao(saldoAtual, quantidadeAntiga);
        } else {
          this.modalService.mostrarAlertaPeps(saldoAtual, quantidadeAntiga);
        }
      } else {
        this.modalService.mostrarErro(errorMessage);
      }
      return;
    }
    
    this.modalService.mostrarErro('Erro ao salvar compra: ' + errorMessage);
  }

  get tituloModal(): string { return this.modoEdicao ? 'Editar Compra' : 'Nova Compra'; }
}