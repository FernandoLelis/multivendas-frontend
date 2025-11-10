export interface Despesa {
  id?: number;
  descricao: string;
  valor: number;
  data: string; // ISO string format (YYYY-MM-DD)
  categoria: string;
  observacoes?: string;
  recorrente: boolean;
}

// ✅ CATEGORIAS EXPANDIDAS PARA DESPESAS & PAGAMENTOS
export const CATEGORIAS_DESPESA = [
  'Material de Escritório',
  'Embalagem', 
  'Manutenção',
  'Marketing',
  'Transporte',
  // ✅ NOVAS CATEGORIAS DE PAGAMENTOS:
  'Aluguel',
  'Internet', 
  'DAS',
  'Salários',
  'Impostos',
  'Outros'
] as const;

export type CategoriaDespesa = typeof CATEGORIAS_DESPESA[number];

export interface DespesaForm {
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  observacoes?: string;
  recorrente: boolean;
}