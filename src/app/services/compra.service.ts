import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Compra } from '../models/compra';
import { ModalService } from './modal.service';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = `${environment.apiUrl}/api/estoque`;

  constructor(
    private http: HttpClient,
    private modalService: ModalService
  ) {}

  // ✅ CORREÇÃO: Buscar todas as compras - SEM verificação manual de token
  getCompras(): Observable<any[]> {
    console.log('🔍 DEBUG SERVICE - Fazendo requisição GET para:', `${this.apiUrl}/entradas`);
    
    return this.http.get<any[]>(`${this.apiUrl}/entradas`).pipe(
      catchError(error => this.handleError(error, 'Erro ao carregar compras'))
    );
  }

  getCompraById(id: number): Observable<Compra> {
    console.log('🔍 DEBUG SERVICE - Buscando compra por ID:', id);
    return this.http.get<Compra>(`${this.apiUrl}/entrada/${id}`).pipe(
      catchError(error => this.handleError(error, 'Erro ao buscar compra'))
    );
  }

  criarCompraProduto(compra: Compra): Observable<any> {
    console.log('🔍 DEBUG SERVICE - Criando compra de produto:', compra);
    
    // ✅ CORREÇÃO: Usar produtoId em vez de produto.id
    if (!compra.produtoId) {
      this.modalService.mostrarErro('ID do produto não definido');
      return throwError(() => new Error('ID do produto não definido'));
    }

    if (!compra.idPedidoCompra || !compra.categoria) {
      this.modalService.mostrarErro('ID do Pedido e Categoria são obrigatórios');
      return throwError(() => new Error('ID do Pedido e Categoria são obrigatórios'));
    }
    
    // ✅ CORREÇÃO: Converter data para formato ISO (LocalDateTime do Java) SEM timezone
    const dataEntradaFormatada = this.formatarDataParaBackend(compra.dataEntrada);
    console.log('📅 DEBUG SERVICE - Data formatada para backend:', dataEntradaFormatada);
    
    const params = new HttpParams()
      .set('produtoId', compra.produtoId.toString())
      .set('quantidade', compra.quantidade.toString())
      .set('custoTotal', compra.custoTotal.toString())
      .set('fornecedor', compra.fornecedor || '')
      .set('idPedidoCompra', compra.idPedidoCompra)
      .set('categoria', compra.categoria)
      .set('observacoes', compra.observacoes || '')
      .set('dataEntrada', dataEntradaFormatada); // ✅ NOVO: enviar dataEntrada

    console.log('🔍 DEBUG SERVICE - Parâmetros enviados:', params.toString());

    return this.http.post<any>(`${this.apiUrl}/entrada`, null, { params }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  atualizarCompra(id: number, compra: Compra): Observable<any> {
    console.log('🔍 DEBUG SERVICE - Atualizando compra ID:', id, compra);
    
    // ✅ CORREÇÃO: Usar produtoId em vez de produto.id
    if (!compra.produtoId) {
      this.modalService.mostrarErro('ID do produto não definido');
      return throwError(() => new Error('ID do produto não definido'));
    }

    if (!compra.idPedidoCompra || !compra.categoria) {
      this.modalService.mostrarErro('ID do Pedido e Categoria são obrigatórios');
      return throwError(() => new Error('ID do Pedido e Categoria são obrigatórios'));
    }
    
    // ✅ CORREÇÃO: Converter data para formato ISO (LocalDateTime do Java) SEM timezone
    const dataEntradaFormatada = this.formatarDataParaBackend(compra.dataEntrada);
    console.log('📅 DEBUG SERVICE - Data formatada para backend:', dataEntradaFormatada);
    
    const params = new HttpParams()
      .set('produtoId', compra.produtoId.toString())
      .set('quantidade', compra.quantidade.toString())
      .set('custoTotal', compra.custoTotal.toString())
      .set('fornecedor', compra.fornecedor || '')
      .set('idPedidoCompra', compra.idPedidoCompra)
      .set('categoria', compra.categoria)
      .set('observacoes', compra.observacoes || '')
      .set('dataEntrada', dataEntradaFormatada); // ✅ NOVO: enviar dataEntrada

    console.log('🔍 DEBUG SERVICE - Parâmetros para atualização:', params.toString());

    return this.http.put<any>(`${this.apiUrl}/entrada/${id}`, null, { params }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  excluirCompra(id: number): Observable<void> {
    console.log('🔍 DEBUG SERVICE - Excluindo compra ID:', id);
    return this.http.delete<void>(`${this.apiUrl}/entrada/${id}`).pipe(
      catchError(error => this.handleError(error, 'Erro ao excluir compra'))
    );
  }

  getCategorias(): string[] {
    return ['Produto', 'Material de Escritório', 'Embalagem', 'Outros'];
  }

  getProdutos(): Observable<any[]> {
    console.log('🔍 DEBUG SERVICE - Buscando produtos');
    return this.http.get<any[]>(`${environment.apiUrl}/api/produtos`).pipe(
      catchError(error => this.handleError(error, 'Erro ao carregar produtos'))
    );
  }

  // ✅ CORREÇÃO CRÍTICA: Formatar data para o backend SEM problema de timezone
  private formatarDataParaBackend(dataString: string): string {
    if (!dataString) {
      // Usar data atual no formato correto
      const hoje = new Date().toISOString().split('T')[0];
      return `${hoje}T00:00:00`;
    }
    
    try {
      // ✅ SOLUÇÃO SIMPLES: Usar a data diretamente do input + "T00:00:00"
      // Input date envia "YYYY-MM-DD" (ex: "2025-11-18")
      // Output: "YYYY-MM-DDT00:00:00" (ex: "2025-11-18T00:00:00")
      // Isso evita completamente problemas de timezone
      return `${dataString}T00:00:00`;
    } catch (e) {
      console.warn('Erro ao formatar data, usando data atual:', e);
      const hoje = new Date().toISOString().split('T')[0];
      return `${hoje}T00:00:00`;
    }
  }

  // ✅ NOVO MÉTODO: Tratamento específico para erros de compra
  private handleCompraError(error: HttpErrorResponse, idPedidoCompra: string): Observable<never> {
    console.error('❌ Erro na compra:', error);

    // ✅ DETECTAR ERRO DE ID DUPLICADO
    if (this.isIdDuplicadoError(error)) {
      this.modalService.mostrarErroIdDuplicado(idPedidoCompra);
    } 
    // ✅ DETECTAR ERRO DE LOTE PARCIALMENTE CONSUMIDO
    else if (this.isLoteConsumidoError(error)) {
      this.modalService.mostrarAlertaPeps(
        error.error?.saldoAtual || 0,
        error.error?.quantidadeOriginal || 0
      );
    }
    // ✅ ERRO GENÉRICO
    else {
      const mensagemAmigavel = this.getMensagemAmigavel(error);
      this.modalService.mostrarErroCompra(mensagemAmigavel);
    }

    return throwError(() => error);
  }

  // ✅ NOVO MÉTODO: Tratamento genérico de erro
  private handleError(error: HttpErrorResponse, contexto: string): Observable<never> {
    console.error(`❌ ${contexto}:`, error);
    
    const mensagemAmigavel = this.getMensagemAmigavel(error);
    this.modalService.mostrarErro(`${contexto}: ${mensagemAmigavel}`);
    
    return throwError(() => error);
  }

  // ✅ NOVO MÉTODO: Detectar erro de ID duplicado
  private isIdDuplicadoError(error: HttpErrorResponse): boolean {
    const errorMessage = error.error?.message || error.error || error.message || '';
    
    const indicadoresIdDuplicado = [
      'Já existe uma compra cadastrada com este ID do Pedido',
      'já existe uma compra',
      'ID do Pedido já existe',
      'id_pedido_compra',
      'unique constraint',
      'duplicate key'
    ];

    return indicadoresIdDuplicado.some(indicador => 
      errorMessage.toLowerCase().includes(indicador.toLowerCase())
    ) || error.status === 400; // Bad Request com mensagem específica
  }

  // ✅ NOVO MÉTODO: Detectar erro de lote consumido
  private isLoteConsumidoError(error: HttpErrorResponse): boolean {
    const errorMessage = error.error?.message || error.error || error.message || '';
    
    return errorMessage.includes('parcialmente consumido') ||
           errorMessage.includes('lote já foi') ||
           errorMessage.includes('saldo atual');
  }

  // ✅ NOVO MÉTODO: Converter erro técnico em mensagem amigável
  private getMensagemAmigavel(error: HttpErrorResponse): string {
    const errorMessage = error.error?.message || error.error || error.message || '';

    // Remover detalhes técnicos da URL
    if (errorMessage.includes('localhost:8080') || errorMessage.includes('Http failure')) {
      return 'Erro de comunicação com o servidor. Tente novamente.';
    }

    // Mensagens específicas do backend
    if (errorMessage.includes('Produto não encontrado')) {
      return 'Produto não encontrado. Verifique se o produto ainda existe.';
    }

    if (errorMessage.includes('não pertence ao usuário')) {
      return 'Acesso negado. Este item não pertence ao seu usuário.';
    }

    // Mensagem genérica para outros casos
    if (errorMessage.length > 100) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    return errorMessage || 'Erro desconhecido';
  }
}