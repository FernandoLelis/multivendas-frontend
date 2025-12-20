import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Venda, calcularPrecoTotalVenda } from '../models/venda';
import { ItemVenda } from '../models/item-venda';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VendaService {
  private apiUrl = `${environment.apiUrl}/api/vendas`;

  constructor(private http: HttpClient) { }

  getVendas(): Observable<Venda[]> {
    return this.http.get<Venda[]>(this.apiUrl);
  }

  getVenda(id: number): Observable<Venda> {
    return this.http.get<Venda>(`${this.apiUrl}/${id}`);
  }

  getCalculos(vendaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${vendaId}/calculos`);
  }

  criarVenda(venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Venda recebida no service:', venda);
    
    // ✅ 1. Calcular precoVenda automaticamente (se não foi definido)
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
      console.log('📤 [DEBUG] precoVenda calculado:', venda.precoVenda);
    }
    
    // ✅ 2. Preparar dados para o backend
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    console.log('📤 [DEBUG] Enviando para backend:', vendaParaBackend);
    console.log('📤 [DEBUG] JSON stringify:', JSON.stringify(vendaParaBackend, null, 2));
    
    return this.http.post<Venda>(this.apiUrl, vendaParaBackend).pipe(
      tap(response => {
        console.log('✅ [DEBUG] Resposta do backend:', response);
        console.log('✅ [DEBUG] Itens retornados:', response.itens?.length || 0, 'itens');
      }),
      catchError(error => {
        console.error('❌ [ERRO] Erro na requisição:', error);
        console.error('❌ [ERRO] Detalhes:', error.error);
        console.error('❌ [ERRO] Status:', error.status);
        return throwError(() => error);
      })
    );
  }

  atualizarVenda(id: number, venda: Venda): Observable<Venda> {
    console.log('📤 [DEBUG] Atualizando venda:', id);
    
    // ✅ Calcular precoVenda automaticamente (se não foi definido)
    if (!venda.precoVenda || venda.precoVenda === 0) {
      venda.precoVenda = calcularPrecoTotalVenda(venda.itens);
    }
    
    const vendaParaBackend = this.prepararVendaParaBackend(venda);
    
    return this.http.put<Venda>(`${this.apiUrl}/${id}`, vendaParaBackend).pipe(
      tap(response => console.log('✅ [DEBUG] Venda atualizada:', response)),
      catchError(error => {
        console.error('❌ [ERRO] Erro ao atualizar:', error);
        return throwError(() => error);
      })
    );
  }

  excluirVenda(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  getVendasPorPlataforma(plataforma: string): Observable<Venda[]> {
    return this.http.get<Venda[]>(`${this.apiUrl}/plataforma/${plataforma}`);
  }

  // ✅ CORRIGIDO: Método atualizado para preparar dados sem despesasOperacionais
  private prepararVendaParaBackend(venda: Venda): any {
    // Estrutura que o backend espera
    const vendaParaBackend: any = {
      idPedido: venda.idPedido,
      plataforma: venda.plataforma,
      precoVenda: venda.precoVenda,
      fretePagoPeloCliente: venda.fretePagoPeloCliente || 0,
      custoEnvio: venda.custoEnvio || 0,
      tarifaPlataforma: venda.tarifaPlataforma || 0,
      // ✅ REMOVIDO: despesasOperacionais não faz mais parte da interface Venda
      // Se o backend ainda espera, podemos enviar 0 como valor padrão:
      // despesasOperacionais: 0,
    };

    // ✅ Adicionar data apenas se for uma nova venda (sem ID)
    if (!venda.id && venda.data) {
      vendaParaBackend.data = venda.data;
    }

    // ✅ Preparar itens para o backend
    vendaParaBackend.itens = venda.itens.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade
      // ❌ NÃO enviar: produtoNome, produtoSku, precoUnitarioVenda, etc.
      // O backend calcula custoUnitario e escolhe lote via PEPS
    }));

    console.log('📤 [DEBUG] Itens preparados:', vendaParaBackend.itens.length, 'itens');
    if (vendaParaBackend.itens.length > 0) {
      console.log('📤 [DEBUG] Primeiro item:', vendaParaBackend.itens[0]);
    }

    return vendaParaBackend;
  }

  // ✅ NOVO: Método para validar estoque antes de enviar (opcional)
  validarEstoqueVenda(venda: Venda): Observable<any> {
    const itensParaValidar = venda.itens.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade
    }));

    return this.http.post(`${this.apiUrl}/validar-estoque`, {
      itens: itensParaValidar
    });
  }
}