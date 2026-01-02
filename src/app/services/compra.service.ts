import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
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
      // Redirecionar para login
      setTimeout(() => window.location.href = '/login', 2000);
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ MÉTODOS LEGACY (mantidos para compatibilidade - 1 produto)
  
  // Buscar todas as compras (formato antigo - 1 produto)
  getCompras(): Observable<any[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras (endpoint legacy)...');
    
    return this.http.get<any[]>(`${this.apiUrl}/entradas`, { 
      headers: this.getHeaders() 
    }).pipe(
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
    
    // Converter para o formato antigo se necessário
    const compraParaBackend = this.converterParaFormatoLegacy(compra);
    
    return this.http.post<any>(`${this.apiUrl}/entrada`, compraParaBackend, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  // ✅ LEGACY: Atualizar compra de UM produto
  atualizarCompra(id: number, compra: Compra): Observable<any> {
    console.log('🔍 [COMPRA-SERVICE] Atualizando compra ID:', id, '(legacy)');
    
    // Converter para o formato antigo se necessário
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

  // ✅ NOVOS MÉTODOS PARA MÚLTIPLOS PRODUTOS

  // Buscar compras com múltiplos produtos
  getComprasMultiplos(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras (múltiplos produtos)...');
    
    return this.http.get<Compra[]>(`${this.apiUrl}/compras`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => {
        console.error('❌ [COMPRA-SERVICE] Erro no endpoint /compras:', error);
        
        // Se for erro 401, verificar autenticação
        if (error.status === 401) {
          this.verificarAutenticacao();
          return throwError(() => error);
        }
        
        return this.handleError(error, 'Erro ao carregar compras (múltiplos)');
      })
    );
  }

  // ✅ NOVO: Criar compra com múltiplos produtos
  criarCompra(compra: Compra): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE] Criando compra com MÚLTIPLOS produtos...');
    console.log('📤 [COMPRA-SERVICE] Compra recebida:', compra);
    
    if (compra.itens.length === 0) {
      this.modalService.mostrarErro('Adicione pelo menos um produto à compra');
      return throwError(() => new Error('Nenhum item na compra'));
    }
    
    // Preparar DTO para o backend
    const compraDTO = this.prepararCompraParaBackend(compra);
    
    console.log('📤 [COMPRA-SERVICE] DTO preparado:', compraDTO);
    console.log('📤 [COMPRA-SERVICE] JSON:', JSON.stringify(compraDTO, null, 2));
    
    return this.http.post<Compra>(`${this.apiUrl}/compra`, compraDTO, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  // ✅ NOVO: Atualizar compra com múltiplos produtos
  atualizarCompraMultiplos(id: number, compra: Compra): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE] Atualizando compra com múltiplos produtos ID:', id);
    
    if (compra.itens.length === 0) {
      this.modalService.mostrarErro('A compra deve ter pelo menos um produto');
      return throwError(() => new Error('Nenhum item na compra'));
    }
    
    // Preparar DTO para o backend
    const compraDTO = this.prepararCompraParaBackend(compra);
    
    return this.http.put<Compra>(`${this.apiUrl}/compra/${id}`, compraDTO, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleCompraError(error, compra.idPedidoCompra))
    );
  }

  // MÉTODOS AUXILIARES

  // ✅ Verificar autenticação
  private verificarAutenticacao(): void {
    const token = localStorage.getItem('multivendas_token');
    const user = localStorage.getItem('multivendas_user');
    
    console.log('🔐 [COMPRA-SERVICE] Verificando autenticação...');
    console.log('🔐 Token existe:', !!token);
    console.log('🔐 User existe:', !!user);
    
    if (!token || !user) {
      console.warn('⚠️ [COMPRA-SERVICE] Usuário não autenticado');
      this.modalService.mostrarErro('Sessão expirada. Redirecionando para login...');
      
      // Limpar localStorage
      localStorage.removeItem('multivendas_token');
      localStorage.removeItem('multivendas_user');
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      console.log('✅ [COMPRA-SERVICE] Usuário autenticado');
      this.modalService.mostrarErro('Token expirado ou inválido. Faça login novamente.');
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

  // ✅ NOVO: Converter compra para CreateCompraDTO
  private prepararCompraParaBackend(compra: Compra): CreateCompraDTO {
    console.log('🔄 [COMPRA-SERVICE] Preparando compra para backend...');
    
    // Usar a função auxiliar do item-compra.ts
    const compraDTO = criarCreateCompraDTO(
      compra.idPedidoCompra,
      compra.fornecedor,
      compra.categoria,
      compra.itens,
      compra.observacoes,
      this.formatarDataParaBackend(compra.dataEntrada)
    );
    
    console.log('📤 [COMPRA-SERVICE] Itens preparados:', compraDTO.itens.length, 'itens');
    
    if (compraDTO.itens.length > 0) {
      console.log('📤 [COMPRA-SERVICE] Primeiro item:', compraDTO.itens[0]);
    }
    
    return compraDTO;
  }

  // ✅ Converter nova compra (múltiplos) para formato legacy (1 produto)
  private converterParaFormatoLegacy(compra: Compra): any {
    console.log('🔄 [COMPRA-SERVICE] Convertendo para formato legacy...');
    
    // Se já tem itens, pegar o primeiro
    if (compra.itens && compra.itens.length > 0) {
      const primeiroItem = compra.itens[0];
      
      // Calcular custoTotal se não existir
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
    
    // Se não tem itens, retornar objeto vazio (não deve acontecer)
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

  // ✅ Formatar data para o backend
  private formatarDataParaBackend(dataString: string): string {
    if (!dataString) {
      const hoje = new Date().toISOString().split('T')[0];
      return `${hoje}T00:00:00`;
    }
    
    try {
      // Input date envia "YYYY-MM-DD"
      // Output: "YYYY-MM-DDT00:00:00"
      return `${dataString}T00:00:00`;
    } catch (e) {
      console.warn('Erro ao formatar data:', e);
      const hoje = new Date().toISOString().split('T')[0];
      return `${hoje}T00:00:00`;
    }
  }

  // ✅ Tratamento específico para erros de compra
  private handleCompraError(error: HttpErrorResponse, idPedidoCompra: string): Observable<never> {
    console.error('❌ [COMPRA-SERVICE] Erro na compra:', error);

    if (this.isIdDuplicadoError(error)) {
      this.modalService.mostrarErroIdDuplicado(idPedidoCompra);
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

  // ✅ CORREÇÃO: Tratamento genérico de erro
  private handleError(error: HttpErrorResponse, contexto: string): Observable<never> {
    console.error(`❌ [COMPRA-SERVICE] ${contexto}:`, error);
    
    // Se for erro 401, verificar autenticação
    if (error.status === 401) {
      this.verificarAutenticacao();
    }
    
    const mensagemAmigavel = this.getMensagemAmigavel(error);
    this.modalService.mostrarErro(`${contexto}: ${mensagemAmigavel}`);
    
    return throwError(() => error);
  }

  // ✅ Detectar erro de ID duplicado
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

  // ✅ Detectar erro de lote consumido
  private isLoteConsumidoError(error: HttpErrorResponse): boolean {
    const errorMessage = this.extrairMensagemErro(error);
    
    return errorMessage.includes('parcialmente consumido') ||
           errorMessage.includes('lote já foi') ||
           errorMessage.includes('saldo atual');
  }

  // ✅ CORREÇÃO CRÍTICA: Extrair mensagem de erro de forma segura
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

  // ✅ CORREÇÃO: Converter erro técnico em mensagem amigável
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

    // Mensagem genérica para outros casos
    if (errorMessage.length > 100) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    return errorMessage || 'Erro desconhecido';
  }
}