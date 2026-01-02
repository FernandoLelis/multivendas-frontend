import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasService } from '../../services/compra.service';
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Compra, converterCompraAntigaParaNova, normalizarCompraDoBackend } from '../../models/compra';
import { ItemCompra } from '../../models/item-compra';

// Interface local para compras com propriedade de controle de UI
interface CompraComUI extends Compra {
  mostrarProdutos: boolean;
}

@Component({
  selector: 'app-compra-list',
  standalone: true,
  imports: [
    CommonModule, 
    CompraFormComponent,
    BrazilianCurrencyPipe
  ],
  templateUrl: './compra-list.html',
  styleUrls: ['./compra-list.css']
})
export class ComprasComponent implements OnInit {
  compras: CompraComUI[] = [];
  mostrarModal: boolean = false;
  compraEditando: Compra | null = null;

  constructor(
    private compraService: ComprasService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarCompras();
  }

  carregarCompras(): void {
    console.log('🚀 [COMPRA-LIST] Carregando compras...');
    
    // ✅✅✅ MUDANÇA CRÍTICA: Usar endpoint novo para múltiplos produtos
    this.compraService.getComprasMultiplos().subscribe({
      next: (comprasBackend: any[]) => {
        console.log('✅ [COMPRA-LIST] Compras recebidas (novo endpoint):', comprasBackend.length);
        
        if (comprasBackend.length > 0) {
          console.log('🔍 [COMPRA-LIST] Primeira compra (raw):', comprasBackend[0]);
          console.log('💰 [COMPRA-LIST] totalCompra na primeira compra:', comprasBackend[0]?.totalCompra);
          console.log('💰 [COMPRA-LIST] custoTotal na primeira compra:', comprasBackend[0]?.custoTotal);
        }
        
        // ✅ Converter compras do backend para nosso formato normalizado
        this.compras = comprasBackend.map(compraBackend => {
          // Usar a nova função de normalização
          const compraNormalizada = normalizarCompraDoBackend(compraBackend);
          
          console.log('🔄 [COMPRA-LIST] Compra normalizada:', {
            id: compraNormalizada.id,
            custoTotal: compraNormalizada.custoTotal,
            totalCompra: compraNormalizada.totalCompra,
            dataEntrada: compraNormalizada.dataEntrada,
            itensCount: compraNormalizada.itens?.length
          });
          
          // Adicionar propriedade de controle UI
          const compraComUI: CompraComUI = {
            ...compraNormalizada,
            mostrarProdutos: false
          };
          
          return compraComUI;
        });
        
        // ✅ Ordenar por data - mais recentes primeiro
        this.compras.sort((a, b) => {
          const dataA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
          const dataB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
          return dataB - dataA;
        });
        
        console.log('✅ [COMPRA-LIST] Compras carregadas:', this.compras.length);
        
        // ✅ DEBUG: Verificar custos após normalização
        if (this.compras.length > 0) {
          const primeiraCompra = this.compras[0];
          console.log('💰 [DEBUG FINAL] Primeira compra após normalização:', {
            id: primeiraCompra.id,
            idPedidoCompra: primeiraCompra.idPedidoCompra,
            custoTotal: primeiraCompra.custoTotal,
            totalCompra: primeiraCompra.totalCompra,
            itens: primeiraCompra.itens?.length
          });
        }
      },
      error: (error) => {
        console.error('❌ [COMPRA-LIST] Erro ao carregar compras do novo endpoint:', error);
        
        // ✅ FALLBACK: Tentar endpoint legacy se o novo falhar
        console.log('🔄 [COMPRA-LIST] Tentando endpoint legacy como fallback...');
        this.carregarComprasLegacy();
      }
    });
  }

  // ✅ MÉTODO DE FALLBACK para endpoint legacy
  private carregarComprasLegacy(): void {
    this.compraService.getCompras().subscribe({
      next: (comprasLegacy: any[]) => {
        console.log('🔄 [COMPRA-LIST] Compras legacy recebidas:', comprasLegacy.length);
        
        // ✅ Converter compras legacy para novo formato
        this.compras = comprasLegacy.map(compraLegacy => {
          const compraConvertida = converterCompraAntigaParaNova(compraLegacy);
          
          // ✅ Adicionar propriedade de controle UI
          const compraComUI: CompraComUI = {
            ...compraConvertida,
            mostrarProdutos: false
          };
          
          return compraComUI;
        });
        
        // ✅ Agrupar compras pelo mesmo idPedidoCompra
        this.agruparComprasPorPedido();
        
        // ✅ Ordenar por data
        this.compras.sort((a, b) => {
          const dataA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
          const dataB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
          return dataB - dataA;
        });
        
        console.log('✅ [COMPRA-LIST] Compras legacy convertidas:', this.compras.length);
      },
      error: (error) => {
        console.error('❌ [COMPRA-LIST] Erro ao carregar compras legacy:', error);
        this.modalService.mostrarErro('Erro ao carregar compras. Tente novamente.');
      }
    });
  }

