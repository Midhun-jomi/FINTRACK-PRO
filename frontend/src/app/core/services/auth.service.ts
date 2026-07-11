import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { AuthResponse, LoginRequest, RegisterRequest, ChangePasswordRequest, UpdateProfileRequest } from '../models/models';
import { Observable, tap, catchError, throwError, BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  // Angular signal to track the authenticated user state
  currentUser = signal<AuthResponse | null>(null);

  // Derived signals for auth status and admin rights
  isAuthenticated = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');

  constructor() {
    this.loadUserFromLocalStorage();
  }

  private loadUserFromLocalStorage(): void {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    let preferredCurrency = localStorage.getItem('preferredCurrency');
    const profilePictureUrl = localStorage.getItem('profilePictureUrl') || undefined;

    if (preferredCurrency === 'USD') {
      preferredCurrency = 'INR';
      localStorage.setItem('preferredCurrency', 'INR');
    }

    if (token && username && email && role && preferredCurrency) {
      this.currentUser.set({
        token,
        refreshToken: localStorage.getItem('refreshToken') || '',
        username,
        email,
        role,
        preferredCurrency,
        profilePictureUrl
      });
    }
  }

  register(request: RegisterRequest): Observable<any> {
    return this.apiService.post('auth/register', request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('auth/login', request).pipe(
      tap(response => this.setSession(response))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const rToken = localStorage.getItem('refreshToken');
    if (!rToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    return this.apiService.post<AuthResponse>('auth/refresh', { token: rToken }).pipe(
      tap(response => this.setSession(response)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  changePassword(request: ChangePasswordRequest): Observable<any> {
    return this.apiService.post('auth/change-password', request);
  }

  updateProfile(request: UpdateProfileRequest): Observable<AuthResponse> {
    return this.apiService.put<AuthResponse>('auth/profile', request).pipe(
      tap(response => {
        // Re-save session with updated details (username/currency)
        this.setSession(response);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.apiService.post('auth/forgot-password', { email });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<any> {
    return this.apiService.post('auth/reset-password', { email, token, newPassword });
  }

  verifyEmail(email: string, token: string): Observable<any> {
    return this.apiService.get(`auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
  }

  getToken(): string | null {
    return this.currentUser()?.token || localStorage.getItem('token');
  }

  private setSession(auth: AuthResponse): void {
    if (auth.preferredCurrency === 'USD') {
      auth.preferredCurrency = 'INR';
    }
    localStorage.setItem('token', auth.token);
    if (auth.refreshToken) {
      localStorage.setItem('refreshToken', auth.refreshToken);
    }
    localStorage.setItem('username', auth.username);
    localStorage.setItem('email', auth.email);
    localStorage.setItem('role', auth.role);
    localStorage.setItem('preferredCurrency', auth.preferredCurrency);
    if (auth.profilePictureUrl) {
      localStorage.setItem('profilePictureUrl', auth.profilePictureUrl);
    } else {
      localStorage.removeItem('profilePictureUrl');
    }

    this.currentUser.set(auth);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('preferredCurrency');
    localStorage.removeItem('profilePictureUrl');

    this.currentUser.set(null);
  }
}
