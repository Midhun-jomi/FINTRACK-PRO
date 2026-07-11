import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
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
          <mat-icon class="auth-logo-icon">lock</mat-icon>
          <h1>NEW PASSWORD</h1>
          <p class="auth-tagline">UPDATE YOUR CREDENTIALS</p>
        </div>

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="password" class="form-label">New Password</label>
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
              Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </div>
          </div>

          <button type="submit" class="max-btn auth-submit-btn secondary" [disabled]="resetForm.invalid || isLoading()">
            <mat-progress-spinner *ngIf="isLoading()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
            <span>{{ isLoading() ? 'UPDATING PASSWORD...' : 'RESET PASSWORD' }}</span>
          </button>
        </form>
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
        color: var(--color-secondary);
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

    .form-label {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .pass-toggle-btn {
      position: absolute;
      right: 12px;
      top: 38px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
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
      line-height: 1.3;
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
  `]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|])[A-Za-z\d\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|]{6,}$/;

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.pattern(this.passwordRegex)]]
  });

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  email = '';
  token = '';

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
    this.token = this.route.snapshot.queryParams['token'] || '';

    if (!this.email || !this.token) {
      this.notificationService.showError('Invalid password reset URL request.');
      this.router.navigate(['/auth/login']);
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    this.isLoading.set(true);
    this.authService.resetPassword(this.email, this.token, this.resetForm.value.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.notificationService.showSuccess(res.message || 'Password reset successfully! You can now sign in.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to reset password.');
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update(val => !val);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }
}
