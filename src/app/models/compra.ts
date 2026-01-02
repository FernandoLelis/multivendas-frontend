// compra.ts - ATUALIZADO PARA COMPATIBILIDADE COM BACKEND
import { ItemCompra, calcularCustoTotalItens, calcularQuantidadeTotalItens } from './item-compra';

// Interface para compras com MÚLTIPLOS PRODUTOS
export interface Compra {
  id?: number;
  
  // Dados da compra
  dataEntrada: string;           // Data da entrada no estoque (formato: "2023-12-01")
  idPedidoCompra: string;       // ID único do pedido de compra
  fornecedor: string;           // Nome do fornecedor
  categoria: string;            // Categoria da compra
  observacoes?: string;         // Observações adicionais
  
  // ✅ NOVO: Lista de produtos da compra (MÚLTIPLOS PRODUTOS)
  itens: ItemCompra[];          // Array de itens comprados
  
  // Campos calculados
  custoTotal?: number;          // Custo total da compra (soma de todos os itens)
  quantidadeTotal?: number;     // Quantidade total de itens
  
  // ✅✅✅ ADICIONADO: Campos alternativos para compatibilidade com backend
  data?: string;                // Campo alternativo para "dataEntrada" (backend usa "data")
  totalCompra?: number;         // Campo alternativo para "custoTotal" (backend usa "totalCompra")
  userId?: number;              // ID do usuário (vindo do backend)
}

// Categorias predefinidas para compras
export const CATEGORIAS_COMPRA = [
  'Produto',
  'Material de Escritório', 
  'Embalagem',
  'Outros'
] as const;

export type CategoriaCompra = typeof CATEGORIAS_COMPRA[number];

// Função auxiliar para criar uma compra vazia
export function criarCompraVazia(): Compra {
  const now = new Date();
  const dataFormatada = now.toISOString().split('T')[0]; // "2025-11-05"
  
  return {
    dataEntrada: dataFormatada,
    idPedidoCompra: '',
    fornecedor: '',
    categoria: 'Produto',
    observacoes: '',
    itens: []  // Array vazio - será preenchido com produtos
  };
}

// ✅✅✅ NOVA FUNÇÃO: Normalizar compra vinda do backend
export function normalizarCompraDoBackend(compraBackend: any): Compra {
  console.log('🔄 [COMPRA] Normalizando compra do backend:', compraBackend);
  
  const compraNormalizada: Compra = {
    id: compraBackend.id,
    dataEntrada: compraBackend.data || compraBackend.dataEntrada, // Usar "data" se "dataEntrada" não existir
    idPedidoCompra: compraBackend.idPedidoCompra,
    fornecedor: compraBackend.fornecedor || '',
    categoria: compraBackend.categoria || 'Produto',
    observacoes: compraBackend.observacoes || '',
    itens: compraBackend.itens || [],
    custoTotal: compraBackend.totalCompra || compraBackend.custoTotal || 0, // Usar "totalCompra" se "custoTotal" não existir
    quantidadeTotal: compraBackend.quantidadeTotal || 0,
    
    // Manter campos originais para referência
    data: compraBackend.data,
    totalCompra: compraBackend.totalCompra,
    userId: compraBackend.userId
  };
  
  console.log('✅ [COMPRA] Compra normalizada:', compraNormalizada);
  return compraNormalizada;
}

// Função para calcular o custo total da compra a partir dos itens
export function calcularCustoTotalCompra(itens: ItemCompra[]): number {
  return calcularCustoTotalItens(itens);
}

// Função para calcular quantidade total da compra a partir dos itens
export function calcularQuantidadeTotalCompra(itens: ItemCompra[]): number {
  return calcularQuantidadeTotalItens(itens);
}

// Função para obter lista de IDs de produtos únicos
export function obterProdutosIds(itens: ItemCompra[]): number[] {
  const ids = itens.map(item => item.produtoId);
  return [...new Set(ids)]; // Remove duplicatas
}

// Função para verificar se uma compra tem itens duplicados
export function temItensDuplicados(compra: Compra): boolean {
  if (!compra.itens || compra.itens.length === 0) return false;
  
  // Verifica se há produtos com o mesmo ID
  const produtoIds = compra.itens.map(item => item.produtoId);
  const idsUnicos = [...new Set(produtoIds)];
  
  return idsUnicos.length !== produtoIds.length;
}

// Função para normalizar uma compra
export function normalizarCompra(compra: Compra): Compra {
  const compraNormalizada = { ...compra };
  
  // Calcular campos derivados se não existirem
  if (compraNormalizada.custoTotal === undefined) {
    compraNormalizada.custoTotal = calcularCustoTotalCompra(compraNormalizada.itens);
  }
  
  if (compraNormalizada.quantidadeTotal === undefined) {
    compraNormalizada.quantidadeTotal = calcularQuantidadeTotalCompra(compraNormalizada.itens);
  }
  
  return compraNormalizada;
}

// Função para converter compra antiga (1 produto) para nova estrutura (múltiplos produtos)
export function converterCompraAntigaParaNova(compraAntiga: any): Compra {
  if (compraAntiga.itens && Array.isArray(compraAntiga.itens)) {
    // Já está no formato novo
    return normalizarCompraDoBackend(compraAntiga);
  }
  
  // Converter formato antigo (1 produto) para novo (array de itens)
  const compraConvertida: Compra = {
    id: compraAntiga.id,
    dataEntrada: compraAntiga.data || compraAntiga.dataEntrada,
    idPedidoCompra: compraAntiga.idPedidoCompra,
    fornecedor: compraAntiga.fornecedor || '',
    categoria: compraAntiga.categoria || 'Produto',
    observacoes: compraAntiga.observacoes || '',
    itens: [{
      produtoId: compraAntiga.produtoId,
      quantidade: compraAntiga.quantidade,
      custoUnitario: compraAntiga.custoUnitario,
      produtoNome: compraAntiga.produtoNome,
      produtoSku: compraAntiga.produtoSku,
      custoTotal: compraAntiga.custoTotal,
      saldo: compraAntiga.saldo
    }],
    custoTotal: compraAntiga.totalCompra || compraAntiga.custoTotal,
    quantidadeTotal: compraAntiga.quantidade
  };
  
  return normalizarCompra(compraConvertida);
}