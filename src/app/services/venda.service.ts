import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Venda } from '../models/venda'; // ✅ IMPORTAR A INTERFACE ATUALIZADA

@Injectable({
  providedIn: 'root'
})
export class VendaService {
  private apiUrl = 'http://localhost:8080/api/vendas';

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
    console.log('📤 ENVIANDO PARA BACKEND - Objeto completo:', venda);
    console.log('📤 ENVIANDO PARA BACKEND - JSON stringify:', JSON.stringify(venda, null, 2));
    
    // ✅ CORREÇÃO: Preparar objeto para backend (que espera objeto produto)
    const vendaParaBackend = {
      ...venda,
      produto: { id: venda.produtoId } // ✅ Backend espera objeto produto com id
    };
    
    console.log('📤 ENVIANDO PARA BACKEND - Objeto preparado:', vendaParaBackend);
    
    return this.http.post<Venda>(this.apiUrl, vendaParaBackend).pipe(
      tap(response => console.log('✅ RESPOSTA DO BACKEND:', response)),
      catchError(error => {
        console.error('❌ ERRO NA REQUISIÇÃO:', error);
        console.error('❌ DETALHES DO ERRO:', error.error);
        console.error('❌ STATUS DO ERRO:', error.status);
        console.error('❌ MENSAGEM DO ERRO:', error.message);
        return throwError(() => error);
      })
    );
  }

  atualizarVenda(id: number, venda: Venda): Observable<Venda> {
    // ✅ CORREÇÃO: Preparar objeto para backend (que espera objeto produto)
    const vendaParaBackend = {
      ...venda,
      produto: { id: venda.produtoId } // ✅ Backend espera objeto produto com id
    };
    
    return this.http.put<Venda>(`${this.apiUrl}/${id}`, vendaParaBackend);
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
}