  // ✅ Método para agrupar compras com o mesmo idPedidoCompra (para dados legacy)
  private agruparComprasPorPedido(): void {
    const comprasAgrupadas = new Map<string, CompraComUI>();
    
    this.compras.forEach(compra => {
      const key = compra.idPedidoCompra;
      
      if (comprasAgrupadas.has(key)) {
        // Já existe uma compra com este idPedidoCompra, adicionar itens
        const compraExistente = comprasAgrupadas.get(key)!;
        
        if (compra.itens && compra.itens.length > 0) {
          compraExistente.itens = [...compraExistente.itens, ...compra.itens];
        }
        
        // Atualizar totais
        compraExistente.quantidadeTotal = (compraExistente.quantidadeTotal || 0) + (compra.quantidadeTotal || 0);
        compraExistente.custoTotal = (compraExistente.custoTotal || 0) + (compra.custoTotal || 0);
        
      } else {
        // Primeira compra com este idPedidoCompra
        comprasAgrupadas.set(key, { ...compra });
      }
    });
    
    // Converter Map de volta para array
    this.compras = Array.from(comprasAgrupadas.values());
  }

  // MÉTODO PARA OBTER mostrarProdutos COM TIPAGEM SEGURA
  getMostrarProdutos(compra: CompraComUI): boolean {
    return compra.mostrarProdutos;
  }

  // Quantidade total de TODOS os itens da compra
  getQuantidadeTotal(compra: CompraComUI): number {
    if (compra.itens && compra.itens.length > 0) {
      return compra.itens.reduce((total, item) => total + (item.quantidade || 0), 0);
    }
    return compra.quantidadeTotal || 0;
  }

  // Número de produtos diferentes na compra
  getNumeroProdutos(compra: CompraComUI): number {
    return compra.itens ? compra.itens.length : 0;
  }

  // Resumo dos produtos (ex: "Produto A, Produto B + 2 mais")
  getResumoProdutos(compra: CompraComUI): string {
    if (!compra.itens || compra.itens.length === 0) {
      return `Compra ${compra.idPedidoCompra}`;
    }
    
    if (compra.itens.length === 1) {
      return compra.itens[0].produtoNome || `Compra ${compra.idPedidoCompra}`;
    }
    
    if (compra.itens.length === 2) {
      const produto1 = compra.itens[0].produtoNome || 'Produto 1';
      const produto2 = compra.itens[1].produtoNome || 'Produto 2';
      return `${produto1} e ${produto2}`;
    }
    
    // Para 3 ou mais produtos
    const primeiroProduto = compra.itens[0].produtoNome || 'Produto';
    const outrosQuantidade = compra.itens.length - 1;
    return `${primeiroProduto} + ${outrosQuantidade} mais`;
  }

  // Alternar exibição da lista de produtos
  toggleProdutos(compra: CompraComUI): void {
    compra.mostrarProdutos = !compra.mostrarProdutos;
  }

  novaCompra(): void {
    this.compraEditando = null;
    this.mostrarModal = true;
  }

  editarCompra(compra: CompraComUI): void {
    this.compraEditando = compra;
    this.mostrarModal = true;
  }

  excluirCompra(compra: CompraComUI): void {
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a compra "${compra.idPedidoCompra}"?`,
      () => {
        if (compra.id) {
          // ✅ Tenta excluir usando endpoint novo primeiro
          this.compraService.excluirCompra(compra.id).subscribe({
            next: () => {
              this.modalService.mostrarSucesso('Compra excluída com sucesso!');
              this.carregarCompras();
            },
            error: (error) => {
              console.error('❌ Erro ao excluir compra:', error);
              
              if (error.error && error.error.includes('Não é possível excluir um lote que já foi parcialmente consumido')) {
                this.mostrarModalPepsExclusao(error.error, compra);
              } else {
                this.modalService.mostrarErro('Erro ao excluir compra!');
              }
            }
          });
        }
      }
    );
  }

  private mostrarModalPepsExclusao(mensagemErro: string, compra: CompraComUI): void {
    const saldoMatch = mensagemErro.match(/Saldo atual: (\d+)/);
    const quantidadeMatch = mensagemErro.match(/Quantidade original: (\d+)/);
    
    const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
    const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;

    this.modalService.mostrarAlertaPepsExclusao(saldoAtual, quantidadeAntiga);
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.compraEditando = null;
  }

  onCompraSalva(): void {
    this.carregarCompras();
    this.fecharModal(); 
  }

  getDataCompra(compra: CompraComUI): string {
    if (!compra.dataEntrada) return 'Data não informada';
    
    try {
      const dataParte = compra.dataEntrada.split('T')[0];
      const dataObj = new Date(dataParte);
      return dataObj.toLocaleDateString('pt-BR');
    } catch (e) {
      console.warn('Erro ao formatar data:', compra.dataEntrada, e);
      return 'Data inválida';
    }
  }

  // Método para obter custo total formatado
  getCustoTotal(compra: CompraComUI): number {
    return compra.custoTotal || 0;
  }
}