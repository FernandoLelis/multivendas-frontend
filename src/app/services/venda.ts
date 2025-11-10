import { Produto } from '../models/produto';

export interface Venda {
  id?: number;
  data: string;
  idPedido: string;
  plataforma: string;
  quantidade: number;
  precoVenda: number; // Mantido para compatibilidade com backend
  // NOVOS CAMPOS PARA AUTO-CÁLCULO
  precoUnitario?: number;
  precoTotal?: number;
  fretePagoPeloCliente: number;
  custoEnvio: number;
  tarifaPlataforma: number;
  custoProdutoVendido: number; // CAMPO ADICIONADO - TAREFA #1
  produto: Produto;
  
  // Campos calculados (opcionais)
  custoEfetivoTotal?: number;
  lucroBruto?: number;
  lucroLiquido?: number;
  roi?: number;
}