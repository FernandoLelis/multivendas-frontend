import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produto } from '../models/produto';
import { environment } from '../../environments/environment'; // ✅ environment (não .prod)

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  private apiUrl = `${environment.apiUrl}/api/produtos`; // ✅ CORRETO - apenas um ;

  constructor(private http: HttpClient) { }

  getProdutos(): Observable<Produto[]> {
    console.log('🔍 DEBUG SERVICE - Fazendo requisição GET para:', this.apiUrl);
    return this.http.get<Produto[]>(this.apiUrl);
  }

  getProduto(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.apiUrl}/${id}`);
  }

  criarProduto(produto: Produto): Observable<Produto> {
    return this.http.post<Produto>(this.apiUrl, produto);
  }

  atualizarProduto(id: number, produto: Produto): Observable<Produto> {
    return this.http.put<Produto>(`${this.apiUrl}/${id}`, produto);
  }

  excluirProduto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}