export interface Produto {
  id?: number;
  nome: string;
  sku: string;
  asin: string;
  descricao: string;
  estoqueMinimo: number;
  dataCriacao: string;
  quantidadeEstoqueTotal: number;
}

// ✅ FUNÇÃO AUXILIAR com fallback
export function getQuantidadeEstoque(produto: Produto): number {
  return produto.quantidadeEstoqueTotal || 0;
}