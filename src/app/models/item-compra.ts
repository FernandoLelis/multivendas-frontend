// item-compra.ts - ATUALIZADO COM CAMPO imagemUrl

export interface ItemCompra {
  id?: number;
  produtoId: number;
  produtoNome?: string;
  produtoSku?: string;
  imagemUrl?: string;      // ✅ NOVO: URL da imagem do produto
  quantidade: number;
  custoUnitario: number;
  custoTotal?: number;
  saldo?: number;
}

export interface CreateCompraDTO {
  idPedidoCompra: string;
  fornecedor: string;
  categoria: string;
  itens: CreateItemCompraDTO[];
  observacoes?: string;
  data?: string;
}

export interface CreateItemCompraDTO {
  produtoId: number;
  quantidade: number;
  custoUnitario: number;
}

export function criarCreateCompraDTO(
  idPedidoCompra: string,
  fornecedor: string,
  categoria: string,
  itens: ItemCompra[],
  observacoes: string = '',
  data: string = ''
): CreateCompraDTO {
  return {
    idPedidoCompra,
    fornecedor,
    categoria,
    observacoes,
    data,
    itens: itens.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      custoUnitario: item.custoUnitario
    }))
  };
}

export function calcularCustoTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => {
    return total + (item.custoTotal || item.custoUnitario * item.quantidade);
  }, 0);
}

export function calcularQuantidadeTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}

export function criarItemCompraVazio(): ItemCompra {
  return {
    produtoId: 0,
    produtoNome: '',
    produtoSku: '',
    imagemUrl: '',
    quantidade: 1,
    custoUnitario: 0,
    custoTotal: 0
  };
}

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