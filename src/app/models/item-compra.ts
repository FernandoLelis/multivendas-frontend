// item-compra.ts - Seguindo o padrão de item-venda.ts
import { Produto } from './produto';

// Interface para itens de uma compra (representa um produto específico na compra)
export interface ItemCompra {
  // ✅ ADICIONADO: ID do item (vem do backend após criação)
  id?: number;
  
  // Identificação do produto
  produtoId: number;        // ID do produto comprado (obrigatório para enviar ao backend)
  quantidade: number;       // Quantidade comprada deste produto (obrigatório)
  
  // Informações para exibição (podem vir do backend ou ser preenchidas no frontend)
  produtoNome?: string;     // Nome do produto (para exibição)
  produtoSku?: string;      // SKU do produto (para exibição)
  produto?: Produto;        // Produto completo (opcional, para uso no carrinho)
  
  // Custo da compra
  custoUnitario: number;    // Custo unitário de compra
  custoTotal?: number;      // Custo total = quantidade × custoUnitario (calculado)
  
  // Campos para uso no backend PEPS
  loteId?: number;          // ID do lote criado (rastreamento PEPS)
  saldo?: number;           // Saldo atual do lote (estoque disponível)
}

// Interface para criar item de compra (usada no POST)
export interface CreateItemCompraDTO {
  produtoId: number;
  quantidade: number;
  custoUnitario: number;
}

// Interface para criar compra completa
export interface CreateCompraDTO {
  idPedidoCompra: string;
  fornecedor: string;
  categoria: string;
  observacoes?: string;
  dataEntrada: string;
  itens: CreateItemCompraDTO[];
}

// Função auxiliar para criar um ItemCompra a partir de um Produto
export function criarItemCompraDeProduto(
  produto: Produto, 
  quantidade: number = 1, 
  custoUnitario: number = 0
): ItemCompra {
  return {
    produtoId: produto.id!,
    quantidade: quantidade,
    custoUnitario: custoUnitario,
    produtoNome: produto.nome,
    produtoSku: produto.sku,
    produto: produto,
    custoTotal: quantidade * custoUnitario
  };
}

// Função para criar CreateItemCompraDTO a partir de ItemCompra
export function criarCreateItemCompraDTO(item: ItemCompra): CreateItemCompraDTO {
  return {
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    custoUnitario: item.custoUnitario
  };
}

// Função para criar CreateCompraDTO a partir de dados da compra
export function criarCreateCompraDTO(
  idPedidoCompra: string,
  fornecedor: string,
  categoria: string,
  itens: ItemCompra[],
  observacoes?: string,
  dataEntrada?: string
): CreateCompraDTO {
  return {
    idPedidoCompra,
    fornecedor,
    categoria,
    observacoes: observacoes || '',
    dataEntrada: dataEntrada || new Date().toISOString().split('T')[0],
    itens: itens.map(criarCreateItemCompraDTO)
  };
}

// Função para calcular o custo total de um item
export function calcularCustoTotalItem(item: ItemCompra): number {
  const quantidade = item.quantidade || 0;
  const custoUnitario = item.custoUnitario || 0;
  return quantidade * custoUnitario;
}

// Função para verificar se um item tem dados válidos
export function itemCompraValido(item: ItemCompra): boolean {
  return !!item.produtoId && 
         !!item.quantidade && 
         item.quantidade > 0 &&
         (item.custoUnitario || 0) >= 0;
}

// Função para calcular custo total de uma lista de itens
export function calcularCustoTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => {
    return total + (item.custoTotal || calcularCustoTotalItem(item));
  }, 0);
}

// Função para calcular quantidade total de uma lista de itens
export function calcularQuantidadeTotalItens(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => {
    return total + (item.quantidade || 0);
  }, 0);
}