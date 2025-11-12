import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

// Interfaces para as respostas da API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nome: string;
}

export interface User {
  id: number;
  email: string;
  nome: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ErrorResponse {
  error: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl: string;
  private tokenKey = 'multivendas_token';
  private userKey = 'multivendas_user';

  // ✅ CORREÇÃO: Inicializar sem chamar métodos no declaration
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject('API_URL') private apiBaseUrl: string
  ) {
    this.apiUrl = `${this.apiBaseUrl}/api/auth`;
    
    // ✅ CORREÇÃO: Inicializar DEPOIS do constructor
    this.initializeAuthState();
    
    console.log('🔄 AuthService constructor chamado');
    this.debugAuthState();
  }

  // ✅ NOVO: Método para inicializar estado após constructor
  private initializeAuthState(): void {
    const hasToken = this.hasToken();
    const storedUser = this.getStoredUser();
    
    this.isAuthenticatedSubject.next(hasToken);
    this.currentUserSubject.next(storedUser);
  }

  // 🔐 LOGIN
  login(loginRequest: LoginRequest): Observable<AuthResponse> {
    console.log('🔐 LOGIN - Iniciando login para:', loginRequest.email);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(
        tap(response => {
          console.log('✅ LOGIN - Resposta recebida:', response);
          this.setAuthData(response.token, response.user);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(response.user);
          this.debugAuthState();
        })
      );
  }

  // 📝 REGISTRO
  register(registerRequest: RegisterRequest): Observable<AuthResponse> {
    console.log('📝 REGISTER - Iniciando registro para:', registerRequest.email);
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, registerRequest)
      .pipe(
        tap(response => {
          console.log('✅ REGISTER - Resposta recebida:', response);
          this.setAuthData(response.token, response.user);
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(response.user);
          this.debugAuthState();
        })
      );
  }

  // 🚪 LOGOUT
  logout(): void {
    console.log('🚪 LOGOUT - Removendo dados de autenticação');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.debugAuthState();
  }

  // 🔍 OBTER TOKEN
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    console.log('🔍 GET TOKEN - Debug:', {
      tokenKey: this.tokenKey,
      tokenExists: !!token,
      token: token ? token.substring(0, 20) + '...' : null,
      allLocalStorageKeys: Object.keys(localStorage),
      multivendasToken: localStorage.getItem('multivendas_token')
    });
    return token;
  }

  // 👤 OBTER USUÁRIO ATUAL
  getCurrentUser(): User | null {
    const user = this.getStoredUser();
    console.log('👤 GET CURRENT USER:', user);
    return user;
  }

  // ✅ VERIFICAR SE ESTÁ AUTENTICADO
  isLoggedIn(): boolean {
    const isLoggedIn = this.hasToken();
    console.log('✅ IS LOGGED IN:', isLoggedIn);
    return isLoggedIn;
  }

  // 🛡️ MÉTODOS PRIVADOS
  private setAuthData(token: string, user: User): void {
    console.log('💾 SET AUTH DATA - Salvando token e usuário');
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private hasToken(): boolean {
    const hasToken = !!this.getToken();
    console.log('🛡️ HAS TOKEN:', hasToken);
    return hasToken;
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('👤 GET STORED USER:', user);
    return user;
  }

  // 🔄 ATUALIZAR DADOS DO USUÁRIO (para futuro uso)
  updateUser(user: User): void {
    console.log('🔄 UPDATE USER:', user);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // 🐛 MÉTODO DE DEBUG
  private debugAuthState(): void {
    console.log('🐛 DEBUG AUTH STATE:', {
      tokenKey: this.tokenKey,
      userKey: this.userKey,
      tokenInLocalStorage: localStorage.getItem(this.tokenKey),
      userInLocalStorage: localStorage.getItem(this.userKey),
      allLocalStorage: Object.keys(localStorage).map(key => ({
        key,
        value: key.includes('token') ? '***' : localStorage.getItem(key)
      }))
    });
  }

  // 🎯 MÉTODO EXTRA PARA DEBUG MANUAL
  manualDebug(): void {
    console.log('🎯 MANUAL DEBUG - AuthService State:');
    this.debugAuthState();
    console.log('🎯 getToken() result:', this.getToken());
    console.log('🎯 isLoggedIn() result:', this.isLoggedIn());
  }
}