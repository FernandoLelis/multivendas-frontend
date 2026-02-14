// Arquivo: src/app/models/item-venda-agrupado.ts

import { ItemVenda } from './item-venda';

export interface ItemVendaAgrupado {
  produtoId: number;
  produtoNome: string;
  produtoSku: string;
  quantidadeTotal: number;
  precoUnitarioVenda: number;
  precoTotalItem: number;
  custoUnitario: number;
  custoTotal: number;
  estoqueAtual: number;
  quantidadeLotes: number;
  itensOriginais: ItemVenda[];
}

export function agruparItensPorProduto(itens: ItemVenda[]): ItemVendaAgrupado[] {
  if (!itens || itens.length === 0) {
    return [];
  }
  
  const agrupados = new Map<number, ItemVendaAgrupado>();
  
  itens.forEach(item => {
    if (!item.produtoId) return;
    
    const produtoId = item.produtoId;
    
    if (!agrupados.has(produtoId)) {
      agrupados.set(produtoId, {
        produtoId: produtoId,
        produtoNome: item.produtoNome || `Produto ${produtoId}`,
        produtoSku: item.produtoSku || '',
        quantidadeTotal: 0,
        precoUnitarioVenda: 0,
        precoTotalItem: 0,
        custoUnitario: item.custoUnitario || 0,
        custoTotal: 0,
        estoqueAtual: 0,
        quantidadeLotes: 0,
        itensOriginais: []
      });
    }
    
    const agrupado = agrupados.get(produtoId)!;
    
    agrupado.quantidadeTotal += item.quantidade || 0;
    agrupado.precoTotalItem += (item.precoUnitarioVenda || 0) * (item.quantidade || 0);
    agrupado.custoTotal += (item.custoUnitario || 0) * (item.quantidade || 0);
    agrupado.quantidadeLotes++;
    agrupado.itensOriginais.push(item);
  });
  
  const resultado: ItemVendaAgrupado[] = [];
  
  agrupados.forEach(agrupado => {
    if (agrupado.quantidadeTotal > 0) {
      agrupado.precoUnitarioVenda = agrupado.precoTotalItem / agrupado.quantidadeTotal;
      agrupado.precoUnitarioVenda = Math.round(agrupado.precoUnitarioVenda * 100) / 100;
      
      if (agrupado.custoTotal > 0) {
        agrupado.custoUnitario = agrupado.custoTotal / agrupado.quantidadeTotal;
        agrupado.custoUnitario = Math.round(agrupado.custoUnitario * 100) / 100;
      }
    }
    
    resultado.push(agrupado);
  });
  
  return resultado;
}