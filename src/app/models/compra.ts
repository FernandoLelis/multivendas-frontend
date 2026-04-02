// compra.ts - ATUALIZADO PARA SUPORTE A COMPRAS UNIFICADAS COM SKU E IMAGEM
import { ItemCompra, calcularCustoTotalItens, calcularQuantidadeTotalItens } from './item-compra';

export interface Compra {
  id?: number;
  dataEntrada: string;           // Data da entrada no estoque (formato: "2023-12-01")
  idPedidoCompra: string;        // ID único do pedido de compra
  fornecedor: string;
  categoria: string;
  observacoes?: string;
  itens: ItemCompra[];
  custoTotal?: number;
  quantidadeTotal?: number;
  data?: string;                  // Campo alternativo para "dataEntrada"
  totalCompra?: number;          // Campo alternativo para "custoTotal"
  userId?: number;
  sistemaAntigo?: boolean;
}

export const CATEGORIAS_COMPRA = [
  'Produto',
  'Material de Escritório', 
  'Embalagem',
  'Outros'
] as const;

export type CategoriaCompra = typeof CATEGORIAS_COMPRA[number];

export function criarCompraVazia(): Compra {
  const now = new Date();
  const dataFormatada = now.toISOString().split('T')[0];
  return {
    dataEntrada: dataFormatada,
    idPedidoCompra: '',
    fornecedor: '',
    categoria: 'Produto',
    observacoes: '',
    itens: [],
    sistemaAntigo: false
  };
}

export function normalizarCompraDoBackend(compraBackend: any): Compra {
  console.log('🔄 [COMPRA] Normalizando compra do backend:', compraBackend);
  
  let idNormalizado = compraBackend.id;
  const sistemaAntigo = compraBackend.sistemaAntigo || false;
  if (sistemaAntigo && idNormalizado && idNormalizado < 0) {
    idNormalizado = Math.abs(idNormalizado);
  }
  
  let idPedidoCompra = compraBackend.idPedidoCompra;
  if (!idPedidoCompra || idPedidoCompra.trim() === '') {
    if (sistemaAntigo) {
      idPedidoCompra = `ENTRADA-${Math.abs(compraBackend.id || 0)}`;
    } else {
      idPedidoCompra = `COMPRA-${compraBackend.id || 'SEM-ID'}`;
    }
  }
  
  let dataExtraida = compraBackend.dataCompra || compraBackend.data || compraBackend.dataEntrada;
  
  // ✅ Mapear itens garantindo SKU e imagem (se houver)
  const itens = (compraBackend.itens || []).map((item: any) => ({
    produtoId: item.produtoId,
    produtoNome: item.produtoNome || item.nome,
    produtoSku: item.produtoSku || item.sku || '',
    imagemUrl: item.imagemUrl || item.produto?.imagemUrl || item.imagemPrincipal || '',
    quantidade: item.quantidade,
    custoUnitario: item.custoUnitario,
    custoTotal: item.custoTotal,
    saldo: item.saldo
  }));
  
  const compraNormalizada: Compra = {
    id: idNormalizado,
    dataEntrada: dataExtraida || new Date().toISOString(),
    idPedidoCompra: idPedidoCompra,
    fornecedor: compraBackend.fornecedor || '',
    categoria: compraBackend.categoria || 'Produto',
    observacoes: compraBackend.observacoes || '',
    itens: itens,
    custoTotal: compraBackend.totalCompra || compraBackend.custoTotal || 0,
    quantidadeTotal: compraBackend.quantidadeTotal || 0,
    data: compraBackend.data,
    totalCompra: compraBackend.totalCompra,
    userId: compraBackend.userId,
    sistemaAntigo: sistemaAntigo
  };
  
  // Se não tiver itens mas tiver dados de item único (compras antigas)
  if (compraNormalizada.itens.length === 0 && 
      (compraBackend.produtoId || compraBackend.produtoNome)) {
    compraNormalizada.itens = [{
      produtoId: compraBackend.produtoId,
      produtoNome: compraBackend.produtoNome,
      produtoSku: compraBackend.produtoSku || compraBackend.sku || '',
      imagemUrl: compraBackend.imagemUrl || compraBackend.produto?.imagemUrl || '',
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
    itensCount: compraNormalizada.itens.length,
    primeiroItemSku: compraNormalizada.itens[0]?.produtoSku,
    primeiroItemImagem: compraNormalizada.itens[0]?.imagemUrl
  });
  
  return compraNormalizada;
}

export function calcularCustoTotalCompra(itens: ItemCompra[]): number {
  return calcularCustoTotalItens(itens);
}

export function calcularQuantidadeTotalCompra(itens: ItemCompra[]): number {
  return calcularQuantidadeTotalItens(itens);
}

export function obterProdutosIds(itens: ItemCompra[]): number[] {
  const ids = itens.map(item => item.produtoId);
  return [...new Set(ids)];
}

export function temItensDuplicados(compra: Compra): boolean {
  if (!compra.itens || compra.itens.length === 0) return false;
  const produtoIds = compra.itens.map(item => item.produtoId);
  const idsUnicos = [...new Set(produtoIds)];
  return idsUnicos.length !== produtoIds.length;
}

export function normalizarCompra(compra: Compra): Compra {
  const compraNormalizada = { ...compra };
  if (compraNormalizada.custoTotal === undefined) {
    compraNormalizada.custoTotal = calcularCustoTotalCompra(compraNormalizada.itens);
  }
  if (compraNormalizada.quantidadeTotal === undefined) {
    compraNormalizada.quantidadeTotal = calcularQuantidadeTotalCompra(compraNormalizada.itens);
  }
  return compraNormalizada;
}

export function converterCompraAntigaParaNova(compraAntiga: any): Compra {
  if (compraAntiga.itens && Array.isArray(compraAntiga.itens)) {
    return normalizarCompraDoBackend(compraAntiga);
  }
  
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
      produtoSku: compraAntiga.produtoSku || compraAntiga.sku || '',
      imagemUrl: compraAntiga.imagemUrl || compraAntiga.produto?.imagemUrl || '',
      custoTotal: compraAntiga.custoTotal,
      saldo: compraAntiga.saldo
    }],
    custoTotal: compraAntiga.totalCompra || compraAntiga.custoTotal,
    quantidadeTotal: compraAntiga.quantity,
    sistemaAntigo: true
  };
  return normalizarCompra(compraConvertida);
}

export function isCompraSistemaAntigo(compra: Compra): boolean {
  return compra.sistemaAntigo === true;
}

export function getTipoCompraLabel(compra: Compra): string {
  return compra.sistemaAntigo ? 'Sistema Antigo' : 'Sistema Novo';
}