export interface Produto {
  id?: number;
  nome: string;
  sku: string;
  asin: string;
  descricao: string;
  estoqueMinimo: number;
  dataCriacao: string;
  quantidadeEstoqueTotal: number;
  
  // Métricas
  quantidadeVendida?: number;
  custoMedio?: number;
  precoMedioVenda?: number;
  lucro?: number;

  // ✅ NOVOS CAMPOS FÍSICOS E IMAGEM (Opcionais)
  peso?: number;
  comprimento?: number;
  largura?: number;
  altura?: number;
  imagemUrl?: string;
}

export function getQuantidadeEstoque(produto: Produto): number {
  return produto.quantidadeEstoqueTotal || 0;
}