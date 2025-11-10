import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra } from '../../models/compra';
import { Produto } from '../../models/produto';
import { ComprasService } from '../../services/compra.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { BrazilianCurrencyDirective } from '../../pipes/brazilian-currency.directive';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-compra-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ProdutoFormComponent,
    BrazilianCurrencyDirective
  ],
  templateUrl: './compra-form.html',
  styleUrls: ['./compra-form.css']
})
export class CompraFormComponent implements OnChanges {
  @Input() compra: Compra | null = null;
  @Output() fecharModal = new EventEmitter<void>();
  @Output() compraSalva = new EventEmitter<void>();
  
  compraEdit: Compra = this.getCompraVazia();
  produtos: Produto[] = [];

  // Estado do modal de produto
  mostrarModalProduto: boolean = false;

  constructor(
    private compraService: ComprasService,
    private produtoService: ProdutoService,
    private modalService: ModalService
  ) {}

  ngOnChanges(): void {
    console.log('🔍 DEBUG - Compra recebida para edição:', this.compra);
    
    if (this.compra) {
      this.compraEdit = { ...this.compra };
      // CORREÇÃO: Garantir que a data seja formatada corretamente para o input date
      if (this.compraEdit.dataEntrada) {
        this.compraEdit.dataEntrada = this.formatarDataParaInput(this.compraEdit.dataEntrada);
      }
      // ✅ INICIALIZAR CAMPOS DE CUSTO PARA AUTO-CÁLCULO
      this.inicializarCamposCusto();
    } else {
      this.compraEdit = this.getCompraVazia();
    }

    this.carregarProdutos();
  }

  // ✅ INICIALIZAR CAMPOS DE CUSTO PARA AUTO-CÁLCULO
  private inicializarCamposCusto(): void {
    if (this.compraEdit.custoTotal && this.compraEdit.quantidade) {
      // Se já existe custoTotal, calcular unitário
      this.compraEdit.custoUnitario = this.compraEdit.quantidade > 0 ? 
        this.compraEdit.custoTotal / this.compraEdit.quantidade : 0;
      
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.compraEdit.custoUnitario = Math.round(this.compraEdit.custoUnitario * 100) / 100;
    } else {
      this.compraEdit.custoUnitario = 0;
    }
  }

  private formatarDataParaInput(data: string): string {
    if (!data) return new Date().toISOString().split('T')[0];
    
    try {
      const dataObj = new Date(data);
      return dataObj.toISOString().split('T')[0];
    } catch (e) {
      console.warn('Erro ao formatar data:', data, e);
      return new Date().toISOString().split('T')[0];
    }
  }

  private getCompraVazia(): Compra {
    return {
      categoria: 'Produto', // ✅ CATEGORIA FIXA NO BACKEND
      fornecedor: '',
      idPedidoCompra: '',
      quantidade: 1,
      custoTotal: 0,
      custoUnitario: 0,
      dataEntrada: new Date().toISOString().split('T')[0],
      // ✅ CORREÇÃO: Usar as novas propriedades do DTO
      produtoId: 0,
      produtoNome: '',
      produtoSku: '',
      saldo: 0,
      observacoes: ''
    };
  }

