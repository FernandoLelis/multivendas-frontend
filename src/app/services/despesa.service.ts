import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Despesa } from '../models/despesa';

@Injectable({
  providedIn: 'root'
})
export class DespesaService {
  private apiUrl = 'http://localhost:8080/api/despesas';

  constructor(private http: HttpClient) { }

  // GET - Listar todas as despesas
  getDespesas(): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(this.apiUrl);
  }

  // GET - Buscar despesa por ID
  getDespesa(id: number): Observable<Despesa> {
    return this.http.get<Despesa>(`${this.apiUrl}/${id}`);
  }

  // POST - Criar nova despesa
  criarDespesa(despesa: Despesa): Observable<Despesa> {
    return this.http.post<Despesa>(this.apiUrl, despesa);
  }

  // PUT - Atualizar despesa existente
  atualizarDespesa(id: number, despesa: Despesa): Observable<Despesa> {
    return this.http.put<Despesa>(`${this.apiUrl}/${id}`, despesa);
  }

  // DELETE - Excluir despesa
  excluirDespesa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // GET - Listar categorias distintas
  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  // GET - Calcular total de despesas (para dashboard)
  getTotalDespesas(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total`);
  }

  // GET - Buscar despesas por categoria
  getDespesasPorCategoria(categoria: string): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(`${this.apiUrl}/categoria/${categoria}`);
  }

  // GET - Buscar despesas por período
  getDespesasPorPeriodo(inicio: string, fim: string): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(`${this.apiUrl}/periodo?inicio=${inicio}&fim=${fim}`);
  }
}