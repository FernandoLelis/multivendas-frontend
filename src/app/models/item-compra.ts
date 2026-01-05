// item-compra.ts - ATUALIZADO COM CAMPO DATA

export interface ItemCompra {
  id?: number;
  produtoId: number;
  produtoNome?: string;
  produtoSku?: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal?: number;
  saldo?: number;
}

// ✅✅✅ INTERFACE PARA CRIAR COMPRA DTO (ATUALIZADA COM DATA)
export interface CreateCompraDTO {
  idPedidoCompra: string;
  fornecedor: string;
  categoria: string;
  itens: CreateItemCompraDTO[];
  observacoes?: string;
  data?: string; // ✅ ADICIONADO CAMPO DATA
}

export interface CreateItemCompraDTO {
  produtoId: number;
  quantidade: number;
  custoUnitario: number;
}

// Função auxiliar para criar CreateCompraDTO
export function criarCreateCompraDTO(
  idPedidoCompra: string,
  fornecedor: string,
  categoria: string,
  itens: ItemCompra[],
  observacoes: string = '',
  data: string = '' // ✅ ADICIONADO PARÂMETRO DATA
): CreateCompraDTO {
  return {
    idPedidoCompra,
    fornecedor,
    categoria,
    observacoes,
    data, // ✅ INCLUÍDO NO DTO
    itens: itens.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      custoUnitario: item.custoUnitario
    }))
  };
}

// Função para calcular custo total dos itens
export function calcularCustoTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => {
    return total + (item.custoTotal || item.custoUnitario * item.quantidade);
  }, 0);
}

// Função para calcular quantidade total dos itens
export function calcularQuantidadeTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}

// Função para criar item de compra vazio
export function criarItemCompraVazio(): ItemCompra {
  return {
    produtoId: 0,
    produtoNome: '',
    produtoSku: '',
    quantidade: 1,
    custoUnitario: 0,
    custoTotal: 0
  };
}

// Função para validar item de compra
export function validarItemCompra(item: ItemCompra): string[] {
  const erros: string[] = [];
  
  if (!item.produtoId || item.produtoId <= 0) {
    erros.push('Produto é obrigatório');
  }
  
  if (!item.quantidade || item.quantidade <= 0) {
    erros.push('Quantidade deve ser maior que zero');
  }
  
  if (!item.custoUnitario || item.custoUnitario < 0) {
    erros.push('Custo unitário é obrigatório');
  }
  
  return erros;
}