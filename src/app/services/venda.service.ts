import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Venda, calcularPrecoTotalVenda } from '../models/venda';
import { ItemVenda, CreateVendaDTO, criarCreateVendaDTO } from '../models/item-venda';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VendaService {
  private apiUrl = `${environment.apiUrl}/api/vendas`;

  constructor(private http: HttpClient) { }

  getVendas(): Observable<Venda[]> {
    return this.http.get<Venda[]>(this.apiUrl).pipe(
      tap(vendas => {
        console.log('🔍 [DEBUG GET VENDAS] Vendas recebidas:', vendas.length);
        
        // ✅ CORREÇÃO: Analisar lotes PEPS em vez de verificar duplicados
        vendas.forEach((venda, index) => {
          console.log(`🔍 [DEBUG GET VENDAS] Venda ${index} - ID: ${venda.id}, Pedido: ${venda.idPedido}`);
          
          if (venda.itens && venda.itens.length > 0) {
            console.log(`🔍 [DEBUG GET VENDAS] Total de itens (lotes): ${venda.itens.length}`);
            
            // Agrupar itens por produto para entender o PEPS
            const itensPorProduto = new Map<number, any[]>();
            
            venda.itens.forEach((item: any) => {
              if (!itensPorProduto.has(item.produtoId)) {
                itensPorProduto.set(item.produtoId, []);
              }
              itensPorProduto.get(item.produtoId)!.push(item);
            });
            
            // Mostrar análise por produto
            itensPorProduto.forEach((itens, produtoId) => {
              if (itens.length > 1) {
                console.log(`📦 [DEBUG GET VENDAS] Produto ${produtoId}: ${itens.length} lotes PEPS`);
                itens.forEach((item, loteIndex) => {
                  console.log(`   Lote ${loteIndex + 1}: ${item.quantidade} un. - Custo: R$${item.custoUnitario || 'N/A'}`);
                });
              }
            });
          }
        });
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro ao carregar vendas:', error);
        return throwError(() => error);
      })
    );
  }

  getVenda(id: number): Observable<Venda> {
    return this.http.get<Venda>(`${this.apiUrl}/${id}`).pipe(
      tap(venda => {
        console.log('🔍 [DEBUG GET VENDA INDIVIDUAL] Venda ID:', id);
        console.log('🔍 [DEBUG GET VENDA INDIVIDUAL] Pedido:', venda.idPedido);
        console.log('🔍 [DEBUG GET VENDA INDIVIDUAL] Itens totais (lotes):', venda.itens?.length || 0);
        
        if (venda.itens && venda.itens.length > 0) {
          // ✅ CORREÇÃO: Agrupar por produto para mostrar análise PEPS
          const itensPorProduto = new Map<number, any[]>();
          
          venda.itens.forEach((item: any) => {
            if (!itensPorProduto.has(item.produtoId)) {
              itensPorProduto.set(item.produtoId, []);
            }
            itensPorProduto.get(item.produtoId)!.push(item);
          });
          
          console.log('📊 [DEBUG GET VENDA INDIVIDUAL] Análise PEPS por produto:');
          itensPorProduto.forEach((itens, produtoId) => {
            const produtoNome = itens[0].produtoNome || `Produto ${produtoId}`;
            const quantidadeTotal = itens.reduce((sum, item) => sum + item.quantidade, 0);
            const custoTotal = itens.reduce((sum, item) => sum + (item.custoUnitario * item.quantidade), 0);
            
            console.log(`   ${produtoNome}: ${quantidadeTotal} unidades em ${itens.length} lote(s)`);
            
            if (itens.length > 1) {
              console.log('   Detalhes dos lotes:');
              itens.forEach((item, index) => {
                console.log(`     Lote ${index + 1}: ${item.quantidade} un. - Custo: R$${item.custoUnitario}`);
              });
            }
          });
        }
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro ao buscar venda:', error);
        return throwError(() => error);
      })
    );
  }

  getCalculos(vendaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${vendaId}/calculos`);
  }

  criarVenda(venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Iniciando criação de venda...');
    console.log('📤 [DEBUG] Venda recebida no service:', {
      idPedido: venda.idPedido,
      plataforma: venda.plataforma,
      totalItens: venda.itens?.length || 0
    });
    
    if (venda.itens) {
      console.log('📤 [DEBUG] Itens recebidos no frontend:', venda.itens.length);
      
      // ✅ CORREÇÃO: Mostrar análise dos itens recebidos
      const itensPorProduto = new Map<number, any[]>();
      
      venda.itens.forEach(item => {
        if (!itensPorProduto.has(item.produtoId)) {
          itensPorProduto.set(item.produtoId, []);
        }
        itensPorProduto.get(item.produtoId)!.push(item);
      });
      
      console.log('📊 [DEBUG] Análise dos itens enviados:');
      itensPorProduto.forEach((itens, produtoId) => {
        const quantidadeTotal = itens.reduce((sum, item) => sum + item.quantidade, 0);
        console.log(`   Produto ${produtoId}: ${quantidadeTotal} unidades (${itens.length} ${itens.length === 1 ? 'item' : 'itens'})`);
      });
    }
    
    // ✅ 1. Calcular precoVenda automaticamente
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
      console.log('📤 [DEBUG] precoVenda calculado:', venda.precoVenda);
    }
    
    // ✅ 2. Preparar dados para o backend
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    console.log('📤 [DEBUG] Dados preparados para backend:', {
      idPedido: vendaParaBackend.idPedido,
      totalItensEnviados: vendaParaBackend.itens.length
    });
    
    return this.http.post<Venda>(this.apiUrl, vendaParaBackend).pipe(
      tap(response => {
        console.log('✅ [DEBUG] ✅✅✅ VENDA CRIADA COM SUCESSO! ✅✅✅');
        console.log('✅ [DEBUG] Venda ID:', response.id);
        console.log('✅ [DEBUG] Pedido:', response.idPedido);
        console.log('✅ [DEBUG] Total de itens (lotes) retornados:', response.itens?.length || 0);
        
        if (response.itens && response.itens.length > 0) {
          // ✅✅✅ CORREÇÃO CRÍTICA: Análise correta do PEPS
          console.log('📊 [DEBUG] 🎯 ANÁLISE DO PEPS APLICADO:');
          
          const itensPorProduto = new Map<number, any[]>();
          
          response.itens.forEach((item: any) => {
            if (!itensPorProduto.has(item.produtoId)) {
              itensPorProduto.set(item.produtoId, []);
            }
            itensPorProduto.get(item.produtoId)!.push(item);
          });
          
          // Análise detalhada por produto
          itensPorProduto.forEach((itens, produtoId) => {
            const produtoNome = itens[0].produtoNome || `Produto ${produtoId}`;
            const quantidadeTotal = itens.reduce((sum, item) => sum + item.quantidade, 0);
            const custoTotal = itens.reduce((sum, item) => sum + (item.custoUnitario * item.quantidade), 0);
            
            console.log(`📦 [DEBUG] ${produtoNome}:`);
            console.log(`   Quantidade total: ${quantidadeTotal} unidades`);
            console.log(`   Custo total: R$${custoTotal.toFixed(2)}`);
            console.log(`   Lotes consumidos: ${itens.length}`);
            
            if (itens.length > 1) {
              console.log('   Detalhamento dos lotes (PEPS):');
              itens.forEach((item, index) => {
                const custoLote = item.custoUnitario * item.quantidade;
                console.log(`     Lote ${index + 1}: ${item.quantidade} un. x R$${item.custoUnitario} = R$${custoLote.toFixed(2)}`);
              });
            }
          });
          
          console.log('✅ [DEBUG] ✅✅✅ PEPS APLICADO CORRETAMENTE! ✅✅✅');
          console.log('✅ [DEBUG] O sistema consumiu múltiplos lotes conforme necessário.');
        }
        
        // Campos calculados
        console.log('💰 [DEBUG] Campos calculados:', {
          custoProdutoVendido: response.custoProdutoVendido,
          faturamento: response.faturamento,
          custoEfetivoTotal: response.custoEfetivoTotal,
          lucroBruto: response.lucroBruto,
          lucroLiquido: response.lucroLiquido,
          roi: response.roi ? `${response.roi.toFixed(2)}%` : 'N/A'
        });
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro na requisição:', error);
        console.error('❌ [ERRO] Status:', error.status);
        
        if (error.error) {
          console.error('❌ [ERRO] Detalhes do erro:', error.error);
          
          // Tratamento específico para erro de ID duplicado
          if (error.error.includes && error.error.includes('Já existe uma venda com este ID do pedido')) {
            console.error('❌ [ERRO] ID do pedido já existe no sistema!');
          }
        }
        
        return throwError(() => error);
      })
    );
  }

  atualizarVenda(id: number, venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Atualizando venda:', id);
    
    // Calcular precoVenda automaticamente
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
      console.log('📤 [DEBUG] precoVenda calculado para atualização:', venda.precoVenda);
    }
    
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    console.log('📤 [DEBUG] Dados para atualização:', {
      idVenda: id,
      totalItens: vendaParaBackend.itens.length
    });
    
    return this.http.put<Venda>(`${this.apiUrl}/${id}`, vendaParaBackend).pipe(
      tap(response => {
        console.log('✅ [DEBUG] Venda atualizada com sucesso!');
        console.log('✅ [DEBUG] Venda ID:', response.id);
        console.log('✅ [DEBUG] Total de itens (lotes) após atualização:', response.itens?.length || 0);
        
        if (response.itens) {
          console.log('📊 [DEBUG] Análise PEPS pós-atualização:');
          
          const itensPorProduto = new Map<number, any[]>();
          response.itens.forEach((item: any) => {
            if (!itensPorProduto.has(item.produtoId)) {
              itensPorProduto.set(item.produtoId, []);
            }
            itensPorProduto.get(item.produtoId)!.push(item);
          });
          
          itensPorProduto.forEach((itens, produtoId) => {
            if (itens.length > 1) {
              console.log(`   Produto ${produtoId}: ${itens.length} lotes PEPS`);
            }
          });
        }
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro ao atualizar:', error);
        return throwError(() => error);
      })
    );
  }

  excluirVenda(id: number): Observable<void> {
    console.log('🗑️ [DEBUG] Excluindo venda:', id);
    
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('✅ Venda excluída:', id);
      }),
      catchError(error => {
        console.error('❌ Erro ao excluir venda:', error);
        return throwError(() => error);
      })
    );
  }

  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`).pipe(
      catchError(error => {
        console.error('❌ Erro no dashboard:', error);
        return throwError(() => error);
      })
    );
  }

  getVendasPorPlataforma(plataforma: string): Observable<Venda[]> {
    return this.http.get<Venda[]>(`${this.apiUrl}/plataforma/${plataforma}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao buscar vendas por plataforma:', error);
        return throwError(() => error);
      })
    );
  }

  private prepararVendaParaBackend(venda: Venda): CreateVendaDTO {
    console.log('🔄 Preparando venda para backend...');
    
    const vendaParaBackend = criarCreateVendaDTO(
      venda.idPedido,
      venda.plataforma,
      venda.precoVenda,
      venda.itens,
      venda.fretePagoPeloCliente,
      venda.custoEnvio,
      venda.tarifaPlataforma,
      venda.data
    );
    
    console.log('📤 [DEBUG] Itens preparados para backend:', vendaParaBackend.itens.length);
    
    // ✅ CORREÇÃO: Mostrar análise dos itens preparados
    const itensPorProduto = new Map<number, any[]>();
    vendaParaBackend.itens.forEach(item => {
      if (!itensPorProduto.has(item.produtoId)) {
        itensPorProduto.set(item.produtoId, []);
      }
      itensPorProduto.get(item.produtoId)!.push(item);
    });
    
    console.log('📊 [DEBUG] Resumo dos itens enviados:');
    itensPorProduto.forEach((itens, produtoId) => {
      const quantidadeTotal = itens.reduce((sum, item) => sum + item.quantidade, 0);
      console.log(`   Produto ${produtoId}: ${quantidadeTotal} unidades (${itens.length} ${itens.length === 1 ? 'item' : 'itens'} no carrinho)`);
    });
    
    return vendaParaBackend;
  }

  validarEstoqueVenda(venda: Venda): Observable<any> {
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    return this.http.post(`${this.apiUrl}/validar-estoque`, {
      itens: vendaParaBackend.itens
    }).pipe(
      tap(response => {
        console.log('✅ Validação de estoque OK:', response);
      }),
      catchError(error => {
        console.error('❌ Erro na validação de estoque:', error);
        return throwError(() => error);
      })
    );
  }

  testarConexao(): Observable<any> {
    return this.http.get(`${this.apiUrl}/teste`).pipe(
      tap(response => {
        console.log('✅ Conexão com backend OK:', response);
      }),
      catchError(error => {
        console.error('❌ Erro na conexão com backend:', error);
        return throwError(() => error);
      })
    );
  }

  buscarVendaPorIdPedido(idPedido: string): Observable<Venda[]> {
    return this.http.get<Venda[]>(`${this.apiUrl}/pedido/${idPedido}`).pipe(
      tap(vendas => {
        console.log('🔍 Vendas encontradas para ID:', idPedido, 'Total:', vendas.length);
      }),
      catchError(error => {
        console.error('❌ Erro ao buscar venda por ID do pedido:', error);
        return throwError(() => error);
      })
    );
  }
}