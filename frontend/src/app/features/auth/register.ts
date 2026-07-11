import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-container">
      <div class="max-card auth-card primary-glow">
        <div class="auth-header">
          <mat-icon class="auth-logo-icon">payments</mat-icon>
          <h1>JOIN FINTRACK</h1>
          <p class="auth-tagline">MANAGE YOUR MONIES</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input 
              type="text" 
              id="username" 
              formControlName="username" 
              class="max-input" 
              placeholder="e.g. money_maker"
              [class.error-border]="isFieldInvalid('username')" />
            <div class="error-msg" *ngIf="isFieldInvalid('username')">
              Username must be at least 3 characters.
            </div>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email" 
              class="max-input" 
              placeholder="e.g. you&#64;example.com"
              [class.error-border]="isFieldInvalid('email')" />
            <div class="error-msg" *ngIf="isFieldInvalid('email')">
              Please enter a valid email address.
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input 
              [type]="showPassword() ? 'text' : 'password'" 
              id="password" 
              formControlName="password" 
              class="max-input" 
              placeholder="••••••••"
              [class.error-border]="isFieldInvalid('password')" />
            <button type="button" class="pass-toggle-btn" (click)="togglePassword()">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <div class="error-msg" *ngIf="isFieldInvalid('password')">
              Password must be at least 6 chars and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </div>
          </div>

          <div class="form-group">
            <label for="currency" class="form-label">Preferred Currency</label>
            <select id="currency" formControlName="preferredCurrency" class="max-input max-select">
              <option value="USD">USD ($) - Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="INR">INR (₹) - Rupee</option>
              <option value="GBP">GBP (£) - Pound</option>
              <option value="JPY">JPY (¥) - Yen</option>
            </select>
          </div>

          <button type="submit" class="max-btn auth-submit-btn secondary" [disabled]="registerForm.invalid || isLoading()">
            <mat-progress-spinner *ngIf="isLoading()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
            <span>{{ isLoading() ? 'CREATING ACCOUNT...' : 'REGISTER PLATFORM' }}</span>
          </button>
        </form>

        <div class="auth-footer">
          <span>Already have an account? </span>
          <a routerLink="/auth/login" class="auth-link">Sign In</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      width: 100%;
      background: radial-gradient(circle at top right, var(--color-primary) 0%, transparent 40%),
                  radial-gradient(circle at bottom left, var(--color-secondary) 0%, transparent 40%),
                  var(--bg-primary);
      padding: 24px;
      overflow-y: auto;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 32px;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      box-shadow: 8px 8px 0px var(--shadow-color);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 24px;
      
      .auth-logo-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: var(--color-secondary);
        margin-bottom: 12px;
      }
      
      h1 {
        font-size: 32px;
        letter-spacing: -1px;
        line-height: 1;
        margin-bottom: 4px;
      }
      
      .auth-tagline {
        font-family: var(--font-family-body);
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 2px;
        color: var(--text-secondary);
        text-transform: uppercase;
        opacity: 0.8;
      }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }

    .form-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .max-select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 40px;
      cursor: pointer;
    }

    .pass-toggle-btn {
      position: absolute;
      right: 12px;
      top: 32px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      
      &:hover {
        color: var(--text-primary);
      }
    }

    .error-border {
      border-color: var(--color-error) !important;
      box-shadow: 3px 3px 0px var(--color-error) !important;
    }

    .error-msg {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-error);
      margin-top: 1px;
      line-height: 1.3;
    }

    .auth-submit-btn {
      width: 100%;
      justify-content: center;
      padding: 14px !important;
      font-size: 16px;
      margin-top: 10px;
      
      .spinner {
        margin-right: 8px;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      
      .auth-link {
        font-weight: 700;
        color: var(--color-primary);
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Matches 6+ chars, 1 upper, 1 lower, 1 number, 1 special char
  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|])[A-Za-z\d\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|]{6,}$/;

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
    preferredCurrency: ['INR', [Validators.required]]
  });

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.notificationService.showSuccess(res.message || 'Registration successful! Verification email sent.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.showError(err.error?.message || 'Registration failed. Try again.');
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update(val => !val);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }
}
