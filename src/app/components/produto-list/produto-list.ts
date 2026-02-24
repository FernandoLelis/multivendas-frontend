import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutoService } from '../../services/produto.service';
import { Produto } from '../../models/produto';
import { Router } from '@angular/router';
import { ProdutoFormComponent } from '../produto-form/produto-form';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-produto-list',
  standalone: true,
  imports: [CommonModule, ProdutoFormComponent],
  templateUrl: './produto-list.html',
  styleUrls: ['./produto-list.css']
})
export class ProdutoList implements OnInit {
  produtos: Produto[] = [];
  mostrarModal: boolean = false;
  produtoParaEditar: Produto | null = null;
  
  // ✅ NOVO: Controle de quais cards estão com a aba de medidas expandida
  medidasExpandidas: Set<number> = new Set<number>();

  constructor(
    private produtoService: ProdutoService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe({
      next: (produtos) => {
        this.produtos = produtos.sort((a, b) => {
          return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
        });
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  // ✅ NOVO MÉTODO: Lógica de expansão das medidas no próprio card
  toggleMedidas(produtoId: number): void {
    if (this.medidasExpandidas.has(produtoId)) {
      this.medidasExpandidas.delete(produtoId);
    } else {
      this.medidasExpandidas.add(produtoId);
    }
  }

  // ✅ NOVO MÉTODO: Verifica se o estoque está abaixo do mínimo (para pintar de vermelho)
  isEstoqueBaixo(produto: Produto): boolean {
    const estoque = produto.quantidadeEstoqueTotal || 0;
    const minimo = produto.estoqueMinimo || 0;
    return estoque < minimo;
  }

  calcularLucroMedio(produto: Produto): number {
    const preco = produto.precoMedioVenda || 0;
    const custo = produto.custoMedio || 0;
    return preco - custo;
  }

  formatarMoeda(valor: number | undefined): string {
    const val = valor || 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  excluirProduto(produto: Produto): void {
    if (!produto.id) { return; }
    
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
      () => {
        this.produtoService.excluirProduto(produto.id!).subscribe({
          next: () => {
            this.modalService.mostrarSucesso('Produto excluído com sucesso!');
            this.carregarProdutos();
          },
          error: (error) => {
            if (this.erroPossuiVendasAssociadas(error)) {
              this.modalService.mostrarAlertaProdutoExclusao();
            } else {
              this.modalService.mostrarErro('Erro ao excluir produto!');
            }
          }
        });
      }
    );
  }

  private erroPossuiVendasAssociadas(error: any): boolean {
    const errorMessage = error?.error?.message || error?.message || '';
    const errorStatus = error?.status;
    const indicadoresVendas = ['vendas', 'Venda', 'foreign key', 'constraint', 'referenced'];
    const possuiIndicador = indicadoresVendas.some(i => errorMessage.toLowerCase().includes(i.toLowerCase()));
    return possuiIndicador || [409, 400].includes(errorStatus);
  }

  editarProduto(produto: Produto): void {
    this.produtoParaEditar = produto;
    this.mostrarModal = true;
  }

  abrirModal(): void {
    this.produtoParaEditar = null;
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.produtoParaEditar = null;
  }

  onProdutoSalvo(): void {
    this.carregarProdutos();
    this.fecharModal();
  }

  formatarData(dataString: string): string {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }
}