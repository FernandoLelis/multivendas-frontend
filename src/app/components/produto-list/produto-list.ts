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
        // ✅ ORDENAR POR DATA DE CRIAÇÃO - MAIS RECENTES PRIMEIRO
        this.produtos = produtos.sort((a, b) => {
          return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
        });
        
        console.log('🔍 DEBUG - Produtos ordenados:', this.produtos);
        
        // ✅ DEBUG ESPECÍFICO DO ESTOQUE
        this.produtos.forEach(produto => {
          console.log(`📦 ${produto.nome}: Estoque = ${produto.quantidadeEstoqueTotal}`);
        });
      },
      error: (error) => {
        console.error('❌ Erro ao carregar produtos:', error);
      }
    });
  }

  // ✅ CORREÇÃO: Usa quantidadeEstoque que vem do backend
  calcularEstoqueTotal(produto: Produto): number {
    const estoque = produto.quantidadeEstoqueTotal || 0;
    console.log(`🔍 DEBUG ESTOQUE - ${produto.nome}: ${estoque} unidades`);
    return estoque;
  }

  excluirProduto(produto: Produto): void {
    if (!produto.id) {
      console.error('ID do produto não definido');
      return;
    }
    
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
      () => {
        this.produtoService.excluirProduto(produto.id!).subscribe({
          next: () => {
            this.modalService.mostrarSucesso('Produto excluído com sucesso!');
            this.carregarProdutos();
          },
          error: (error) => {
            console.error('Erro ao excluir produto:', error);
            
            // ✅ DETECTAR SE É ERRO DE VENDAS ASSOCIADAS
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

  // ✅ NOVO MÉTODO: Detectar erro de vendas associadas
  private erroPossuiVendasAssociadas(error: any): boolean {
    // Verificar diferentes padrões de erro que indicam vendas associadas
    const errorMessage = error?.error?.message || error?.message || '';
    const errorStatus = error?.status;
    
    console.log('🔍 DEBUG - Analisando erro de exclusão:', {
      errorMessage,
      errorStatus,
      fullError: error
    });

    // Padrões que indicam que o produto tem vendas associadas
    const indicadoresVendas = [
      'vendas', 'Venda', 'venda', 'VENDAS',
      'foreign key', 'chave estrangeira',
      'constraint', 'restrição',
      'referenced', 'referenciado',
      'cannot delete', 'não pode excluir',
      'associated', 'associado'
    ];

    const possuiIndicador = indicadoresVendas.some(indicador => 
      errorMessage.toLowerCase().includes(indicador.toLowerCase())
    );

    // Status HTTP que podem indicar conflito (409) ou bad request com mensagem específica (400)
    const statusRelevantes = [409, 400];

    return possuiIndicador || statusRelevantes.includes(errorStatus);
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

  navegarParaNovoProduto(): void {
    this.router.navigate(['/produtos/novo']);
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