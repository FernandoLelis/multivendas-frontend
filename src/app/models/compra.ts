// compra.ts CORRIGIDO
import { Produto } from './produto';

export interface Compra {
  id?: number;
  produtoId: number;           
  produtoNome: string;         
  produtoSku: string;         
  quantidade: number;
  saldo: number;
  custoTotal: number;
  custoUnitario: number;
  dataEntrada: string;
  fornecedor?: string;
  idPedidoCompra: string;
  categoria: string;
  observacoes?: string;
}

export const CATEGORIAS_COMPRA = [
  'Produto',
  'Material de Escritório', 
  'Embalagem',
  'Outros'
] as const;

export type CategoriaCompra = typeof CATEGORIAS_COMPRA[number];