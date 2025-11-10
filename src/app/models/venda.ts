// Interface para vendas (ATUALIZADA para DTO)
export interface Venda {
  id?: number;
  data: string;
  idPedido: string;
  plataforma: string;
  quantidade: number;
  precoVenda: number;
  custoProdutoVendido: number;
  fretePagoPeloCliente: number;
  custoEnvio: number;
  tarifaPlataforma: number;
  despesasOperacionais: number;
  
  // ✅ CORREÇÃO: Dados do produto do DTO
  produtoId: number;
  produtoNome: string;
  produtoSku: string;
  
  // ✅ CÁLCULOS FINANCEIROS DO DTO
  faturamento: number;
  custoEfetivoTotal: number;
  lucroBruto: number;
  lucroLiquido: number;
  roi: number;

  // Métodos de cálculo (opcionais - podem ser implementados no service)
  calcularFaturamento?: () => number;
  calcularCustoEfetivoTotal?: () => number;
  calcularLucroBruto?: () => number;
  calcularLucroLiquido?: () => number;
  calcularROI?: () => number;
}

// Plataformas predefinidas
export const PLATAFORMAS_VENDA = [
  'Mercado Livre',
  'Shopee', 
  'Amazon',
  'Outros'
] as const;

export type PlataformaVenda = typeof PLATAFORMAS_VENDA[number];