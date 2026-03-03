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
  
  // ✅ CORREÇÃO: Usando Alias para que o venda-list.html consiga escutar corretamente os eventos
  @Output('fechar') fecharEvent = new EventEmitter<void>();
  @Output('salvou') salvouEvent = new EventEmitter<void>();
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

  dropdownAberto: boolean = false;
  placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%231a3a5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

  itensExibicao: ItemVendaAgrupado[] = [];
  vendaOriginal: Venda | null = null;
  itensOriginais: ItemVenda[] = [];
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

  toggleDropdown(): void {
    this.dropdownAberto = !this.dropdownAberto;
  }

  selecionarProduto(produtoOuNovo: any): void {
    this.dropdownAberto = false;
    
    if (produtoOuNovo === 'novo') {
      this.abrirModalProduto();
      this.produtoSelecionado = null;
      this.estoqueInsuficiente = false;
      this.quantidadeNoCarrinho = 0;
    } else {
      this.produtoSelecionado = produtoOuNovo as Produto;
      this.onProdutoChange();
    }
  }

  getImagem(produto: any): string {
    if (!produto) return this.placeholderImg;
    return produto.imagemUrl || produto.imagem || produto.foto || produto.urlImagem || this.placeholderImg;
  }

  getImagemPorId(produtoId: number): string {
    const produto = this.produtos.find(p => p.id === produtoId);
    return this.getImagem(produto);
  }

  temErroEstoque(): boolean {
    return Object.keys(this.erroEstoque).length > 0;
  }

  quantidadesModificadas(): boolean {
    if (!this.modoEdicao || !this.vendaOriginal || !this.vendaOriginal.itens) {
      return true; 
    }
    
    if (this.quantidadesEditadas.size > 0) {
      return true;
    }
    
    const quantidadesAtuais = new Map<number, number>();
    const quantidadesOriginais = new Map<number, number>();
    
    this.vendaEdit.itens.forEach(item => {
      if (item.produtoId) {
        const atual = quantidadesAtuais.get(item.produtoId) || 0;
        quantidadesAtuais.set(item.produtoId, atual + item.quantidade);
      }
    });
    
    this.vendaOriginal.itens.forEach(item => {
      if (item.produtoId) {
        const original = quantidadesOriginais.get(item.produtoId) || 0;
        quantidadesOriginais.set(item.produtoId, original + item.quantidade);
      }
    });
    
    for (const [produtoId, quantidadeAtual] of quantidadesAtuais) {
      const quantidadeOriginal = quantidadesOriginais.get(produtoId) || 0;
      if (quantidadeAtual !== quantidadeOriginal) {
        return true;
      }
    }
    
    return false;
  }

  apenasCamposBasicosModificados(): boolean {
    if (!this.modoEdicao || !this.vendaOriginal) {
      return false;
    }
    
    const camposParaIgnorar = ['data', 'plataforma', 'fretePagoPeloCliente', 'custoEnvio', 'tarifaPlataforma'];
    
    for (const campo of camposParaIgnorar) {
      if (JSON.stringify(this.vendaEdit[campo as keyof Venda]) !== 
          JSON.stringify(this.vendaOriginal[campo as keyof Venda])) {
        return false;
      }
    }
    
    if (this.vendaEdit.idPedido !== this.vendaOriginal.idPedido) {
      return false;
    }
    
    const precoEdit = Math.round(this.vendaEdit.precoVenda * 100) / 100;
    const precoOriginal = Math.round(this.vendaOriginal.precoVenda * 100) / 100;
    if (precoEdit !== precoOriginal) {
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
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        this.inicializarFormulario();
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  inicializarFormulario(): void {
    if (this.venda && this.venda.id) {
      this.modoEdicao = true;
      this.vendaEdit = { ...this.venda };
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
    }
  }

  private atualizarItensExibicao(): void {
    this.itensExibicao = agruparItensPorProduto(this.vendaEdit.itens);
  }

  calcularQuantidadeNoCarrinho(produtoId: number): number {
    if (!produtoId) return 0;
    return this.vendaEdit.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
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
      this.precoTotalSelecionado = Math.round((precoUnitario * quantidade) * 100) / 100;
    } else {
      this.precoTotalSelecionado = 0;
    }
  }

  calcularPrecoUnitario(): void {
    const precoTotal = this.precoTotalSelecionado || 0;
    const quantidade = this.quantidadeSelecionada || 0;
    
    if (precoTotal && quantidade && quantidade > 0) {
      this.precoUnitarioSelecionado = Math.round((precoTotal / quantidade) * 100) / 100;
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
    const itemExistente = this.vendaEdit.itens.find(item => item.produtoId === produtoId);
    
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
    this.dropdownAberto = false;
  }

  removerDoCarrinho(index: number): void {
    this.modalService.confirmarExclusao(
      'Remover este produto do carrinho?',
      () => {
        const itemExibicao = this.itensExibicao[index];
        if (itemExibicao) {
          this.vendaEdit.itens = this.vendaEdit.itens.filter(
            item => item.produtoId !== itemExibicao.produtoId
          );
          this.atualizarItensExibicao();
          this.atualizarPrecoTotalVenda();
          this.quantidadesEditadas.delete(itemExibicao.produtoId);
        }
      }
    );
  }

  atualizarQuantidadeTotal(itemExibicao: ItemVendaAgrupado, novaQuantidadeTotal: number): void {
    if (!this.modoEdicao) return;
    if (novaQuantidadeTotal <= 0) {
      this.modalService.mostrarErro('A quantidade deve ser maior que zero.');
      return;
    }
    if (novaQuantidadeTotal === itemExibicao.quantidadeTotal) return;
    
    this.quantidadesEditadas.set(itemExibicao.produtoId, novaQuantidadeTotal);
    this.verificarEstoqueParaEdicao(itemExibicao.produtoId, novaQuantidadeTotal);
  }

  private verificarEstoqueParaEdicao(produtoId: number, novaQuantidadeTotal: number): void {
    this.produtoService.getProduto(produtoId).subscribe({
      next: (produtoAtualizado) => {
        const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
        const quantidadeNaVendaOriginal = this.calcularQuantidadeTotalOriginal(produtoId);
        const estoqueDisponivelParaEdicao = estoqueAtual + quantidadeNaVendaOriginal;
        
        if (novaQuantidadeTotal > estoqueDisponivelParaEdicao) {
          this.erroEstoque[produtoId] = 
            `⚠️ Estoque insuficiente para edição! Disponível: ${estoqueDisponivelParaEdicao} unidades, Solicitado: ${novaQuantidadeTotal}`;
        } else {
          delete this.erroEstoque[produtoId];
        }
      }
    });
  }

  private calcularQuantidadeTotalOriginal(produtoId: number): number {
    if (!this.vendaOriginal || !this.vendaOriginal.itens) return 0;
    return this.vendaOriginal.itens
      .filter(item => item.produtoId === produtoId)
      .reduce((total, item) => total + item.quantidade, 0);
  }

  atualizarPrecoUnitarioTotal(itemExibicao: ItemVendaAgrupado, novoPrecoUnitario: number): void {
    if (!this.modoEdicao || novoPrecoUnitario < 0) return;
    
    this.vendaEdit.itens.forEach(item => {
      if (item.produtoId === itemExibicao.produtoId) {
        item.precoUnitarioVenda = novoPrecoUnitario;
        item.precoTotalItem = calcularPrecoTotalItem(item);
      }
    });
    
    this.atualizarItensExibicao();
    this.atualizarPrecoTotalVenda();
  }

  atualizarPrecoTotalVenda(): void {
    this.vendaEdit.precoVenda = calcularPrecoTotalVenda(this.vendaEdit.itens);
  }

  calcularTotalCarrinho(): number {
    return this.vendaEdit.itens.reduce((total, item) => total + (item.precoTotalItem || 0), 0);
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
      this.vendaEdit.data = now.toISOString().split('T')[0];
    }
  }

  fechar(): void {
    this.fecharEvent.emit(); // ✅ Usando o novo EventEmitter!
  }

  prepararDadosParaEnvio(): any {
    const apenasCamposBasicos = this.apenasCamposBasicosModificados();
    const quantidadesModificadas = this.quantidadesModificadas();
    
    const dadosVenda: any = {
      idPedido: this.vendaEdit.idPedido,
      plataforma: this.vendaEdit.plataforma,
      data: this.vendaEdit.data,
      precoVenda: this.calcularTotalCarrinho(),
      fretePagoPeloCliente: this.vendaEdit.fretePagoPeloCliente || 0,
      custoEnvio: this.vendaEdit.custoEnvio || 0,
      tarifaPlataforma: this.vendaEdit.tarifaPlataforma || 0
    };
    
    if (this.modoEdicao && quantidadesModificadas && this.quantidadesEditadas.size > 0) {
      dadosVenda.itens = [];
      this.quantidadesEditadas.forEach((novaQuantidade, produtoId) => {
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
    } else if (this.modoEdicao && apenasCamposBasicos) {
      // Apenas campos básicos mudaram - Backend manterá os itens originais
    } else {
      dadosVenda.itens = this.vendaEdit.itens.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitarioVenda: item.precoUnitarioVenda || 0
      }));
    }
    
    return dadosVenda;
  }

  salvarVenda(): void {
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
        () => this.continuarSalvamento()
      );
      return;
    }
    
    this.continuarSalvamento();
  }

  private continuarSalvamento(): void {
    const dadosParaEnviar = this.prepararDadosParaEnvio();
    
    if (this.modoEdicao && this.quantidadesModificadas()) {
      this.modalService.confirmarExclusao(
        '⚠️ ATENÇÃO: Quantidades modificadas!\n\n' +
        'A alteração de quantidades irá:\n' +
        '1. Reverter estoque dos lotes antigos\n' +
        '2. Aplicar PEPS novamente com as novas quantidades\n' +
        '3. Criar novos registros de lotes consumidos\n\n' +
        'Deseja continuar?',
        () => this.executarSalvamento(dadosParaEnviar)
      );
      return;
    }
    
    this.executarSalvamento(dadosParaEnviar);
  }

  private executarSalvamento(dadosParaEnviar: any): void {
    if (this.modoEdicao && this.vendaEdit.id) {
      this.vendaService.atualizarVenda(this.vendaEdit.id, dadosParaEnviar).subscribe({
        next: (vendaAtualizada) => {
          this.salvouEvent.emit(); // ✅ Emitindo o evento correto!
          this.fechar();
          this.modalService.mostrarSucesso('Venda atualizada com sucesso!');
        },
        error: (error) => {
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
          this.salvouEvent.emit(); // ✅ Emitindo o evento correto!
          this.fechar();
          this.modalService.mostrarSucesso('Venda criada com sucesso!');
        },
        error: (error) => {
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

  converterParaNumero(event: Event): number {
    const input = event.target as HTMLInputElement;
    const valor = input.value;
    
    if (!valor || valor.trim() === '') return 0;
    
    let numero: number;
    
    if (input.type === 'number' && input.min === '1') {
      numero = parseInt(valor, 10);
    } else {
      numero = parseFloat(valor);
    }
    
    if (isNaN(numero)) {
      const valorLimpo = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
      numero = parseFloat(valorLimpo);
      if (isNaN(numero)) return 0;
    }
    
    if (input.type === 'number' && input.min === '1') {
      numero = Math.max(1, Math.floor(numero));
    } else if (input.type === 'number' && input.min === '0') {
      numero = Math.max(0, numero);
    }
    
    if (input.step === '0.01') {
      numero = Math.round(numero * 100) / 100;
    }
    
    return numero;
  }
}