import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-forgot-password',
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
      <div class="max-card auth-card success-glow">
        <div class="auth-header">
          <mat-icon class="auth-logo-icon">lock_open</mat-icon>
          <h1>RECOVER PASSWORD</h1>
          <p class="auth-tagline">RESET YOUR KEY</p>
        </div>

        <div *ngIf="emailSent()" class="success-message-box">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <p>An email has been sent! Check the console or logs to retrieve your password reset URL.</p>
        </div>

        <form *ngIf="!emailSent()" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
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

          <button type="submit" class="max-btn auth-submit-btn accent" [disabled]="forgotForm.invalid || isLoading()">
            <mat-progress-spinner *ngIf="isLoading()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
            <span>{{ isLoading() ? 'SENDING RESET LINK...' : 'GET PASSWORD LINK' }}</span>
          </button>
        </form>

        <div class="auth-footer">
          <a routerLink="/auth/login" class="auth-link">Back to Sign In</a>
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
      margin-bottom: 24px;
      
      .auth-logo-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: var(--color-success);
        margin-bottom: 12px;
      }
      
      h1 {
        font-size: 26px;
        letter-spacing: -1px;
        line-height: 1.1;
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

    .success-message-box {
      border: 3px solid var(--border-color);
      border-radius: 8px;
      background-color: rgba(57, 255, 20, 0.05);
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
      
      .success-icon {
        color: var(--color-success);
        font-size: 40px;
        height: 40px;
        width: 40px;
        margin-bottom: 10px;
      }
      
      p {
        font-family: var(--font-family-body);
        font-weight: 700;
        color: var(--text-primary);
        font-size: 14px;
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
    }

    .form-label {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
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
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal<boolean>(false);
  emailSent = signal<boolean>(false);

  onSubmit(): void {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.emailSent.set(true);
        this.notificationService.showSuccess('Reset link generated!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to submit reset request.');
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }
}
