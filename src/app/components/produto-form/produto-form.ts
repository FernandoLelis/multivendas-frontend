import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Produto } from '../../models/produto';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-produto-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produto-form.html',
  styleUrls: ['./produto-form.css']
})
export class ProdutoFormComponent implements OnChanges {
  @Input() produto: Produto | null = null;
  @Output() fecharModal = new EventEmitter<void>();
  @Output() produtoSalvo = new EventEmitter<void>();
  
  produtoEdit: Produto = this.getProdutoVazio();

  constructor(private produtoService: ProdutoService) {}

  ngOnChanges(): void {
    if (this.produto) {
      this.produtoEdit = { ...this.produto };
    } else {
      this.produtoEdit = this.getProdutoVazio();
    }
  }

  private getProdutoVazio(): Produto {
    return {
      sku: '',
      asin: '',
      nome: '',
      descricao: '',
      dataCriacao: new Date().toISOString(),
      estoqueMinimo: 5,
      quantidadeEstoqueTotal: 0,
      // ✅ INICIALIZANDO NOVOS CAMPOS COMO VAZIOS
      imagemUrl: '',
      peso: undefined,
      comprimento: undefined,
      largura: undefined,
      altura: undefined
    };
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarProduto(): void {
    if (this.produtoEdit.id) {
      this.produtoService.atualizarProduto(this.produtoEdit.id, this.produtoEdit).subscribe({
        next: () => {
          this.produtoSalvo.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('Erro ao atualizar produto:', error);
          alert('Erro ao atualizar produto!');
        }
      });
    } else {
      this.produtoService.criarProduto(this.produtoEdit).subscribe({
        next: () => {
          this.produtoSalvo.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('Erro ao salvar produto:', error);
          alert('Erro ao salvar produto!');
        }
      });
    }
  }
}