import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Compra } from '../models/compra';
import { CreateCompraDTO, criarCreateCompraDTO } from '../models/item-compra';
import { ModalService } from './modal.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = `${environment.apiUrl}/api/estoque`;

  constructor(
    private http: HttpClient,
    private modalService: ModalService
  ) {}

  // ✅ Método auxiliar para obter headers com token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('multivendas_token');
    
    if (!token) {
      console.warn('⚠️ [COMPRA-SERVICE] Token não encontrado no localStorage');
      this.modalService.mostrarErro('Sessão expirada. Faça login novamente.');
      setTimeout(() => window.location.href = '/login', 2000);
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅✅✅ NOVO: MÉTODO PARA ATUALIZAR COMPRA (v46.6)
  atualizarCompra(id: number, compraData: any): Observable<Compra> {
    console.log('🔄 [COMPRA-SERVICE-v46.6] Atualizando compra ID:', id);
    console.log('🔄 [COMPRA-SERVICE] Dados recebidos:', compraData);
    
    const dadosFormatados = {
      idPedidoCompra: compraData.idPedidoCompra,
      fornecedor: compraData.fornecedor,
      data: this.formatarDataParaBackend(compraData.data),
      observacoes: compraData.observacoes || '',
      itens: compraData.itens.map((item: any) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario
      }))
    };
    
    console.log('📤 [COMPRA-SERVICE-v46.6] Dados para PUT:', dadosFormatados);
    
    return this.http.put<Compra>(`${this.apiUrl}/compra/${id}`, dadosFormatados, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [COMPRA-SERVICE-v46.6] Compra atualizada com sucesso:', response);
      }),
      catchError(error => this.handleCompraError(error, compraData.idPedidoCompra))
    );
  }

  // ✅✅✅ NOVO: MÉTODO PARA CRIAR COMPRA (v46.6)
  criarCompra(compraData: any): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE-v46.6] Criando compra com dados:', compraData);
    
    const dadosFormatados = {
      idPedidoCompra: compraData.idPedidoCompra,
      fornecedor: compraData.fornecedor,
      data: this.formatarDataParaBackend(compraData.data),
      observacoes: compraData.observacoes || '',
      itens: compraData.itens.map((item: any) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario
      }))
    };
    
    console.log('📤 [COMPRA-SERVICE-v46.6] Dados formatados para backend:', dadosFormatados);
    
    return this.http.post<Compra>(`${this.apiUrl}/compra`, dadosFormatados, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [COMPRA-SERVICE-v46.6] Compra criada com sucesso:', response);
      }),
      catchError(error => this.handleCompraError(error, compraData.idPedidoCompra))
    );
  }

  // ✅✅✅ MÉTODO PARA FORMATAR DATA EM UTC (v46.6)
  private formatarDataParaBackend(dataString: string): string {
    console.log('🔄 [COMPRA-SERVICE-v46.6] Formatando data:', dataString);
    
    if (!dataString || dataString.trim() === '') {
      const hojeUTC = new Date().toISOString().split('T')[0];
      return `${hojeUTC}T00:00:00Z`;
    }
    
    try {
      let dataLimpa = dataString.split('T')[0];
      const resultado = `${dataLimpa}T00:00:00Z`;
      console.log('✅ [COMPRA-SERVICE-v46.6] Data formatada em UTC:', resultado);
      return resultado;
    } catch (e) {
      console.warn('❌ [COMPRA-SERVICE-v46.6] Erro ao formatar data:', e);
      const hojeUTC = new Date().toISOString().split('T')[0];
      return `${hojeUTC}T00:00:00Z`;
    }
  }

  // ✅✅✅ MÉTODO PÚBLICO PARA FORMATAR DATA PARA EXIBIÇÃO (v46.6)
  formatarDataParaExibicao(dataUTC: string | Date | undefined): string {
    console.log('📅 [COMPRA-SERVICE-v46.6] Formatando data para exibição:', dataUTC);
    
    if (!dataUTC) return 'Data não informada';
    
    try {
      let dataString = typeof dataUTC === 'string' ? dataUTC : dataUTC.toISOString();
      
      if (typeof dataUTC === 'string' && !dataUTC.endsWith('Z') && 
          !dataUTC.includes('+') && !dataUTC.includes('-')) {
        dataString += 'Z';
      }
      
      const data = new Date(dataString);
      
      if (isNaN(data.getTime())) {
        return String(dataUTC).split('T')[0];
      }
      
      return data.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('❌ [COMPRA-SERVICE-v46.6] Erro ao formatar data:', error);
      return String(dataUTC).split('T')[0] || 'Data inválida';
    }
  }

  // ========== MÉTODOS EXISTENTES (MANTIDOS) ==========

  getCompras(): Observable<any[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras (endpoint legacy)...');
    
    return this.http.get<any[]>(`${this.apiUrl}/entradas`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(compras => {
        console.log('📊 [DEBUG-ENTRADAS] Total entradas recebidas:', compras.length);
      }),
      catchError(error => this.handleError(error, 'Erro ao carregar compras'))
    );
  }

  getCompraById(id: number): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compra por ID:', id);
    return this.http.get<Compra>(`${this.apiUrl}/entrada/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleError(error, 'Erro ao buscar compra'))
    );
  }

  // ✅ LEGACY: Criar compra de UM produto
  criarCompraProduto(compra: Compra): Observable<any> {
    console.log('🔍 [COMPRA-SERVICE] Criando compra de UM produto (legacy):', compra);
    
    const compraParaBackend = this.converterParaFormatoLegacy(compra);
    
    return this.http.post<any>(`${this.apiUrl}/entrada`, compraParaBackend, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  // ✅ LEGACY: Atualizar compra de UM produto (renomeado para evitar conflito)
  atualizarCompraLegacy(id: number, compra: Compra): Observable<any> {
    console.log('🔍 [COMPRA-SERVICE] Atualizando compra ID:', id, '(legacy)');
    
    const compraParaBackend = this.converterParaFormatoLegacy(compra);
    
    return this.http.put<any>(`${this.apiUrl}/entrada/${id}`, compraParaBackend, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  excluirCompra(id: number): Observable<void> {
    console.log('🔍 [COMPRA-SERVICE] Excluindo compra ID:', id);
    return this.http.delete<void>(`${this.apiUrl}/entrada/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleError(error, 'Erro ao excluir compra'))
    );
  }

  getComprasMultiplos(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras (múltiplos produtos)...');
    
    return this.http.get<Compra[]>(`${this.apiUrl}/compras`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(compras => {
        console.log('📊 [DEBUG-COMPRAS-MULTIPLOS] Total recebido:', compras.length);
      }),
      catchError(error => {
        console.error('❌ [COMPRA-SERVICE] Erro no endpoint /compras:', error);
        
        if (error.status === 401) {
          this.verificarAutenticacao();
          return throwError(() => error);
        }
        
        return this.handleError(error, 'Erro ao carregar compras (múltiplos)');
      })
    );
  }

  getComprasUnificadas(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras UNIFICADAS...');
    
    return this.http.get<Compra[]>(`${this.apiUrl}/compras-unificadas`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(compras => {
        console.log('📊 [DEBUG-COMPRAS-UNIFICADAS] Total recebido:', compras.length);
      }),
      catchError(error => {
        console.error('❌ [COMPRA-SERVICE] Erro no endpoint /compras-unificadas:', error);
        
        if (error.status === 401) {
          this.verificarAutenticacao();
          return throwError(() => error);
        }
        
        return this.getComprasMultiplos();
      })
    );
  }

  // ✅ LEGACY: Atualizar compra múltipla (mantido para compatibilidade)
  atualizarCompraMultiplos(id: number, compra: Compra): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE] Atualizando compra múltipla ID:', id);
    
    const compraDTO = this.prepararCompraParaBackend(compra);
    
    return this.http.put<Compra>(`${this.apiUrl}/compra/${id}`, compraDTO, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  excluirCompraMultipla(id: number): Observable<void> {
    console.log('🔍 [COMPRA-SERVICE] Excluindo compra múltipla ID:', id);
    return this.http.delete<void>(`${this.apiUrl}/compra/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleError(error, 'Erro ao excluir compra'))
    );
  }

  // MÉTODOS AUXILIARES

  private verificarAutenticacao(): void {
    const token = localStorage.getItem('multivendas_token');
    const user = localStorage.getItem('multivendas_user');
    
    if (!token || !user) {
      this.modalService.mostrarErro('Sessão expirada. Redirecionando para login...');
      
      localStorage.removeItem('multivendas_token');
      localStorage.removeItem('multivendas_user');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }

  getCategorias(): string[] {
    return ['Produto', 'Material de Escritório', 'Embalagem', 'Outros'];
  }

  getProdutos(): Observable<any[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando produtos');
    return this.http.get<any[]>(`${environment.apiUrl}/api/produtos`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleError(error, 'Erro ao carregar produtos'))
    );
  }

  private prepararCompraParaBackend(compra: Compra): CreateCompraDTO {
    console.log('🔄 [COMPRA-SERVICE] Preparando compra para backend...');
    
    const dataParaFormatar = compra.dataEntrada || compra.data || '';
    const dataFormatada = this.formatarDataParaBackend(dataParaFormatar);
    
    return criarCreateCompraDTO(
      compra.idPedidoCompra,
      compra.fornecedor,
      compra.categoria || 'Produto',
      compra.itens,
      compra.observacoes || '',
      dataFormatada
    );
  }

  private converterParaFormatoLegacy(compra: Compra): any {
    console.log('🔄 [COMPRA-SERVICE] Convertendo para formato legacy...');
    
    if (compra.itens && compra.itens.length > 0) {
      const primeiroItem = compra.itens[0];
      
      const custoTotal = primeiroItem.custoTotal || 
                        (primeiroItem.custoUnitario * primeiroItem.quantidade);
      
      return {
        produtoId: primeiroItem.produtoId,
        quantidade: primeiroItem.quantidade,
        custoTotal: custoTotal,
        fornecedor: compra.fornecedor || '',
        idPedidoCompra: compra.idPedidoCompra,
        categoria: compra.categoria || 'Produto',
        observacoes: compra.observacoes || '',
        dataEntrada: this.formatarDataParaBackend(compra.dataEntrada)
      };
    }
    
    console.warn('⚠️ [COMPRA-SERVICE] Compra sem itens sendo convertida para legacy');
    return {
      produtoId: 0,
      quantidade: 0,
      custoTotal: 0,
      fornecedor: compra.fornecedor || '',
      idPedidoCompra: compra.idPedidoCompra,
      categoria: compra.categoria || 'Produto',
      observacoes: compra.observacoes || '',
      dataEntrada: this.formatarDataParaBackend(compra.dataEntrada)
    };
  }

  private handleCompraError(error: HttpErrorResponse, idPedidoCompra: string): Observable<never> {
    console.error('❌ [COMPRA-SERVICE] Erro na compra:', error);

    if (this.isIdDuplicadoError(error)) {
      // ✅✅✅ CORREÇÃO: Usando mostrarErroIdDuplicadoCompra() em vez de mostrarErroIdDuplicado()
      this.modalService.mostrarErroIdDuplicadoCompra(idPedidoCompra);
    } else if (this.isLoteConsumidoError(error)) {
      this.modalService.mostrarAlertaPeps(
        error.error?.saldoAtual || 0,
        error.error?.quantidadeOriginal || 0
      );
    } else if (error.status === 401) {
      this.verificarAutenticacao();
    } else {
      const mensagemAmigavel = this.getMensagemAmigavel(error);
      this.modalService.mostrarErroCompra(mensagemAmigavel);
    }

    return throwError(() => error);
  }

  private handleError(error: HttpErrorResponse, contexto: string): Observable<never> {
    console.error(`❌ [COMPRA-SERVICE] ${contexto}:`, error);
    
    if (error.status === 401) {
      this.verificarAutenticacao();
    }
    
    const mensagemAmigavel = this.getMensagemAmigavel(error);
    this.modalService.mostrarErro(`${contexto}: ${mensagemAmigavel}`);
    
    return throwError(() => error);
  }

  private isIdDuplicadoError(error: HttpErrorResponse): boolean {
    const errorMessage = this.extrairMensagemErro(error);
    
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
    ) || error.status === 400;
  }

  private isLoteConsumidoError(error: HttpErrorResponse): boolean {
    const errorMessage = this.extrairMensagemErro(error);
    
    return errorMessage.includes('parcialmente consumido') ||
           errorMessage.includes('lote já foi') ||
           errorMessage.includes('saldo atual');
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string') {
      return error.error;
    } else if (error.error?.message) {
      return error.error.message;
    } else if (error.error?.error) {
      return error.error.error;
    } else if (error.message) {
      return error.message;
    } else {
      return 'Erro desconhecido';
    }
  }

  private getMensagemAmigavel(error: HttpErrorResponse): string {
    const errorMessage = this.extrairMensagemErro(error);

    if (errorMessage.includes('localhost:8080') || errorMessage.includes('Http failure')) {
      return 'Erro de comunicação com o servidor. Tente novamente.';
    }

    if (errorMessage.includes('Produto não encontrado')) {
      return 'Produto não encontrado. Verifique se o produto ainda existe.';
    }

    if (errorMessage.includes('não pertence ao usuário')) {
      return 'Acesso negado. Este item não pertence ao seu usuário.';
    }

    if (error.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }

    if (errorMessage.length > 100) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    return errorMessage || 'Erro desconhecido';
  }
}