import { ItemVenda } from './item-venda';

// Interface para vendas (ATUALIZADA - REMOVIDO despesasOperacionais)
export interface Venda {
  // Identificação
  id?: number;
  data: string;           // Data da venda (formato: "2023-12-01")
  idPedido: string;       // ID único do pedido na plataforma
  plataforma: string;     // Plataforma de venda (Mercado Livre, Shopee, etc.)
  
  // Valores financeiros (precoVenda é o TOTAL da venda)
  precoVenda: number;               // Preço TOTAL da venda (soma de todos os itens)
  fretePagoPeloCliente: number;     // Frete pago pelo cliente
  custoEnvio: number;               // Custo real do envio
  tarifaPlataforma: number;         // Tarifa cobrada pela plataforma
  
  // ✅ REMOVIDO: despesasOperacionais não faz parte do formulário de venda
  // despesasOperacionais: number;   // REMOVIDO - não é campo do formulário
  
  // Campos calculados pelo backend (PEPS)
  custoProdutoVendido?: number;     // Custo total dos produtos (calculado via PEPS)
  
  // Campos calculados no frontend (para exibição)
  faturamento?: number;             // precoVenda + fretePagoPeloCliente
  custoEfetivoTotal?: number;       // custoProdutoVendido + custoEnvio + tarifaPlataforma
  lucroBruto?: number;              // faturamento - custoEfetivoTotal
  lucroLiquido?: number;            // lucroBruto - despesasOperacionais (calculado no backend)
  roi?: number;                     // (lucroLiquido / custoEfetivoTotal) × 100
  
  // ✅ Lista de produtos da venda
  itens: ItemVenda[];               // Array de itens vendidos
  
  // ✅ NOVO: Campos adicionais que podem vir do backend (opcionais)
  quantidadeTotal?: number;         // Soma das quantidades de todos os itens
  produtosIds?: number[];           // Array de IDs de produtos únicos
  custoProdutosTotal?: number;      // Custo total dos produtos (calculado no backend)
  
  // ✅ Campos depreciados (mantidos para compatibilidade se necessário)
  produtoId?: number;               // ⚠️ DEPRECIADO: Usar itens[0].produtoId
  produtoNome?: string;             // ⚠️ DEPRECIADO: Usar itens[0].produtoNome
  produtoSku?: string;              // ⚠️ DEPRECIADO: Usar itens[0].produtoSku
  quantidade?: number;              // ⚠️ DEPRECIADO: Usar quantidadeTotal ou somar itens
}

// Plataformas predefinidas
export const PLATAFORMAS_VENDA = [
  'Mercado Livre',
  'Shopee', 
  'Amazon',
  'Outros'
] as const;

export type PlataformaVenda = typeof PLATAFORMAS_VENDA[number];

// Função auxiliar para criar uma venda vazia
export function criarVendaVazia(): Venda {
  const now = new Date();
  const dataFormatada = now.toISOString().split('T')[0]; // "2025-11-05"
  
  return {
    data: dataFormatada,
    idPedido: '',
    plataforma: 'Mercado Livre',
    precoVenda: 0,
    fretePagoPeloCliente: 0,
    custoEnvio: 0,
    tarifaPlataforma: 0,
    itens: []  // Array vazio - será preenchido com produtos
  };
}

// Função para calcular o preço total da venda a partir dos itens
export function calcularPrecoTotalVenda(itens: ItemVenda[]): number {
  return itens.reduce((total, item) => {
    const precoItem = item.precoTotalItem || 0;
    return total + precoItem;
  }, 0);
}

// ✅ NOVO: Função para calcular quantidade total a partir dos itens
export function calcularQuantidadeTotal(itens: ItemVenda[]): number {
  return itens.reduce((total, item) => {
    return total + (item.quantidade || 0);
  }, 0);
}

// ✅ NOVO: Função para obter lista de IDs de produtos únicos
export function obterProdutosIds(itens: ItemVenda[]): number[] {
  const ids = itens.map(item => item.produtoId);
  return [...new Set(ids)]; // Remove duplicatas
}

// ✅ NOVO: Função para verificar se uma venda tem itens duplicados
export function temItensDuplicados(venda: Venda): boolean {
  if (!venda.itens || venda.itens.length === 0) return false;
  
  // Verifica se há produtos com o mesmo ID
  const produtoIds = venda.itens.map(item => item.produtoId);
  const idsUnicos = [...new Set(produtoIds)];
  
  return idsUnicos.length !== produtoIds.length;
}

// ✅ NOVO: Função para normalizar uma venda (remover campos depreciados se necessário)
export function normalizarVenda(venda: Venda): Venda {
  const vendaNormalizada = { ...venda };
  
  // Calcular campos derivados se não existirem
  if (vendaNormalizada.quantidadeTotal === undefined) {
    vendaNormalizada.quantidadeTotal = calcularQuantidadeTotal(vendaNormalizada.itens);
  }
  
  if (vendaNormalizada.produtosIds === undefined) {
    vendaNormalizada.produtosIds = obterProdutosIds(vendaNormalizada.itens);
  }
  
  // Remover campos depreciados se não forem necessários
  // delete vendaNormalizada.produtoId;
  // delete vendaNormalizada.produtoNome;
  // delete vendaNormalizada.produtoSku;
  // delete vendaNormalizada.quantidade;
  
  return vendaNormalizada;
}