import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Despesa } from '../../models/despesa';
import { DespesaService } from '../../services/despesa.service';
import { ModalService } from '../../services/modal.service';
import { DespesaFormComponent } from '../despesa-form/despesa-form';

@Component({
  selector: 'app-despesa-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DespesaFormComponent],
  templateUrl: './despesa-list.html',
  styleUrls: ['./despesa-list.css']
})
export class DespesaListComponent implements OnInit {
  despesas: Despesa[] = [];
  despesaSelecionada: Despesa | null = null;
  mostrarFormDespesa: boolean = false;
  categorias: string[] = [];
  filtroCategoria: string = '';

  constructor(
    private despesaService: DespesaService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.carregarDespesas();
    this.carregarCategorias();
  }

  carregarDespesas(): void {
    this.despesaService.getDespesas().subscribe({
      next: (despesas) => {
        this.despesas = despesas;
      },
      error: (error) => {
        console.error('Erro ao carregar despesas:', error);
        // ✅ REMOVIDO: Modal de erro desnecessário - mantém apenas o log
        // As outras páginas não mostram modal quando não há dados
      }
    });
  }

  carregarCategorias(): void {
    this.despesaService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    });
  }

  novaDespesa(): void {
    this.despesaSelecionada = null;
    this.mostrarFormDespesa = true;
  }

  editarDespesa(despesa: Despesa): void {
    this.despesaSelecionada = { ...despesa };
    this.mostrarFormDespesa = true;
  }

  excluirDespesa(despesa: Despesa): void {
    this.modalService.confirmarExclusao(
      `Tem certeza que deseja excluir a despesa "${despesa.descricao}"?`,
      () => {
        if (despesa.id) {
          this.despesaService.excluirDespesa(despesa.id).subscribe({
            next: () => {
              this.carregarDespesas();
              this.modalService.mostrarSucesso('Despesa excluída com sucesso!');
            },
            error: (error) => {
              console.error('Erro ao excluir despesa:', error);
              this.modalService.mostrarErro('Erro ao excluir despesa');
            }
          });
        }
      }
    );
  }

  fecharFormDespesa(): void {
    this.mostrarFormDespesa = false;
    this.despesaSelecionada = null;
  }

  onDespesaSalva(): void {
    this.carregarDespesas();
    this.fecharFormDespesa();
  }

  aplicarFiltro(): void {
    if (this.filtroCategoria) {
      this.despesaService.getDespesasPorCategoria(this.filtroCategoria).subscribe({
        next: (despesas) => {
          this.despesas = despesas;
        },
        error: (error) => {
          console.error('Erro ao filtrar despesas:', error);
        }
      });
    } else {
      this.carregarDespesas();
    }
  }

  limparFiltro(): void {
    this.filtroCategoria = '';
    this.carregarDespesas();
  }

  get despesasFiltradas(): Despesa[] {
    if (!this.filtroCategoria) {
      return this.despesas;
    }
    return this.despesas.filter(despesa => 
      despesa.categoria === this.filtroCategoria
    );
  }

  get totalDespesas(): number {
    return this.despesas.reduce((total, despesa) => total + despesa.valor, 0);
  }

  getClasseCategoria(categoria: string): string {
    const classes: { [key: string]: string } = {
      'Material de Escritório': 'categoria-material',
      'Embalagem': 'categoria-embalagem',
      'Manutenção': 'categoria-manutencao',
      'Marketing': 'categoria-marketing',
      'Transporte': 'categoria-transporte',
      'Outros': 'categoria-outros'
    };
    return classes[categoria] || 'categoria-default';
  }
}