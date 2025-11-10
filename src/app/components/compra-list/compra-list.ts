import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasService } from '../../services/compra.service';
import { CompraFormComponent } from '../compra-form/compra-form';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';

@Component({
  selector: 'app-compra-list',
  standalone: true,
  imports: [
    CommonModule, 
    CompraFormComponent,
    BrazilianCurrencyPipe
  ],
  templateUrl: './compra-list.html',
  styleUrls: ['./compra-list.css']
})
export class ComprasComponent implements OnInit {
  compras: any[] = [];
  mostrarModal: boolean = false;
  compraEditando: any = null;

  constructor(
    private compraService: ComprasService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarCompras();
  }

  carregarCompras(): void {
    console.log('🚀 INICIANDO carregarCompras()');
    
    this.compraService.getCompras().subscribe({
      next: (compras) => {
        console.log('✅ COMPRAS RECEBIDAS DO BACKEND:');
        console.log('📦 Total de compras:', compras.length);
        
        if (compras.length > 0) {
          console.log('🔍 PRIMEIRA COMPRA COMPLETA:', compras[0]);
          console.log('🎯 PRODUTO DA PRIMEIRA COMPRA:', compras[0]?.produto);
          console.log('📋 PROPRIEDADES DA COMPRA:', Object.keys(compras[0] || {}));
          
          // Verificar estrutura do produto
          if (compras[0]?.produto) {
            console.log('📦 PROPRIEDADES DO PRODUTO:', Object.keys(compras[0].produto));
            console.log('🏷️ NOME DO PRODUTO:', compras[0].produto.nome);
            console.log('🆔 ID DO PRODUTO:', compras[0].produto.id);
          } else {
            console.log('❌ PRODUTO É NULL/UNDEFINED');
          }
        } else {
          console.log('📭 NENHUMA COMPRA ENCONTRADA');
        }
        
        this.compras = compras;
      },
      error: (error) => {
        console.error('❌ ERRO AO CARREGAR COMPRAS:', error);
        console.error('🔍 DETALHES DO ERRO:', error.error);
        console.error('📊 STATUS DO ERRO:', error.status);
      }
    });
  }

  novaCompra(): void {
    this.compraEditando = null;
    this.mostrarModal = true;
  }

  editarCompra(compra: any): void {
    this.compraEditando = compra;
    this.mostrarModal = true;
  }

  excluirCompra(compra: any): void {
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a compra "${compra.idPedidoCompra}"?`,
      () => {
        if (compra.id) {
          this.compraService.excluirCompra(compra.id).subscribe({
            next: () => {
              this.modalService.mostrarSucesso('Compra excluída com sucesso!');
              this.carregarCompras();
            },
            error: (error) => {
              console.error('❌ Erro ao excluir compra:', error);
              
              if (error.error && error.error.includes('Não é possível excluir um lote que já foi parcialmente consumido')) {
                this.mostrarModalPepsExclusao(error.error, compra);
              } else {
                this.modalService.mostrarErro('Erro ao excluir compra!');
              }
            }
          });
        }
      }
    );
  }

  private mostrarModalPepsExclusao(mensagemErro: string, compra: any): void {
    const saldoMatch = mensagemErro.match(/Saldo atual: (\d+)/);
    const quantidadeMatch = mensagemErro.match(/Quantidade original: (\d+)/);
    
    const saldoAtual = saldoMatch ? parseInt(saldoMatch[1]) : 0;
    const quantidadeAntiga = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 0;

    this.modalService.mostrarAlertaPepsExclusao(saldoAtual, quantidadeAntiga);
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.compraEditando = null;
  }

  onCompraSalva(): void {
    this.carregarCompras();
    this.fecharModal(); 
  }

  getDataCompra(compra: any): string {
    if (!compra.dataEntrada) return 'Data não informada';
    return new Date(compra.dataEntrada).toLocaleDateString('pt-BR');
  }
}