  private carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos;
      },
      error: (error) => {
        console.error('Erro ao carregar produtos:', error);
        this.modalService.abrirModal({
          titulo: 'Erro ao Carregar Produtos',
          mensagem: 'Não foi possível carregar a lista de produtos.',
          tipo: 'erro',
          textoBotaoPrimario: 'Entendi'
        });
      }
    });
  }

  // ✅ CALCULAR CUSTO TOTAL BASEADO NO UNITÁRIO E QUANTIDADE
  calcularCustoTotal(): void {
    const custoUnitario = this.compraEdit.custoUnitario || 0;
    const quantidade = this.compraEdit.quantidade || 0;
    
    if (custoUnitario && quantidade) {
      this.compraEdit.custoTotal = custoUnitario * quantidade;
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.compraEdit.custoTotal = Math.round(this.compraEdit.custoTotal * 100) / 100;
    } else {
      this.compraEdit.custoTotal = 0;
    }
  }

  // ✅ CALCULAR CUSTO UNITÁRIO BASEADO NO TOTAL E QUANTIDADE
  calcularCustoUnitario(): void {
    const custoTotal = this.compraEdit.custoTotal || 0;
    const quantidade = this.compraEdit.quantidade || 0;
    
    if (custoTotal && quantidade && quantidade > 0) {
      this.compraEdit.custoUnitario = custoTotal / quantidade;
      // Arredondar para 2 casas decimais (sistema monetário brasileiro)
      this.compraEdit.custoUnitario = Math.round(this.compraEdit.custoUnitario * 100) / 100;
    } else {
      this.compraEdit.custoUnitario = 0;
    }
  }

  // MÉTODOS HELPER PARA O TEMPLATE
  getDataCompra(): string {
    return this.compraEdit.dataEntrada;
  }

  setDataCompra(value: string): void {
    this.compraEdit.dataEntrada = value;
  }

  getCompraProduto(): any {
    return this.compraEdit;
  }

  // ✅ CORREÇÃO: MÉTODO ATUALIZADO PARA LIDAR COM SELEÇÃO DE PRODUTO
  onProdutoSelecionado(event: any): void {
    const produtoId = event.target.value;
    
    if (produtoId === 'novo') {
      this.abrirModalProduto();
      this.compraEdit.produtoId = 0;
      this.compraEdit.produtoNome = '';
      this.compraEdit.produtoSku = '';
      setTimeout(() => {
        event.target.value = '';
      });
    } else {
      const produtoSelecionado = this.produtos.find(p => p.id === Number(produtoId));
      if (produtoSelecionado) {
        this.compraEdit.produtoId = produtoSelecionado.id!;
        this.compraEdit.produtoNome = produtoSelecionado.nome;
        this.compraEdit.produtoSku = produtoSelecionado.sku;
      } else {
        this.compraEdit.produtoId = 0;
        this.compraEdit.produtoNome = '';
        this.compraEdit.produtoSku = '';
      }
    }
  }

  // MÉTODOS PARA MODAL DE PRODUTO
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
    console.log('🔍 DEBUG - Objeto compra:', this.compraEdit);
    
    // VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
    if (!this.compraEdit.idPedidoCompra || this.compraEdit.idPedidoCompra.trim() === '') {
      this.modalService.abrirModal({
        titulo: 'Campo Obrigatório',
        mensagem: 'ID do Pedido de Compra é obrigatório!',
        tipo: 'erro',
        textoBotaoPrimario: 'Entendi'
      });
      return;
    }

    // ✅ CORREÇÃO: Validação atualizada para produtoId
    if (!this.compraEdit.produtoId) {
      this.modalService.abrirModal({
        titulo: 'Campo Obrigatório',
        mensagem: 'É necessário selecionar um produto!',
        tipo: 'erro',
        textoBotaoPrimario: 'Entendi'
      });
      return;
    }

    // ✅ VALIDAÇÃO: Custo deve ser maior que zero
    const custoTotal = this.compraEdit.custoTotal || 0;
    if (custoTotal <= 0) {
      this.modalService.abrirModal({
        titulo: 'Valor Inválido',
        mensagem: 'O custo total deve ser maior que zero.',
        tipo: 'erro',
        textoBotaoPrimario: 'Entendi'
      });
      return;
    }

    this.salvarCompraProduto();
  }

  // ✅ MÉTODO CORRIGIDO: Remove tratamento de erro local - deixa o serviço tratar
  private salvarCompraProduto(): void {
    if (this.compraEdit.id) {
      console.log('🔍 DEBUG - Atualizando compra existente ID:', this.compraEdit.id);
      this.compraService.atualizarCompra(this.compraEdit.id, this.compraEdit).subscribe({
        next: (compraAtualizada) => {
          console.log('Compra atualizada com sucesso:', compraAtualizada);
          this.compraSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('Erro ao atualizar compra:', error);
          // ✅ REMOVIDO: Não faz mais tratamento local - o serviço já trata
          // O serviço compra.service.ts já mostra o modal apropriado automaticamente
        }
      });
    } else {
      console.log('🔍 DEBUG - Criando nova compra');
      this.compraService.criarCompraProduto(this.compraEdit).subscribe({
        next: (compraSalva) => {
          console.log('Compra salva com sucesso:', compraSalva);
          this.compraSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('Erro ao salvar compra:', error);
          // ✅ REMOVIDO: Não faz mais tratamento local - o serviço já trata
          // O serviço compra.service.ts já mostra o modal apropriado automaticamente
        }
      });
    }
  }

  // ✅ MÉTODO SIMPLIFICADO PARA MOSTRAR MODAL PEPS
  private mostrarModalPepsAlerta(mensagemErro: string): void {
    // Extrair informações da mensagem de erro
    const saldoMatch = mensagemErro.match(/Saldo atual: (\d+)/);
    const quantidadeMatch = mensagemErro.match(/Quantidade antiga: (\d+)/);
    
    const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
    const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;

    // ✅ USA O MÉTODO ESPECÍFICO DO MODAL SERVICE
    this.modalService.mostrarAlertaPeps(saldoAtual, quantidadeAntiga);
  }

  // ✅ MÉTODO AUXILIAR: Obter nome do produto selecionado para exibição
  getProdutoSelecionadoNome(): string {
    if (this.compraEdit.produtoId && this.compraEdit.produtoNome) {
      return this.compraEdit.produtoNome;
    }
    return 'Selecione um produto';
  }
}