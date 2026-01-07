import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, tap, forkJoin } from 'rxjs';
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

  // ✅ MÉTODOS LEGACY (mantidos para compatibilidade - 1 produto)
  
  // Buscar todas as compras (formato antigo - 1 produto)
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

  // ✅ LEGACY: Atualizar compra de UM produto
  atualizarCompra(id: number, compra: Compra): Observable<any> {
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

  // ✅ NOVOS MÉTODOS PARA MÚLTIPLOS PRODUTOS

  // Buscar compras com múltiplos produtos
  getComprasMultiplos(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras (múltiplos produtos)...');
    
    return this.http.get<Compra[]>(`${this.apiUrl}/compras`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(compras => {
        console.log('📊 [DEBUG-COMPRAS-MULTIPLOS] Total recebido:', compras.length);
        if (compras.length > 0) {
          console.log('📊 [DEBUG] Primeira compra (multiplos):', {
            id: compras[0].id,
            idPedidoCompra: compras[0].idPedidoCompra,
            data: compras[0].data,
            dataEntrada: compras[0].dataEntrada,
            itens: compras[0].itens?.length
          });
        }
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

  // ✅ NOVO: Buscar TODAS as compras (unificadas - sistema novo + antigo) COM DEBUG
  getComprasUnificadas(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras UNIFICADAS...');
    
    return this.http.get<Compra[]>(`${this.apiUrl}/compras-unificadas`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(compras => {
        console.log('📊 [DEBUG-COMPRAS-UNIFICADAS] Total recebido:', compras.length);
        if (compras.length > 0) {
          console.log('📊 [DEBUG] Primeira compra (unificada):', {
            id: compras[0].id,
            idPedidoCompra: compras[0].idPedidoCompra,
            sistemaAntigo: compras[0].sistemaAntigo,
            data: compras[0].data,
            dataEntrada: compras[0].dataEntrada,
            itens: compras[0].itens?.length
          });
          
          // Contar tipos de compras
          const comprasNovas = compras.filter(c => !c.sistemaAntigo).length;
          const comprasAntigas = compras.filter(c => c.sistemaAntigo).length;
          console.log(`📊 [DEBUG] Estatísticas: ${comprasNovas} novas, ${comprasAntigas} antigas`);
        }
      }),
      catchError(error => {
        console.error('❌ [COMPRA-SERVICE] Erro no endpoint /compras-unificadas:', error);
        
        if (error.status === 401) {
          this.verificarAutenticacao();
          return throwError(() => error);
        }
        
        // ✅ IMPORTANTE: Se falhar, tentar endpoint padrão como fallback
        console.warn('⚠️ Endpoint unificado falhou, tentando endpoint padrão...');
        return this.getComprasMultiplos();
      })
    );
  }

  // ✅ NOVO: Buscar TODAS as compras com fallback automático
  getComprasComFallback(): Observable<Compra[]> {
    console.log('🔍 [COMPRA-SERVICE] Buscando compras com fallback automático...');
    
    return this.getComprasUnificadas().pipe(
      catchError(() => {
        // Se unificado falhar, tenta múltiplos
        return this.getComprasMultiplos().pipe(
          catchError(() => {
            // Se múltiplos falhar, tenta legacy como último recurso
            console.warn('⚠️ Todos endpoints falharam, tentando legacy como último recurso...');
            return this.getCompras().pipe(
              tap(entradas => {
                console.log('📊 [FALLBACK-LEGACY] Entradas recebidas:', entradas.length);
              })
            );
          })
        );
      })
    );
  }

  // ✅ NOVO: Criar compra com múltiplos produtos COM DEBUG DE DATA DETALHADO
  criarCompra(compra: Compra): Observable<Compra> {
    console.log('🔍 [COMPRA-SERVICE] Criando compra com MÚLTIPLOS produtos...');
    console.log('📤 [COMPRA-SERVICE] Compra recebida do componente:', JSON.stringify(compra, null, 2));
    
    // ✅ DEBUG DETALHADO DE DATA
    console.log('📅 [DEBUG-DATA-INICIAL] Campos data disponíveis na compra:', {
      dataEntrada: compra.dataEntrada,
      data: compra.data,
      dataCompra: (compra as any).dataCompra,
      totalCompra: compra.totalCompra,
      custoTotal: compra.custoTotal
    });
    console.log('📅 [DEBUG-DATA-INICIAL] Tipo de dataEntrada:', typeof compra.dataEntrada);
    console.log('📅 [DEBUG-DATA-INICIAL] Tipo de data:', typeof compra.data);
    
    if (compra.itens.length === 0) {
      this.modalService.mostrarErro('Adicione pelo menos um produto à compra');
      return throwError(() => new Error('Nenhum item na compra'));
    }
    
    // Preparar DTO para o backend
    const compraDTO = this.prepararCompraParaBackend(compra);
    
    console.log('📤 [COMPRA-SERVICE] DTO preparado para backend:', JSON.stringify(compraDTO, null, 2));
    console.log('📅 [DEBUG-DATA-FINAL] Data no DTO:', compraDTO.data);
    console.log('📤 [COMPRA-SERVICE] Enviando para:', `${this.apiUrl}/compra`);
    
    return this.http.post<Compra>(`${this.apiUrl}/compra`, compraDTO, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [DEBUG] Compra criada com sucesso:', response);
        console.log('📅 [DEBUG] Data na resposta:', response.data);
        console.log('📅 [DEBUG] DataEntrada na resposta:', response.dataEntrada);
        console.log('📅 [DEBUG] DataCompra na resposta:', (response as any).dataCompra);
      }),
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

  // ✅ NOVO: Excluir compra múltipla
  excluirCompraMultipla(id: number): Observable<void> {
    console.log('🔍 [COMPRA-SERVICE] Excluindo compra múltipla ID:', id);
    return this.http.delete<void>(`${this.apiUrl}/compra/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => this.handleError(error, 'Erro ao excluir compra'))
    );
  }

  // ✅ NOVO: Método para formatar data recebida do backend (PÚBLICO para uso nos componentes)
  formatarDataParaExibicao(dataUTC: string | Date | undefined): string {
    console.log('📅 [FORMATAR-EXIBICAO] Recebido:', dataUTC);
    
    if (!dataUTC) return 'Data não informada';
    
    try {
      // Converter para string se for Date
      let dataString = typeof dataUTC === 'string' ? dataUTC : dataUTC.toISOString();
      
      console.log('📅 [FORMATAR-EXIBICAO] String para processar:', dataString);
      
      // Se for string sem timezone, adicionar Z para indicar UTC
      if (typeof dataUTC === 'string' && !dataUTC.endsWith('Z') && !dataUTC.includes('+') && !dataUTC.includes('-')) {
        dataString += 'Z';
        console.log('📅 [FORMATAR-EXIBICAO] Adicionado Z:', dataString);
      }
      
      // Converter para data
      const data = new Date(dataString);
      
      console.log('📅 [FORMATAR-EXIBICAO] Date objeto criado:', data);
      console.log('📅 [FORMATAR-EXIBICAO] Timestamp:', data.getTime());
      console.log('📅 [FORMATAR-EXIBICAO] UTC:', data.toUTCString());
      console.log('📅 [FORMATAR-EXIBICAO] Local:', data.toLocaleString());
      
      // Verificar se a data é válida
      if (isNaN(data.getTime())) {
        console.warn('📅 [FORMATAR-EXIBICAO] Data inválida:', dataUTC);
        return String(dataUTC).split('T')[0]; // Retornar apenas YYYY-MM-DD
      }
      
      // Formatar para exibição brasileira
      const dataFormatada = data.toLocaleDateString('pt-BR');
      console.log('📅 [FORMATAR-EXIBICAO] Resultado:', dataFormatada);
      
      return dataFormatada;
    } catch (error) {
      console.error('❌ [FORMATAR-EXIBICAO] Erro:', error, 'Data:', dataUTC);
      return String(dataUTC).split('T')[0] || 'Data inválida';
    }
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
      
      localStorage.removeItem('multivendas_token');
      localStorage.removeItem('multivendas_user');
      
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

  // ✅ NOVO: Converter compra para CreateCompraDTO COM DEBUG DE DATA DETALHADO
  private prepararCompraParaBackend(compra: Compra): CreateCompraDTO {
    console.log('🔄 [COMPRA-SERVICE] Preparando compra para backend...');
    console.log('📅 [DEBUG-PREPARAR] Compra recebida:', {
      idPedidoCompra: compra.idPedidoCompra,
      dataEntrada: compra.dataEntrada,
      data: compra.data,
      dataCompra: (compra as any).dataCompra
    });
    
    // ✅ DEBUG: Verificar qual campo de data usar
    const dataParaFormatar = compra.dataEntrada || compra.data || '';
    console.log('📅 [DEBUG-PREPARAR] Campo escolhido para formatar:', {
      valor: dataParaFormatar,
      tipo: typeof dataParaFormatar,
      vazio: dataParaFormatar === '',
      nulo: dataParaFormatar === null,
      indefinido: dataParaFormatar === undefined
    });
    
    const dataFormatada = this.formatarDataParaBackend(dataParaFormatar);
    console.log('📅 [DEBUG-FORMATACAO] Data entrada original:', compra.dataEntrada);
    console.log('📅 [DEBUG-FORMATACAO] Data (campo alternativo):', compra.data);
    console.log('📅 [DEBUG-FORMATACAO] Data formatada para backend:', dataFormatada);
    console.log('📅 [DEBUG-FORMATACAO] Tamanho da string:', dataFormatada.length);
    
    const compraDTO = criarCreateCompraDTO(
      compra.idPedidoCompra,
      compra.fornecedor,
      compra.categoria || 'Produto',
      compra.itens,
      compra.observacoes || '',
      dataFormatada
    );
    
    console.log('📤 [COMPRA-SERVICE] DTO criado com campos:', Object.keys(compraDTO));
    console.log('📤 [COMPRA-SERVICE] Itens preparados:', compraDTO.itens.length, 'itens');
    
    if (compraDTO.itens.length > 0) {
      console.log('📤 [COMPRA-SERVICE] Primeiro item:', compraDTO.itens[0]);
    }
    
    return compraDTO;
  }

  // ✅ Converter nova compra (múltiplos) para formato legacy (1 produto)
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

  // ✅ CORREÇÃO CRÍTICA: Formatar data para o backend EM UTC
  private formatarDataParaBackend(dataString: string): string {
    console.log('🔄 [FORMATAR-DATA] Input recebido:', {
      valor: dataString,
      tipo: typeof dataString,
      vazio: dataString === '',
      nulo: dataString === null,
      indefinido: dataString === undefined
    });
    
    if (!dataString || dataString.trim() === '') {
      // Usar data atual em UTC
      const hojeUTC = new Date().toISOString().split('T')[0];
      console.log('⚠️ [FORMATAR-DATA] Sem data, usando hoje UTC:', hojeUTC);
      return `${hojeUTC}T00:00:00Z`; // ✅ ENVIAR EM UTC COM 'Z'
    }
    
    try {
      // Garantir que temos apenas a parte da data (YYYY-MM-DD)
      let dataLimpa = dataString.split('T')[0];
      console.log('🔄 [FORMATAR-DATA] Após split T[0]:', dataLimpa);
      
      // Validar formato YYYY-MM-DD
      const regexData = /^\d{4}-\d{2}-\d{2}$/;
      console.log('🔄 [FORMATAR-DATA] Regex test:', regexData.test(dataLimpa), 'para:', dataLimpa);
      
      if (!regexData.test(dataLimpa)) {
        console.warn('❌ [FORMATAR-DATA] Formato inválido, usando data atual:', dataLimpa);
        const hojeUTC = new Date().toISOString().split('T')[0];
        return `${hojeUTC}T00:00:00Z`;
      }
      
      // ✅ SOLUÇÃO: Enviar em UTC com 'Z' no final
      const resultado = `${dataLimpa}T00:00:00Z`;
      console.log('✅ [FORMATAR-DATA] Formatado em UTC:', resultado);
      return resultado;
      
    } catch (e) {
      console.warn('❌ [FORMATAR-DATA] Erro ao formatar data:', e, 'Input:', dataString);
      const hojeUTC = new Date().toISOString().split('T')[0];
      return `${hojeUTC}T00:00:00Z`; // ✅ ENVIAR EM UTC
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

    if (errorMessage.length > 100) {
      return 'Ocorreu um erro inesperado. Tente novamente.';
    }

    return errorMessage || 'Erro desconhecido';
  }
}