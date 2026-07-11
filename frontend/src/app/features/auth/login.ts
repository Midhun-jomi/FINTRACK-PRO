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
  selector: 'app-login',
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
      <div class="max-card auth-card secondary-glow">
        <div class="auth-header">
          <mat-icon class="auth-logo-icon">payments</mat-icon>
          <h1>FINTRACK PRO</h1>
          <p class="auth-tagline">CHASE YOUR CASH</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email" 
              class="max-input" 
              placeholder="e.g. user&#64;fintrack.com"
              [class.error-border]="isFieldInvalid('email')" />
            <div class="error-msg" *ngIf="isFieldInvalid('email')">
              Please enter a valid email address.
            </div>
          </div>

          <div class="form-group">
            <div class="label-wrapper">
              <label for="password" class="form-label">Password</label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot Password?</a>
            </div>
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
              Password is required.
            </div>
          </div>

          <button type="submit" class="max-btn auth-submit-btn" [disabled]="loginForm.invalid || isLoading()">
            <mat-progress-spinner *ngIf="isLoading()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
            <span>{{ isLoading() ? 'LOGGING IN...' : 'SECURE SIGN IN' }}</span>
          </button>
        </form>

        <div class="auth-footer">
          <span>New to FinTrack? </span>
          <a routerLink="/auth/register" class="auth-link">Create an Account</a>
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
      padding: 40px 32px;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      box-shadow: 8px 8px 0px var(--shadow-color);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 32px;
      
      .auth-logo-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: var(--color-primary);
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
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }

    .label-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .forgot-link {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-primary);
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .form-label {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pass-toggle-btn {
      position: absolute;
      right: 12px;
      top: 38px;
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
      font-size: 12px;
      font-weight: 700;
      color: var(--color-error);
      margin-top: 2px;
    }

    .auth-submit-btn {
      width: 100%;
      justify-content: center;
      padding: 16px !important;
      font-size: 16px;
      margin-top: 10px;
      
      .spinner {
        margin-right: 8px;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      
      .auth-link {
        font-weight: 700;
        color: var(--color-secondary);
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.showSuccess('Welcome back to FinTrack Pro!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.showError(err.error?.message || 'Login failed. Invalid email or password.');
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update(val => !val);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }
}
