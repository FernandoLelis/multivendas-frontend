import { Produto } from './produto';

// Interface para itens de uma venda (representa um produto específico na venda)
export interface ItemVenda {
  // Identificação do produto
  produtoId: number;        // ID do produto vendido (obrigatório para enviar ao backend)
  quantidade: number;       // Quantidade vendida deste produto (obrigatório)
  
  // Informações para exibição (podem vir do backend ou ser preenchidas no frontend)
  produtoNome?: string;     // Nome do produto (para exibição)
  produtoSku?: string;      // SKU do produto (para exibição)
  produto?: Produto;        // Produto completo (opcional, para uso no carrinho)
  
  // Informações calculadas pelo backend (PEPS)
  custoUnitario?: number;   // Custo unitário calculado pelo PEPS no momento da venda
  custoTotal?: number;      // Custo total = quantidade × custoUnitario
  loteId?: number;          // ID do lote específico usado (rastreamento PEPS)
  
  // Campos para uso interno no frontend (carrinho)
  precoUnitarioVenda?: number; // Preço de venda unitário (para cálculo do total)
  precoTotalItem?: number;     // Preço total do item = quantidade × precoUnitarioVenda
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

// Função para calcular o preço total de um item
export function calcularPrecoTotalItem(item: ItemVenda): number {
  const quantidade = item.quantidade || 0;
  const precoUnitario = item.precoUnitarioVenda || 0;
  return quantidade * precoUnitario;
}