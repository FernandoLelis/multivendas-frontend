import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendaService } from '../../services/venda.service';
import { ModalService } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';

@Component({
  selector: 'app-venda-cancelar-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BrazilianCurrencyPipe],
  templateUrl: './venda-cancelar-form.html',
  styleUrls: ['./venda-cancelar-form.css']
})
export class VendaCancelarFormComponent {
  @Input() venda: any;
  @Output() fechar = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  motivo: string = '';
  custoRetorno: number = 0;
  retornouEstoque: boolean = true;
  carregando: boolean = false;

  constructor(
    private vendaService: VendaService,
    private modalService: ModalService
  ) {}

  cancelarVenda(): void {
    if (!this.motivo.trim()) {
      this.modalService.mostrarErro('Informe o motivo do cancelamento.');
      return;
    }
    if (this.custoRetorno < 0) {
      this.modalService.mostrarErro('Custo de retorno não pode ser negativo.');
      return;
    }

    this.carregando = true;
    const dados = {
      motivo: this.motivo,
      custoRetorno: this.custoRetorno,
      retornouEstoque: this.retornouEstoque
    };

    this.vendaService.cancelarVenda(this.venda.id, dados).subscribe({
      next: () => {
        this.carregando = false;
        this.modalService.mostrarSucesso('Venda cancelada com sucesso!');
        this.cancelado.emit();
        this.fechar.emit();
      },
      error: (err) => {
        this.carregando = false;
        this.modalService.mostrarErro('Erro ao cancelar venda: ' + err.message);
      }
    });
  }

  fecharModal(): void {
    this.fechar.emit();
  }
}