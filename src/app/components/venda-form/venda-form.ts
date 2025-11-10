import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Venda } from '../../models/venda';
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
  
  vendaEdit: Venda = this.getVendaVazia();
  produtos: Produto[] = [];
  plataformas: string[] = ['Amazon', 'Mercado Livre', 'Shopee', 'Outro'];
  modoEdicao: boolean = false;

  // Estado do modal de produto
  mostrarModalProduto: boolean = false;

  // Variáveis para controle de estoque
  estoqueInsuficiente: boolean = false;
  estoqueDisponivel: number = 0;
  quantidadeSolicitada: number = 0;
  verificandoEstoque: boolean = false;

  // Campos temporários para preço (não fazem parte da interface Venda)
  precoUnitario: number = 0;
  precoTotal: number = 0;

  constructor(
    private vendaService: VendaService,
    private produtoService: ProdutoService
  ) {}

  ngOnInit(): void {
    console.log('🔍 DEBUG - ngOnInit iniciado');
    console.log('🔍 DEBUG - venda recebida no @Input:', this.venda);
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    console.log('🔍 DEBUG - carregarProdutos iniciado');
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
        console.log('🔍 DEBUG - Produtos carregados:', produtos.length, 'produtos');
        console.log('🔍 DEBUG - IDs dos produtos:', produtos.map(p => p.id));
        console.log('🔍 DEBUG - Nomes dos produtos:', produtos.map(p => p.nome));
        
        // ✅ CORREÇÃO: Inicializar formulário APÓS produtos carregados
        this.inicializarFormulario();
        
        // ✅ DEBUG CRÍTICO: Verificar se o produtoId existe na lista
        if (this.vendaEdit.produtoId) {
          const produtoEncontrado = this.produtos.find(p => p.id === this.vendaEdit.produtoId);
          console.log('🔍 DEBUG - Produto encontrado na lista?', produtoEncontrado);
          console.log('🔍 DEBUG - vendaEdit.produtoId:', this.vendaEdit.produtoId);
          console.log('🔍 DEBUG - Tipo do produtoId:', typeof this.vendaEdit.produtoId);
        }
      },
      error: (error) => {
        console.error('Erro ao carregar produtos:', error);
      }
    });
  }

  inicializarFormulario(): void {
    console.log('🔍 DEBUG - inicializarFormulario chamado');
    console.log('🔍 DEBUG - this.venda:', this.venda);
    console.log('🔍 DEBUG - this.venda?.id:', this.venda?.id);
    
    if (this.venda && this.venda.id) {
      // MODO EDIÇÃO
      this.modoEdicao = true;
      console.log('🔍 DEBUG - Modo EDIÇÃO detectado');
      this.preencherFormularioEdicao();
    } else {
      // MODO NOVA VENDA
      this.modoEdicao = false;
      this.vendaEdit = this.getVendaVazia();
      console.log('🔍 DEBUG - Modo NOVA VENDA, formulário limpo');
    }
  }

  preencherFormularioEdicao(): void {
    if (!this.venda) return;

    console.log('🔍 DEBUG - preencherFormularioEdicao iniciado');
    console.log('🔍 DEBUG - Venda original:', this.venda);

    this.vendaEdit = {
      id: this.venda.id,
      data: this.venda.data,
      idPedido: this.venda.idPedido,
      plataforma: this.venda.plataforma,
      quantidade: this.venda.quantidade,
      precoVenda: this.venda.precoVenda,
      fretePagoPeloCliente: this.venda.fretePagoPeloCliente,
      custoEnvio: this.venda.custoEnvio,
      tarifaPlataforma: this.venda.tarifaPlataforma,
      custoProdutoVendido: this.venda.custoProdutoVendido,
      despesasOperacionais: this.venda.despesasOperacionais,
      
      // ✅ CORREÇÃO CRÍTICA: Buscar produtoId pelo nome quando não estiver disponível
      produtoId: this.venda.produtoId || this.buscarProdutoIdPeloNome(this.venda.produtoNome),
      produtoNome: this.venda.produtoNome,
      produtoSku: this.venda.produtoSku || '',
      
      // ✅ CORREÇÃO: Valores padrão para propriedades que podem estar faltando
      faturamento: this.venda.faturamento || 0,
      custoEfetivoTotal: this.venda.custoEfetivoTotal || 0,
      lucroBruto: this.venda.lucroBruto || 0,
      lucroLiquido: this.venda.lucroLiquido || 0,
      roi: this.venda.roi || 0
    };

    console.log('🔍 DEBUG - vendaEdit após cópia:', this.vendaEdit);
    console.log('🔍 DEBUG - produtoId após cópia:', this.vendaEdit.produtoId, 'tipo:', typeof this.vendaEdit.produtoId);

    this.inicializarCamposPreco();
  }

  // ✅ NOVO: Método para buscar produtoId pelo nome
  private buscarProdutoIdPeloNome(produtoNome: string): number {
    if (!produtoNome) return 0;
    
    const produtoEncontrado = this.produtos.find(p => 
      p.nome?.toLowerCase() === produtoNome?.toLowerCase()
    );
    
    if (produtoEncontrado) {
      console.log('🔍 DEBUG - Produto encontrado pelo nome:', produtoEncontrado);
      return produtoEncontrado.id!;
    }
    
    console.log('🔍 DEBUG - Produto NÃO encontrado pelo nome:', produtoNome);
    return 0;
  }

  // Inicializar campos de preço locais
  private inicializarCamposPreco(): void {
    if (this.vendaEdit.precoVenda && this.vendaEdit.quantidade) {
      // Se já existe precoVenda (que é o total), calcular unitário
      this.precoTotal = this.vendaEdit.precoVenda;
      this.precoUnitario = this.vendaEdit.quantidade > 0 ? 
        this.vendaEdit.precoVenda / this.vendaEdit.quantidade : 0;
      
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.precoUnitario = Math.round(this.precoUnitario * 100) / 100;
    } else {
      this.precoUnitario = 0;
      this.precoTotal = 0;
    }
    
    console.log('🔍 DEBUG - Campos preço inicializados:');
    console.log('🔍 DEBUG - precoUnitario:', this.precoUnitario);
    console.log('🔍 DEBUG - precoTotal:', this.precoTotal);
  }

  private getVendaVazia(): Venda {
    // ✅ CORREÇÃO: Formato correto para datetime-local (yyyy-MM-ddTHH:mm)
    const now = new Date();
    const dataFormatada = now.toISOString().slice(0, 16); // "2025-11-05T14:00"
    
    return {
      data: dataFormatada,
      idPedido: '',
      plataforma: 'Amazon',
      quantidade: 1,
      precoVenda: 0,
      fretePagoPeloCliente: 0,
      custoEnvio: 0,
      tarifaPlataforma: 0,
      custoProdutoVendido: 0,
      despesasOperacionais: 0,
      
      // ✅ CORREÇÃO: Dados do produto vazios
      produtoId: 0,
      produtoNome: '',
      produtoSku: '',
      
      // ✅ CORREÇÃO: Cálculos financeiros vazios
      faturamento: 0,
      custoEfetivoTotal: 0,
      lucroBruto: 0,
      lucroLiquido: 0,
      roi: 0
    };
  }

  // ✅ NOVO: Método para validar data quando o campo perde foco
  validarData(): void {
    if (!this.vendaEdit.data) {
      // Se data estiver vazia, definir data atual
      const now = new Date();
      this.vendaEdit.data = now.toISOString().slice(0, 16);
      console.log('🔍 DEBUG - Data definida automaticamente:', this.vendaEdit.data);
    }
  }

  // ✅ CORREÇÃO: Método atualizado para lidar com seleção de produto
  onProdutoSelecionado(event: any): void {
    const produtoId = event.target.value;
    console.log('🔍 DEBUG - onProdutoSelecionado chamado:', produtoId);
    
    if (produtoId === 'novo') {
      this.abrirModalProduto();
      this.vendaEdit.produtoId = 0;
      this.vendaEdit.produtoNome = '';
      this.vendaEdit.produtoSku = '';
      setTimeout(() => {
        event.target.value = '';
      });
    } else {
      const produtoSelecionado = this.produtos.find(p => p.id === Number(produtoId));
      if (produtoSelecionado) {
        this.vendaEdit.produtoId = produtoSelecionado.id!;
        this.vendaEdit.produtoNome = produtoSelecionado.nome;
        this.vendaEdit.produtoSku = produtoSelecionado.sku;
        this.onProdutoChange(); // ✅ CHAMAR VERIFICAÇÃO DE ESTOQUE
      } else {
        this.vendaEdit.produtoId = 0;
        this.vendaEdit.produtoNome = '';
        this.vendaEdit.produtoSku = '';
      }
    }
  }

  // ✅ NOVO: Métodos para modal de produto
  abrirModalProduto(): void {
    this.mostrarModalProduto = true;
  }

  fecharModalProduto(): void {
    this.mostrarModalProduto = false;
  }

  onProdutoSalvo(): void {
    this.fecharModalProduto();
    this.carregarProdutos(); // ✅ RECARREGAR LISTA DE PRODUTOS
  }

  // Método para verificar estoque em tempo real
  verificarEstoque(): void {
    const produtoId = this.vendaEdit.produtoId;
    const quantidade = this.vendaEdit.quantidade;
    
    if (produtoId && quantidade && quantidade > 0) {
      this.verificandoEstoque = true;
      this.quantidadeSolicitada = quantidade;
      
      // Buscar produto atualizado para pegar estoque correto
      this.produtoService.getProduto(produtoId).subscribe({
        next: (produtoAtualizado) => {
          // ✅ CORREÇÃO: Usar quantidadeEstoqueTotal em vez de quantidadeEstoque
          const estoqueAtual = produtoAtualizado.quantidadeEstoqueTotal || 0;
          this.estoqueDisponivel = estoqueAtual;
          this.estoqueInsuficiente = quantidade > estoqueAtual;
          this.verificandoEstoque = false;
          
          console.log(`📦 ESTOQUE - Disponível: ${estoqueAtual}, Solicitado: ${quantidade}, Insuficiente: ${this.estoqueInsuficiente}`);
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
    }
  }

  // Método chamado quando o produto é alterado
  onProdutoChange(): void {
    console.log('🔍 DEBUG - onProdutoChange chamado:', this.vendaEdit.produtoId);
    
    if (this.vendaEdit.produtoId) {
      // Verificar estoque quando um produto é selecionado
      this.verificarEstoque();
    } else {
      this.estoqueInsuficiente = false;
    }
  }

  // Método chamado quando a quantidade é alterada
  onQuantidadeChange(): void {
    console.log('🔍 DEBUG - onQuantidadeChange chamado:', this.vendaEdit.quantidade);
    
    // Recalcular preços
    this.calcularPrecoTotal();
    
    // Verificar estoque
    if (this.vendaEdit.produtoId) {
      this.verificarEstoque();
    }
  }

  // Calcular preço total baseado no unitário e quantidade
  calcularPrecoTotal(): void {
    // Usar valores padrão 0 se undefined
    const precoUnitario = this.precoUnitario || 0;
    const quantidade = this.vendaEdit.quantidade || 0;
    
    if (precoUnitario && quantidade) {
      this.precoTotal = precoUnitario * quantidade;
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.precoTotal = Math.round(this.precoTotal * 100) / 100;
    } else {
      this.precoTotal = 0;
    }
    this.atualizarPrecoVenda();
  }

  // Calcular preço unitário baseado no total e quantidade
  calcularPrecoUnitario(): void {
    // Usar valores padrão 0 se undefined
    const precoTotal = this.precoTotal || 0;
    const quantidade = this.vendaEdit.quantidade || 0;
    
    if (precoTotal && quantidade && quantidade > 0) {
      this.precoUnitario = precoTotal / quantidade;
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.precoUnitario = Math.round(this.precoUnitario * 100) / 100;
    } else {
      this.precoUnitario = 0;
    }
    this.atualizarPrecoVenda();
  }

  // Atualizar o campo precoVenda que será enviado ao backend
  private atualizarPrecoVenda(): void {
    this.vendaEdit.precoVenda = this.precoTotal || 0;
  }

  // Método para abrir modal de compra
  abrirModalCompra(): void {
    console.log('🔍 DEBUG - Abrindo modal de compra para produto:', this.vendaEdit.produtoId);
    
    if (this.vendaEdit.produtoId) {
      // Encontrar o produto completo na lista
      const produtoCompleto = this.produtos.find(p => p.id === this.vendaEdit.produtoId);
      if (produtoCompleto) {
        // Emitir evento para o componente pai (venda-list) abrir o modal de compras
        this.abrirCompraParaProduto.emit(produtoCompleto);
      }
    } else {
      alert('Por favor, selecione um produto primeiro.');
    }
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarVenda(): void {
    console.log('🔍 DEBUG - Modo:', this.modoEdicao ? 'EDIÇÃO' : 'NOVA VENDA');
    console.log('🔍 DEBUG - Objeto venda completo:', this.vendaEdit);
    console.log('🔍 DEBUG - ID do produto:', this.vendaEdit.produtoId);
    console.log('🔍 DEBUG - Preço Unitário:', this.precoUnitario);
    console.log('🔍 DEBUG - Preço Total:', this.precoTotal);
    console.log('🔍 DEBUG - Estoque insuficiente:', this.estoqueInsuficiente);

    // ✅ CORREÇÃO CRÍTICA: Garantir que a data seja válida antes de enviar
    if (!this.vendaEdit.data) {
      const now = new Date();
      this.vendaEdit.data = now.toISOString().slice(0, 16);
      console.log('🔍 DEBUG - Data definida automaticamente no save:', this.vendaEdit.data);
    }

    // VALIDAÇÃO: Verificar se o produto foi selecionado
    if (!this.vendaEdit.produtoId) {
      alert('Por favor, selecione um produto antes de salvar.');
      return;
    }

    // VALIDAÇÃO: ID do Pedido é obrigatório
    if (!this.vendaEdit.idPedido.trim()) {
      alert('ID do Pedido é obrigatório.');
      return;
    }

    // VALIDAÇÃO: Preço deve ser maior que zero
    const precoTotal = this.precoTotal || 0;
    if (precoTotal <= 0) {
      alert('O preço total deve ser maior que zero.');
      return;
    }

    // ✅ VALIDAÇÃO: Estoque insuficiente (fallback)
    if (this.estoqueInsuficiente) {
      const confirmar = confirm(`Estoque insuficiente!\n\n` +
        `Disponível: ${this.estoqueDisponivel} unidades\n` +
        `Solicitado: ${this.quantidadeSolicitada} unidades\n\n` +
        `Deseja continuar mesmo assim?`);
      
      if (!confirmar) {
        return;
      }
    }

    // GARANTIR: precoVenda está atualizado com o preço total
    this.vendaEdit.precoVenda = precoTotal;

    if (this.modoEdicao && this.vendaEdit.id) {
      // MODO EDIÇÃO - Atualizar venda existente
      this.vendaService.atualizarVenda(this.vendaEdit.id, this.vendaEdit).subscribe({
        next: (vendaAtualizada) => {
          console.log('✅ Venda atualizada com sucesso:', vendaAtualizada);
          this.vendaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro completo ao atualizar venda:', error);
          console.error('❌ Status do erro:', error.status);
          console.error('❌ Mensagem do erro:', error.message);
          console.error('❌ Detalhes do erro:', error.error);
          alert('Erro ao atualizar venda! Verifique o console.');
        }
      });
    } else {
      // MODO NOVA VENDA - Criar nova venda
      this.vendaService.criarVenda(this.vendaEdit).subscribe({
        next: (vendaSalva) => {
          console.log('✅ Venda salva com sucesso:', vendaSalva);
          this.vendaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro completo ao salvar venda:', error);
          console.error('❌ Status do erro:', error.status);
          console.error('❌ Mensagem do erro:', error.message);
          console.error('❌ Detalhes do erro:', error.error);
          alert('Erro ao salvar venda! Verifique o console.');
        }
      });
    }
  }

  // Método auxiliar para verificar se é edição (para o template)
  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Venda' : 'Nova Venda';
  }
}