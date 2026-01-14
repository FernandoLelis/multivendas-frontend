import { Produto } from './produto';

// Interface para itens de uma venda (representa um produto específico na venda)
export interface ItemVenda {
  // ✅ ADICIONADO: ID do item (vem do backend após criação)
  id?: number;
  
  // Identificação do produto
  produtoId: number;        // ID do produto vendido (obrigatório para enviar ao backend)
  quantidade: number;       // Quantidade vendida deste produto (obrigatório)
  
  // Informações para exibição (podem vir do backend ou ser preenchidas no frontend)
  produtoNome?: string;     // Nome do produto (para exibição)
  produtoSku?: string;      // SKU do produto (para exibição)
  produto?: Produto;        // Produto completo (opcional, para uso no carrinho)
  
  // ✅✅✅ CORREÇÃO v46.6: Campos do backend que não existiam no frontend
  precoUnitario?: number;   // Preço unitário enviado pelo BACKEND (Java usa este nome)
  custoUnitario?: number;   // Custo unitário calculado pelo PEPS no momento da venda
  custoTotal?: number;      // Custo total = quantidade × custoUnitario
  loteId?: number;          // ID do lote específico usado (rastreamento PEPS)
  
  // Campos para uso interno no frontend (carrinho)
  precoUnitarioVenda?: number; // Preço de venda unitário (para cálculo do total - FRONTEND)
  precoTotalItem?: number;     // Preço total do item = quantidade × precoUnitarioVenda
}

// Interface para criar item de venda (usada no POST)
export interface CreateItemVendaDTO {
  produtoId: number;
  quantidade: number;
  precoUnitarioVenda?: number;
}

// Interface para criar venda completa
export interface CreateVendaDTO {
  idPedido: string;
  plataforma: string;
  precoVenda: number;
  fretePagoPeloCliente?: number;
  custoEnvio?: number;
  tarifaPlataforma?: number;
  data?: string;
  itens: CreateItemVendaDTO[];
}

// Função auxiliar para criar um ItemVenda a partir de um Produto
export function criarItemVendaDeProduto(produto: Produto, quantidade: number = 1): ItemVenda {
  return {
    produtoId: produto.id!,
    quantidade: quantidade,
    produtoNome: produto.nome,
    produtoSku: produto.sku,
    produto: produto,
    precoUnitarioVenda: 0, // Será definido pelo usuário
    precoTotalItem: 0      // Será calculado
  };
}

// Função para criar CreateItemVendaDTO a partir de ItemVenda
export function criarCreateItemVendaDTO(item: ItemVenda): CreateItemVendaDTO {
  return {
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    precoUnitarioVenda: item.precoUnitarioVenda
  };
}

// Função para criar CreateVendaDTO a partir de dados da venda
export function criarCreateVendaDTO(
  idPedido: string,
  plataforma: string,
  precoVenda: number,
  itens: ItemVenda[],
  fretePagoPeloCliente?: number,
  custoEnvio?: number,
  tarifaPlataforma?: number,
  data?: string
): CreateVendaDTO {
  return {
    idPedido,
    plataforma,
    precoVenda,
    fretePagoPeloCliente: fretePagoPeloCliente || 0,
    custoEnvio: custoEnvio || 0,
    tarifaPlataforma: tarifaPlataforma || 0,
    data: data || new Date().toISOString().split('T')[0],
    itens: itens.map(criarCreateItemVendaDTO)
  };
}

// Função para calcular o preço total de um item
export function calcularPrecoTotalItem(item: ItemVenda): number {
  const quantidade = item.quantidade || 0;
  const precoUnitario = item.precoUnitarioVenda || item.precoUnitario || 0;
  return quantidade * precoUnitario;
}

// Função para verificar se um item tem dados válidos
export function itemVendaValido(item: ItemVenda): boolean {
  return !!item.produtoId && 
         !!item.quantidade && 
         item.quantidade > 0 &&
         ((item.precoUnitarioVenda || item.precoUnitario || 0) >= 0);
}

// Função para calcular custo total de uma lista de itens
export function calcularCustoTotalItens(itens: ItemVenda[]): number {
  return itens.reduce((total, item) => {
    return total + (item.custoTotal || 0);
  }, 0);
}

// Função para calcular preço total de uma lista de itens
export function calcularPrecoTotalItens(itens: ItemVenda[]): number {
  return itens.reduce((total, item) => {
    return total + (item.precoTotalItem || calcularPrecoTotalItem(item) || 0);
  }, 0);
}

// Função para calcular quantidade total de uma lista de itens
export function calcularQuantidadeTotalItens(itens: ItemVenda[]): number {
  return itens.reduce((total, item) => {
    return total + (item.quantidade || 0);
  }, 0);
}