import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../services/modal.service';
import { BrazilianCurrencyPipe } from '../../pipes/brazilian-currency.pipe';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, BrazilianCurrencyPipe],
  templateUrl: './modal.html',
  styleUrls: ['./modal.css']
})
export class ModalComponent {
  config: ModalConfig | null = null;

  constructor(private modalService: ModalService) {
    this.modalService.modal$.subscribe(config => {
      this.config = config;
    });
  }

  fechar(): void {
    this.modalService.fecharModal();
  }

  confirmar(): void {
    if (this.config?.onConfirmar) {
      this.config.onConfirmar();
    }
    this.fechar();
  }

  cancelar(): void {
    if (this.config?.onCancelar) {
      this.config.onCancelar();
    }
    this.fechar();
  }

  getClasseTitulo(): string {
    switch (this.config?.tipo) {
      case 'sucesso': return 'titulo-sucesso';
      case 'erro': return 'titulo-erro';
      case 'confirmacao': return 'titulo-confirmacao';
      default: return 'titulo-info';
    }
  }

  getClasseBotaoPrimario(): string {
    switch (this.config?.tipo) {
      case 'confirmacao': return 'btn-perigo';
      case 'erro': return 'btn-erro';
      default: return '';
    }
  }

  getClasseIcone(): string {
    return `icone-modal icone-${this.config?.tipo}`;
  }

  getIcone(): string {
    switch (this.config?.tipo) {
      case 'sucesso': return '✓';
      case 'erro': return '✕';
      case 'confirmacao': return '⚠';
      default: return 'ℹ';
    }
  }

  formatarROI(roi: number): string {
    if (roi === undefined || roi === null) return '0,00%';
    return roi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
}