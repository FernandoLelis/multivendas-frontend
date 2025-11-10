import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginRequest, AuthResponse, ErrorResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // 🔐 SUBMETER LOGIN
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginRequest: LoginRequest = this.loginForm.value;

      this.authService.login(loginRequest).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;
          console.log('✅ Login realizado com sucesso:', response.user.nome);
          this.router.navigate(['/dashboard']);
        },
        error: (error: { error: ErrorResponse }) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'Erro ao fazer login. Tente novamente.';
          console.error('❌ Erro no login:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  // 🎯 MARCAR TODOS OS CAMPOS COMO TOUCHED PARA MOSTRAR ERROS
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  // ✅ GETTERS PARA FACILITAR ACESSO AOS CAMPOS NO TEMPLATE
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}