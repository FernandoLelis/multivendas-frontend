import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalConfig {
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'sucesso' | 'erro' | 'confirmacao';
  textoBotaoPrimario?: string;
  textoBotaoSecundario?: string;
  onConfirmar?: () => void;
  onCancelar?: () => void;
  dadosEspecificos?: any;
  template?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalConfig | null>(null);
  public modal$ = this.modalSubject.asObservable();

  abrirModal(config: ModalConfig): void {
    this.modalSubject.next(config);
  }

  fecharModal(): void {
    this.modalSubject.next(null);
  }

  // ✅ MÉTODO PARA ALERTA PEPS EDIÇÃO
  mostrarAlertaPeps(saldoAtual: number, quantidadeAntiga: number): void {
    this.abrirModal({
      titulo: 'Alteração Bloqueada',
      mensagem: '',
      tipo: 'erro',
      textoBotaoPrimario: 'Entendi',
      dadosEspecificos: {
        saldoAtual: saldoAtual,
        quantidadeAntiga: quantidadeAntiga
      },
      template: 'alerta-peps'
    });
  }

  // ✅ MÉTODO PARA ALERTA PEPS EXCLUSÃO
  mostrarAlertaPepsExclusao(saldoAtual: number, quantidadeAntiga: number): void {
    this.abrirModal({
      titulo: 'Exclusão Bloqueada',
      mensagem: '',
      tipo: 'erro',
      textoBotaoPrimario: 'Entendi',
      dadosEspecificos: {
        saldoAtual: saldoAtual,
        quantidadeAntiga: quantidadeAntiga
      },
      template: 'alerta-peps-exclusao'
    });
  }

  // ✅ MÉTODO: ALERTA EXCLUSÃO PRODUTO
  mostrarAlertaProdutoExclusao(): void {
    this.abrirModal({
      titulo: 'Exclusão Bloqueada',
      mensagem: '',
      tipo: 'erro',
      textoBotaoPrimario: 'Entendi',
      template: 'alerta-produto-exclusao'
    });
  }

  // ✅✅✅ MÉTODO PARA ERRO ID DUPLICADO DE VENDA
  mostrarErroIdDuplicadoVenda(idPedido: string): void {
    this.abrirModal({
      titulo: '🛑 ID da Venda Já Existe',
      mensagem: '',
      tipo: 'erro',
      textoBotaoPrimario: 'Entendi',
      dadosEspecificos: {
        idPedido: idPedido
      },
      template: 'erro-id-duplicado-venda'
    });
  }

  // ✅✅✅ MÉTODO PARA ERRO ID DUPLICADO DE COMPRA
  mostrarErroIdDuplicadoCompra(idPedido: string): void {
    this.abrirModal({
      titulo: '🛑 ID da Compra Já Existe',
      mensagem: '',
      tipo: 'erro',
      textoBotaoPrimario: 'Entendi',
      dadosEspecificos: {
        idPedido: idPedido
      },
      template: 'erro-id-duplicado-compra'
    });
  }

  // ✅ MÉTODO: ERRO GENÉRICO DE COMPRA
  mostrarErroCompra(mensagem: string): void {
    this.abrirModal({
      titulo: '❌ Erro ao Salvar Compra',
      mensagem: mensagem,
      tipo: 'erro',
      textoBotaoPrimario: 'Fechar'
    });
  }

  // Métodos de conveniência
  mostrarDetalhes(titulo: string, mensagem: string): void {
    this.abrirModal({
      titulo,
      mensagem,
      tipo: 'info',
      textoBotaoPrimario: 'Fechar'
    });
  }

  // ✅ MÉTODO PARA DETALHES DE VENDA COM CÁLCULOS CONSISTENTES
  mostrarDetalhesVenda(venda: any): void {
    const titulo = 'Detalhes da Venda';
    
    const precoVenda = venda.precoVenda || 0;
    const fretePago = venda.fretePagoPeloCliente || 0;
    const custoProduto = venda.custoProdutoVendido || 0;
    const custoEnvio = venda.custoEnvio || 0;
    const tarifa = venda.tarifaPlataforma || 0;
    const despesasOperacionais = venda.despesasOperacionais || 0;

    const faturamento = precoVenda + fretePago;
    const custoEfetivoTotal = custoProduto + custoEnvio + tarifa;
    const lucroBruto = faturamento - custoEfetivoTotal;
    const lucroLiquido = lucroBruto - despesasOperacionais;
    const roi = custoEfetivoTotal > 0 ? (lucroLiquido / custoEfetivoTotal) * 100 : 0;
    const margemLiquida = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0;

    const dadosVenda = {
      informacoesBasicas: {
        pedido: venda.idPedido,
        plataforma: venda.plataforma,
        data: new Date(venda.data).toLocaleString('pt-BR'),
        produto: venda.produtoNome || 'N/A',
        quantidade: venda.quantidade
      },
      valoresFinanceiros: {
        precoVenda: precoVenda.toFixed(2),
        fretePago: fretePago.toFixed(2),
        custoEnvio: custoEnvio.toFixed(2),
        tarifa: tarifa.toFixed(2),
        despesasOperacionais: despesasOperacionais.toFixed(2)
      },
      calculos: {
        faturamento: faturamento.toFixed(2),
        custoProduto: custoProduto.toFixed(2),
        custoEfetivoTotal: custoEfetivoTotal.toFixed(2),
        lucroBruto: lucroBruto.toFixed(2),
        lucroLiquido: lucroLiquido.toFixed(2),
        roi: roi.toFixed(2),
        margemLiquida: margemLiquida.toFixed(2),
        lucroPositivo: lucroLiquido >= 0,
        roiPositivo: roi >= 0
      },
      formulas: {
        faturamento: 'Preço Venda + Frete Pago pelo Cliente',
        custoEfetivoTotal: 'Custo PEPS + Custo Envio + Tarifa da Plataforma',
        lucroBruto: 'Faturamento - Custo Efetivo Total',
        lucroLiquido: 'Lucro Bruto - Despesas Operacionais',
        roi: '(Lucro Líquido / Custo Efetivo Total) × 100'
      }
    };

    this.abrirModal({
      titulo,
      mensagem: '',
      tipo: 'info',
      textoBotaoPrimario: 'Fechar',
      dadosEspecificos: dadosVenda,
      template: 'detalhes-venda'
    });
  }

  confirmarExclusao(mensagem: string, onConfirmar: () => void): void {
    this.abrirModal({
      titulo: 'Confirmar Exclusão',
      mensagem,
      tipo: 'confirmacao',
      textoBotaoPrimario: 'Excluir',
      textoBotaoSecundario: 'Cancelar',
      onConfirmar,
      onCancelar: () => this.fecharModal()
    });
  }

  mostrarSucesso(mensagem: string): void {
    this.abrirModal({
      titulo: 'Sucesso',
      mensagem,
      tipo: 'sucesso',
      textoBotaoPrimario: 'OK'
    });
  }

  mostrarErro(mensagem: string): void {
    this.abrirModal({
      titulo: 'Erro',
      mensagem,
      tipo: 'erro',
      textoBotaoPrimario: 'OK'
    });
  }
}