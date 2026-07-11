import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-container">
      <div class="max-card auth-card primary-glow">
        <div class="auth-header">
          <mat-icon class="auth-logo-icon">verified_user</mat-icon>
          <h1>EMAIL VERIFICATION</h1>
          <p class="auth-tagline">FINTRACK VALIDATION</p>
        </div>

        <div *ngIf="status() === 'loading'" class="status-box">
          <mat-progress-spinner mode="indeterminate" diameter="40" class="spinner"></mat-progress-spinner>
          <p>Verifying credentials. Please wait...</p>
        </div>

        <div *ngIf="status() === 'success'" class="status-box success">
          <mat-icon class="status-icon">check_circle</mat-icon>
          <h2>Verification Successful!</h2>
          <p>Your email address has been verified. You can now log into your account.</p>
          <button mat-button routerLink="/auth/login" class="max-btn verification-btn primary">Go to Log In</button>
        </div>

        <div *ngIf="status() === 'error'" class="status-box error">
          <mat-icon class="status-icon">error</mat-icon>
          <h2>Verification Failed</h2>
          <p>The verification link is invalid, expired, or has already been used.</p>
          <button mat-button routerLink="/auth/login" class="max-btn verification-btn secondary">Back to Log In</button>
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
      max-width: 460px;
      padding: 40px 32px;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      box-shadow: 8px 8px 0px var(--shadow-color);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 30px;
      
      .auth-logo-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: var(--color-primary);
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

    .status-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 10px 0;
      gap: 16px;
      
      p {
        font-family: var(--font-family-body);
        font-weight: 700;
        color: var(--text-primary);
      }
      
      .spinner {
        margin-bottom: 10px;
      }
      
      .status-icon {
        font-size: 56px;
        height: 56px;
        width: 56px;
      }
      
      h2 {
        font-size: 22px;
        margin-bottom: 4px;
      }

      &.success .status-icon {
        color: var(--color-success);
      }

      &.error .status-icon {
        color: var(--color-error);
      }
    }

    .verification-btn {
      width: 100%;
      justify-content: center;
      margin-top: 10px;
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  status = signal<'loading' | 'success' | 'error'>('loading');

  ngOnInit(): void {
    const email = this.route.snapshot.queryParams['email'] || '';
    const token = this.route.snapshot.queryParams['token'] || '';

    if (!email || !token) {
      this.status.set('error');
      return;
    }

    this.authService.verifyEmail(email, token).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error')
    });
  }
}
