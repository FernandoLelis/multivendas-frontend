// compra.ts - ATUALIZADO PARA SUPORTE A COMPRAS UNIFICADAS
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
  
  // ✅✅✅ NOVO: Flag para identificar compras do sistema antigo
  sistemaAntigo?: boolean;
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
    itens: [],  // Array vazio - será preenchido com produtos
    sistemaAntigo: false
  };
}

// ✅✅✅ NOVA FUNÇÃO: Normalizar compra vinda do backend (ATUALIZADA)
export function normalizarCompraDoBackend(compraBackend: any): Compra {
  console.log('🔄 [COMPRA] Normalizando compra do backend:', compraBackend);
  
  // Extrair ID absoluto (para compras antigas que têm ID negativo)
  let idNormalizado = compraBackend.id;
  const sistemaAntigo = compraBackend.sistemaAntigo || false;
  
  if (sistemaAntigo && idNormalizado && idNormalizado < 0) {
    idNormalizado = Math.abs(idNormalizado);
  }
  
  // Garantir idPedidoCompra para compras antigas
  let idPedidoCompra = compraBackend.idPedidoCompra;
  if (!idPedidoCompra || idPedidoCompra.trim() === '') {
    if (sistemaAntigo) {
      idPedidoCompra = `ENTRADA-${Math.abs(compraBackend.id || 0)}`;
    } else {
      idPedidoCompra = `COMPRA-${compraBackend.id || 'SEM-ID'}`;
    }
  }
  
  // Extrair data - prioridade: dataCompra → data → dataEntrada
  let dataExtraida = compraBackend.dataCompra || compraBackend.data || compraBackend.dataEntrada;
  
  const compraNormalizada: Compra = {
    id: idNormalizado,
    dataEntrada: dataExtraida || new Date().toISOString(),
    idPedidoCompra: idPedidoCompra,
    fornecedor: compraBackend.fornecedor || '',
    categoria: compraBackend.categoria || 'Produto',
    observacoes: compraBackend.observacoes || '',
    itens: compraBackend.itens || [],
    custoTotal: compraBackend.totalCompra || compraBackend.custoTotal || 0,
    quantidadeTotal: compraBackend.quantidadeTotal || 0,
    
    // Campos originais para referência
    data: compraBackend.data,
    totalCompra: compraBackend.totalCompra,
    userId: compraBackend.userId,
    
    // ✅ NOVO: Flag para identificar compras do sistema antigo
    sistemaAntigo: sistemaAntigo
  };
  
  // Se não tiver itens mas tiver dados de item único (compras antigas)
  if (compraNormalizada.itens.length === 0 && 
      (compraBackend.produtoId || compraBackend.produtoNome)) {
    compraNormalizada.itens = [{
      produtoId: compraBackend.produtoId,
      produtoNome: compraBackend.produtoNome,
      produtoSku: compraBackend.produtoSku || '',
      quantidade: compraBackend.quantidade || 1,
      custoUnitario: compraBackend.custoUnitario || (compraBackend.custoTotal || 0),
      custoTotal: compraBackend.custoTotal || 0
    }];
  }
  
  // Calcular custoTotal se não estiver definido
  if (!compraNormalizada.custoTotal || compraNormalizada.custoTotal === 0) {
    if (compraNormalizada.itens.length > 0) {
      compraNormalizada.custoTotal = calcularCustoTotalCompra(compraNormalizada.itens);
      compraNormalizada.totalCompra = compraNormalizada.custoTotal;
    }
  }
  
  console.log('✅ [COMPRA] Compra normalizada:', {
    id: compraNormalizada.id,
    sistemaAntigo: compraNormalizada.sistemaAntigo,
    idPedidoCompra: compraNormalizada.idPedidoCompra,
    dataEntrada: compraNormalizada.dataEntrada,
    itensCount: compraNormalizada.itens.length,
    custoTotal: compraNormalizada.custoTotal
  });
  
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
    quantidadeTotal: compraAntiga.quantity,
    sistemaAntigo: true // Marcar como sistema antigo
  };
  
  return normalizarCompra(compraConvertida);
}

// ✅ NOVA FUNÇÃO: Verificar se é uma compra do sistema antigo
export function isCompraSistemaAntigo(compra: Compra): boolean {
  return compra.sistemaAntigo === true;
}

// ✅ NOVA FUNÇÃO: Obter label para tipo de compra
export function getTipoCompraLabel(compra: Compra): string {
  return compra.sistemaAntigo ? 'Sistema Antigo' : 'Sistema Novo';
}