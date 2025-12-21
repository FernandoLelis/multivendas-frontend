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

  // ✅ CORRIGIDO: Agora usa CreateVendaDTO para criar
  getVendas(): Observable<Venda[]> {
    return this.http.get<Venda[]>(this.apiUrl).pipe(
      tap(vendas => {
        console.log('🔍 [DEBUG GET VENDAS] Vendas recebidas:', vendas.length);
        vendas.forEach((venda, index) => {
          console.log(`🔍 [DEBUG GET VENDAS] Venda ${index} - ID: ${venda.id}, Pedido: ${venda.idPedido}`);
          console.log(`🔍 [DEBUG GET VENDAS] Itens: ${venda.itens?.length || 0}`);
          
          if (venda.itens && venda.itens.length > 0) {
            console.log('🔍 [DEBUG GET VENDAS] IDs dos itens:', venda.itens.map(item => item.id));
            console.log('🔍 [DEBUG GET VENDAS] Produto IDs:', venda.itens.map(item => item.produtoId));
            console.log('🔍 [DEBUG GET VENDAS] Quantidades:', venda.itens.map(item => item.quantidade));
            
            // Verificar duplicatas
            const produtoIds = venda.itens.map(item => item.produtoId);
            const idsUnicos = [...new Set(produtoIds)];
            const temDuplicatas = idsUnicos.length !== produtoIds.length;
            
            if (temDuplicatas) {
              console.warn('⚠️ [DEBUG GET VENDAS] VENDA COM ITENS DUPLICADOS:', venda.idPedido);
              console.warn('⚠️ [DEBUG GET VENDAS] IDs duplicados:', 
                produtoIds.filter((id, index) => produtoIds.indexOf(id) !== index));
            } else {
              console.log('✅ [DEBUG GET VENDAS] Venda sem duplicatas');
            }
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
        console.log('🔍 [DEBUG GET VENDA INDIVIDUAL] Itens:', venda.itens?.length || 0);
        
        if (venda.itens) {
          venda.itens.forEach((item, index) => {
            console.log(`🔍 [DEBUG GET VENDA INDIVIDUAL] Item ${index}:`, {
              id: item.id,
              produtoId: item.produtoId,
              produtoNome: item.produtoNome,
              quantidade: item.quantidade,
              custoUnitario: item.custoUnitario,
              loteId: item.loteId
            });
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

  // ✅ CORRIGIDO: Agora usa CreateVendaDTO
  criarVenda(venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Iniciando criação de venda...');
    console.log('📤 [DEBUG] Venda recebida no service:', venda);
    console.log('📤 [DEBUG] Tipo de venda.itens:', typeof venda.itens);
    console.log('📤 [DEBUG] venda.itens é Array?', Array.isArray(venda.itens));
    
    if (venda.itens) {
      console.log('📤 [DEBUG] Itens recebidos:', venda.itens.length);
      venda.itens.forEach((item, index) => {
        console.log(`📤 [DEBUG] Item ${index}:`, {
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          produtoNome: item.produtoNome,
          precoUnitarioVenda: item.precoUnitarioVenda,
          precoTotalItem: item.precoTotalItem
        });
      });
    }
    
    // ✅ 1. Calcular precoVenda automaticamente (se não foi definido)
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
      console.log('📤 [DEBUG] precoVenda calculado:', venda.precoVenda);
    }
    
    // ✅ 2. Preparar dados para o backend usando CreateVendaDTO
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    console.log('📤 [DEBUG] Dados preparados para backend:', vendaParaBackend);
    console.log('📤 [DEBUG] JSON stringify:', JSON.stringify(vendaParaBackend, null, 2));
    
    return this.http.post<Venda>(this.apiUrl, vendaParaBackend).pipe(
      tap(response => {
        console.log('✅ [DEBUG] Resposta do backend recebida!');
        console.log('✅ [DEBUG] Venda criada com ID:', response.id);
        console.log('✅ [DEBUG] Pedido:', response.idPedido);
        console.log('✅ [DEBUG] Itens retornados:', response.itens?.length || 0, 'itens');
        
        if (response.itens && response.itens.length > 0) {
          console.log('🔍 [DEBUG DETALHADO] Detalhes dos itens:');
          response.itens.forEach((item: any, index: number) => {
            console.log(`   Item ${index}:`, {
              id: item.id,
              produtoId: item.produtoId,
              produtoNome: item.produtoNome,
              quantidade: item.quantidade,
              custoUnitario: item.custoUnitario,
              loteId: item.loteId,
              custoTotal: item.custoTotal
            });
          });
          
          // Verificar duplicatas
          const produtoIds = response.itens.map((item: any) => item.produtoId);
          const idsUnicos = [...new Set(produtoIds)];
          const temDuplicatas = idsUnicos.length !== produtoIds.length;
          
          if (temDuplicatas) {
            console.error('❌ [DEBUG] VENDA CRIADA COM ITENS DUPLICADOS!');
            console.error('❌ [DEBUG] IDs duplicados:', 
              produtoIds.filter((id, index) => produtoIds.indexOf(id) !== index));
          } else {
            console.log('✅ [DEBUG] Venda criada SEM duplicatas!');
          }
        }
        
        // Verificar campos calculados
        console.log('🔍 [DEBUG] Campos calculados:', {
          custoProdutoVendido: response.custoProdutoVendido,
          faturamento: response.faturamento,
          custoEfetivoTotal: response.custoEfetivoTotal,
          lucroBruto: response.lucroBruto,
          lucroLiquido: response.lucroLiquido,
          roi: response.roi
        });
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro na requisição:', error);
        console.error('❌ [ERRO] Status:', error.status);
        console.error('❌ [ERRO] Mensagem:', error.message);
        
        if (error.error) {
          console.error('❌ [ERRO] Detalhes do erro:', error.error);
        }
        
        return throwError(() => error);
      })
    );
  }

  // ✅ CORRIGIDO: Agora também usa CreateVendaDTO
  atualizarVenda(id: number, venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Atualizando venda:', id);
    
    // Calcular precoVenda automaticamente (se não foi definido)
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
      console.log('📤 [DEBUG] precoVenda calculado para atualização:', venda.precoVenda);
    }
    
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    console.log('📤 [DEBUG] Dados para atualização:', vendaParaBackend);
    
    return this.http.put<Venda>(`${this.apiUrl}/${id}`, vendaParaBackend).pipe(
      tap(response => {
        console.log('✅ [DEBUG] Venda atualizada:', response.id);
        console.log('✅ [DEBUG] Itens na resposta:', response.itens?.length || 0, 'itens');
        
        if (response.itens) {
          response.itens.forEach((item: any, index: number) => {
            console.log(`   Item ${index}:`, {
              id: item.id,
              produtoId: item.produtoId,
              quantidade: item.quantidade
            });
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

  // ✅ CORRIGIDO: Método atualizado para usar CreateVendaDTO
  private prepararVendaParaBackend(venda: Venda): CreateVendaDTO {
    console.log('🔄 Preparando venda para backend...');
    
    // Usar a função auxiliar do item-venda.ts
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
    
    console.log('📤 [DEBUG] Itens preparados:', vendaParaBackend.itens.length, 'itens');
    
    if (vendaParaBackend.itens.length > 0) {
      console.log('📤 [DEBUG] Primeiro item preparado:', vendaParaBackend.itens[0]);
      console.log('📤 [DEBUG] Último item preparado:', vendaParaBackend.itens[vendaParaBackend.itens.length - 1]);
      
      // Verificar se há itens com mesmo produtoId
      const produtoIds = vendaParaBackend.itens.map(item => item.produtoId);
      const temDuplicatas = new Set(produtoIds).size !== produtoIds.length;
      
      if (temDuplicatas) {
        console.warn('⚠️ [DEBUG] ATENÇÃO: Itens com mesmo produtoId no carrinho!');
      }
    }
    
    return vendaParaBackend;
  }

  // ✅ NOVO: Método para validar estoque antes de enviar
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

  // ✅ NOVO: Método para teste rápido
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

  // ✅ NOVO: Método para buscar venda pelo ID do pedido
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