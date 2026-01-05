import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasService } from '../../services/compra.service';
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';
import { Compra, normalizarCompraDoBackend, converterCompraAntigaParaNova, isCompraSistemaAntigo } from '../../models/compra';

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
  carregando: boolean = true;
  mostrarModal: boolean = false;
  compraEditando: Compra | null = null;
  erroCarregamento: string = '';

  constructor(
    private compraService: ComprasService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarCompras();
  }

  carregarCompras(): void {
    console.log('🚀 [COMPRA-LIST] Carregando compras...');
    this.carregando = true;
    this.erroCarregamento = '';
    
    // ✅ ESTRATÉGIA DE CARREGAMENTO COM FALLBACK
    this.compraService.getComprasUnificadas().subscribe({
      next: (comprasBackend: any[]) => {
        this.processarComprasUnificadas(comprasBackend);
        this.carregando = false;
      },
      error: (error) => {
        console.warn('⚠️ [COMPRA-LIST] Endpoint unificado falhou, tentando fallback...', error);
        this.tentarFallbackMultiplos();
      }
    });
  }

  private processarComprasUnificadas(comprasBackend: any[]): void {
    console.log('✅ [COMPRA-LIST] Compras unificadas recebidas:', comprasBackend.length);
    
    if (comprasBackend.length > 0) {
      console.log('🔍 [COMPRA-LIST] Primeira compra (raw):', comprasBackend[0]);
      console.log('📊 [COMPRA-LIST] Sistema antigo?', comprasBackend[0]?.sistemaAntigo);
    }
    
    // ✅ Converter compras do backend para nosso formato normalizado
    this.compras = comprasBackend.map(compraBackend => {
      const compraNormalizada = normalizarCompraDoBackend(compraBackend);
      
      console.log('🔄 [COMPRA-LIST] Compra normalizada:', {
        id: compraNormalizada.id,
        sistemaAntigo: compraNormalizada.sistemaAntigo,
        idPedidoCompra: compraNormalizada.idPedidoCompra,
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
    this.ordenarCompras();
    
    console.log('✅ [COMPRA-LIST] Compras carregadas:', this.compras.length);
    
    // ✅ DEBUG: Verificar estatísticas
    const comprasNovas = this.compras.filter(c => !c.sistemaAntigo).length;
    const comprasAntigas = this.compras.filter(c => c.sistemaAntigo).length;
    console.log(`📊 [COMPRA-LIST] Estatísticas: ${comprasNovas} novas, ${comprasAntigas} antigas`);
  }

  private tentarFallbackMultiplos(): void {
    // Tenta endpoint de múltiplos produtos
    this.compraService.getComprasMultiplos().subscribe({
      next: (comprasMultiplos: any[]) => {
        console.log('🔄 [COMPRA-LIST] Compras múltiplas recebidas:', comprasMultiplos.length);
        
        const comprasProcessadas = comprasMultiplos.map(compraMultipla => {
          const compraConvertida = normalizarCompraDoBackend(compraMultipla);
          
          // ✅ Adicionar propriedade de controle UI
          const compraComUI: CompraComUI = {
            ...compraConvertida,
            mostrarProdutos: false
          };
          
          return compraComUI;
        });
        
        this.compras = comprasProcessadas;
        this.ordenarCompras();
        
        // Tenta carregar entradas antigas também
        this.carregarEntradasAntigas();
      },
      error: (error) => {
        console.error('❌ [COMPRA-LIST] Endpoint múltiplos falhou, tentando legacy...', error);
        this.tentarFallbackLegacy();
      }
    });
  }

  private carregarEntradasAntigas(): void {
    this.compraService.getCompras().subscribe({
      next: (entradasAntigas: any[]) => {
        console.log('🔄 [COMPRA-LIST] Entradas antigas recebidas:', entradasAntigas.length);
        
        const comprasAntigas = entradasAntigas.map(entrada => {
          const compraConvertida = converterCompraAntigaParaNova(entrada);
          return {
            ...compraConvertida,
            mostrarProdutos: false
          };
        });
        
        // Combinar compras novas com antigas
        this.compras = [...this.compras, ...comprasAntigas];
        this.agruparComprasPorPedido();
        this.ordenarCompras();
        
        console.log('✅ [COMPRA-LIST] Total compras (novas + antigas):', this.compras.length);
        this.carregando = false;
      },
      error: (error) => {
        console.warn('⚠️ [COMPRA-LIST] Não foi possível carregar entradas antigas:', error);
        // Usa apenas as compras processadas
        this.ordenarCompras();
        this.carregando = false;
      }
    });
  }

  private tentarFallbackLegacy(): void {
    // Último recurso: endpoint legacy
    this.compraService.getCompras().subscribe({
      next: (comprasLegacy: any[]) => {
        console.log('🔄 [COMPRA-LIST] Compras legacy recebidas:', comprasLegacy.length);
        
        const comprasConvertidas = comprasLegacy.map(compraLegacy => {
          const compraConvertida = converterCompraAntigaParaNova(compraLegacy);
          return {
            ...compraConvertida,
            mostrarProdutos: false
          };
        });
        
        this.compras = comprasConvertidas;
        this.agruparComprasPorPedido();
        this.ordenarCompras();
        
        console.log('✅ [COMPRA-LIST] Compras legacy carregadas:', this.compras.length);
        this.carregando = false;
        
        if (this.compras.length === 0) {
          this.erroCarregamento = 'Nenhuma compra encontrada.';
        }
      },
      error: (error) => {
        console.error('❌ [COMPRA-LIST] Todos os endpoints falharam:', error);
        this.carregando = false;
        this.erroCarregamento = 'Erro ao carregar compras. Tente novamente mais tarde.';
        this.modalService.mostrarErro('Não foi possível carregar as compras. Verifique sua conexão.');
      }
    });
  }

  private ordenarCompras(): void {
    this.compras.sort((a, b) => {
      const dataA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
      const dataB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
      return dataB - dataA; // Mais recentes primeiro
    });
  }

  private agruparComprasPorPedido(): void {
    const comprasAgrupadas = new Map<string, CompraComUI>();
    
    this.compras.forEach(compra => {
      const key = compra.idPedidoCompra;
      
      if (comprasAgrupadas.has(key)) {
        const compraExistente = comprasAgrupadas.get(key)!;
        
        if (compra.itens && compra.itens.length > 0) {
          compraExistente.itens = [...compraExistente.itens, ...compra.itens];
        }
        
        compraExistente.quantidadeTotal = (compraExistente.quantidadeTotal || 0) + (compra.quantidadeTotal || 0);
        compraExistente.custoTotal = (compraExistente.custoTotal || 0) + (compra.custoTotal || 0);
      } else {
        comprasAgrupadas.set(key, { ...compra });
      }
    });
    
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

  // ✅ NOVO: Verificar se é compra do sistema antigo
  isSistemaAntigo(compra: CompraComUI): boolean {
    return isCompraSistemaAntigo(compra);
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
    // ✅ Verificar se é compra do sistema antigo (não editável)
    if (this.isSistemaAntigo(compra)) {
      this.modalService.mostrarErro('Compras do sistema antigo não podem ser editadas. Crie uma nova compra.');
      return;
    }
    
    this.compraEditando = compra;
    this.mostrarModal = true;
  }

  excluirCompra(compra: CompraComUI): void {
    // ✅ Verificar se é compra do sistema antigo (não excluível via novo endpoint)
    if (this.isSistemaAntigo(compra)) {
      this.modalService.mostrarErro('Compras do sistema antigo devem ser excluídas pela tela de entradas de estoque.');
      return;
    }
    
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a compra "${compra.idPedidoCompra}"?`,
      () => {
        if (compra.id && compra.id > 0) {
          // ✅ Tenta excluir usando endpoint novo primeiro
          this.compraService.excluirCompraMultipla(compra.id).subscribe({
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