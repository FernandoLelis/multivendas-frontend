import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[appBrazilianCurrency]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BrazilianCurrencyDirective),
      multi: true
    }
  ]
})
export class BrazilianCurrencyDirective implements ControlValueAccessor {
  private el: HTMLInputElement;
  private isFocused: boolean = false;

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  // ControlValueAccessor methods
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: any): void {
    if (value !== null && value !== undefined) {
      this.el.value = this.formatToBrazilianCurrency(value);
    } else {
      this.el.value = '';
    }
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Permite digitação livre enquanto está focando
    if (this.isFocused) {
      // Apenas atualiza o model, não formata visualmente durante a digitação
      const numericValue = this.parseBrazilianCurrency(value);
      this.onChange(numericValue);
      return;
    }
    
    // Remove tudo que não é número, ponto ou vírgula
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    // Converte para número (trata vírgula como decimal)
    const numericValue = this.parseBrazilianCurrency(cleanValue);
    
    // Atualiza o valor do model
    this.onChange(numericValue);
    
    // Formata visualmente o input apenas se não estiver focando
    if (!this.isFocused) {
      this.el.value = this.formatToBrazilianCurrency(numericValue);
    }
  }

  @HostListener('focus')
  onFocus(): void {
    this.isFocused = true;
    
    // Ao focar, remove a formatação para facilitar edição
    const numericValue = this.parseBrazilianCurrency(this.el.value);
    this.el.value = numericValue !== null ? 
      numericValue.toFixed(2).replace('.', ',') : '';
  }

  @HostListener('blur')
  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
    
    // Ao sair, formata corretamente
    const currentValue = this.parseBrazilianCurrency(this.el.value);
    this.el.value = this.formatToBrazilianCurrency(currentValue);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Permite navegação com teclas especiais
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Permite apenas números, vírgula, ponto e teclas de controle
    if (!/[\d,\.]|Control|Alt|Shift|Meta/.test(event.key)) {
      event.preventDefault();
    }
  }

  private parseBrazilianCurrency(value: string): number | null {
    if (!value || value === ',') return null;
    
    // Remove pontos de milhar e converte vírgula decimal para ponto
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const numericValue = parseFloat(cleanValue);
    
    return isNaN(numericValue) ? null : numericValue;
  }

  private formatToBrazilianCurrency(value: number | null): string {
    if (value === null || isNaN(value)) return '';
    
    // Formata para o padrão brasileiro: 1.234,56
    const parts = value.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return parts.join(',');
  }
}