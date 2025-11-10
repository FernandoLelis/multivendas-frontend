import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Despesa, CATEGORIAS_DESPESA } from '../../models/despesa';
import { DespesaService } from '../../services/despesa.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-despesa-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './despesa-form.html',
  styleUrls: ['./despesa-form.css']
})
export class DespesaFormComponent implements OnInit {
  @Input() despesa: Despesa | null = null;
  @Output() fecharModal = new EventEmitter<void>();
  @Output() despesaSalva = new EventEmitter<void>();
  
  despesaEdit: Despesa = this.getDespesaVazia();
  categorias: string[] = [...CATEGORIAS_DESPESA];
  novaCategoria: string = '';
  mostrarCampoNovaCategoria: boolean = false;
  modoEdicao: boolean = false;

  constructor(
    private despesaService: DespesaService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  inicializarFormulario(): void {
    if (this.despesa && this.despesa.id) {
      // MODO EDIÇÃO
      this.modoEdicao = true;
      this.despesaEdit = { ...this.despesa };
      
      // Garantir que a data está no formato correto para input[type="date"]
      if (this.despesaEdit.data) {
        this.despesaEdit.data = this.formatarDataParaInput(this.despesaEdit.data);
      }
    } else {
      // MODO NOVA DESPESA
      this.modoEdicao = false;
      this.despesaEdit = this.getDespesaVazia();
    }
  }

  private getDespesaVazia(): Despesa {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return {
      descricao: '',
      valor: 0,
      data: hoje,
      categoria: 'Material de Escritório',
      observacoes: '',
      recorrente: false
    };
  }

  private formatarDataParaInput(data: string): string {
    // Converte de "YYYY-MM-DD" ou qualquer formato para "YYYY-MM-DD"
    if (data.includes('T')) {
      return data.split('T')[0];
    }
    return data;
  }

  // ✅ MÉTODO PARA MUDANÇA DE CATEGORIA
  onCategoriaChange(): void {
    if (this.despesaEdit.categoria === 'nova') {
      this.mostrarCampoNovaCategoria = true;
      this.despesaEdit.categoria = '';
    } else {
      this.mostrarCampoNovaCategoria = false;
      this.novaCategoria = '';
    }
  }

  // ✅ MÉTODO PARA ADICIONAR NOVA CATEGORIA
  adicionarCategoria(): void {
    if (!this.novaCategoria || !this.novaCategoria.trim()) {
      this.modalService.mostrarErro('Por favor, digite um nome para a nova categoria.');
      return;
    }

    const categoriaFormatada = this.novaCategoria.trim();
    
    // Validação de comprimento mínimo
    if (categoriaFormatada.length < 2) {
      this.modalService.mostrarErro('O nome da categoria deve ter pelo menos 2 caracteres.');
      return;
    }

    // Validação de comprimento máximo
    if (categoriaFormatada.length > 30) {
      this.modalService.mostrarErro('O nome da categoria deve ter no máximo 30 caracteres.');
      return;
    }

    if (!this.categorias.includes(categoriaFormatada)) {
      this.categorias.push(categoriaFormatada);
      this.despesaEdit.categoria = categoriaFormatada;
      this.mostrarCampoNovaCategoria = false;
      this.novaCategoria = '';
      
      this.modalService.mostrarSucesso(`Categoria "${categoriaFormatada}" adicionada com sucesso!`);
    } else {
      this.modalService.mostrarErro('Esta categoria já existe!');
    }
  }

  fechar(): void {
    this.fecharModal.emit();
  }

  salvarDespesa(): void {
    console.log('🔍 DEBUG - Salvando despesa:', this.despesaEdit);

    // VALIDAÇÕES
    if (!this.despesaEdit.descricao.trim()) {
      this.modalService.mostrarErro('Descrição é obrigatória');
      return;
    }

    if (this.despesaEdit.valor <= 0) {
      this.modalService.mostrarErro('Valor deve ser maior que zero');
      return;
    }

    if (!this.despesaEdit.data) {
      this.modalService.mostrarErro('Data é obrigatória');
      return;
    }

    if (!this.despesaEdit.categoria || this.despesaEdit.categoria.trim() === '') {
      this.modalService.mostrarErro('Categoria é obrigatória');
      return;
    }

    if (this.modoEdicao && this.despesaEdit.id) {
      // ATUALIZAR despesa existente
      this.despesaService.atualizarDespesa(this.despesaEdit.id, this.despesaEdit).subscribe({
        next: (despesaSalva) => {
          console.log('✅ Despesa atualizada:', despesaSalva);
          this.modalService.mostrarSucesso('Despesa atualizada com sucesso!');
          this.despesaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro ao atualizar despesa:', error);
          this.modalService.mostrarErro('Erro ao atualizar despesa');
        }
      });
    } else {
      // CRIAR nova despesa
      this.despesaService.criarDespesa(this.despesaEdit).subscribe({
        next: (despesaSalva) => {
          console.log('✅ Despesa criada:', despesaSalva);
          this.modalService.mostrarSucesso('Despesa criada com sucesso!');
          this.despesaSalva.emit();
          this.fechar();
        },
        error: (error) => {
          console.error('❌ Erro ao criar despesa:', error);
          this.modalService.mostrarErro('Erro ao criar despesa');
        }
      });
    }
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Despesa' : 'Nova Despesa';
  }
}