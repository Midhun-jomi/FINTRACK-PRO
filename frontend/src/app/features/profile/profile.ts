import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthResponse } from '../../core/models/models';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="profile-container">
      
      <div class="profile-layout max-grid">
        
        <!-- Left: Edit Profile Details Card -->
        <div class="max-card profile-card">
          <div class="card-header">
            <mat-icon class="card-icon">account_circle</mat-icon>
            <h3>Account Profile Preferences</h3>
          </div>
          
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="profile-form">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="text" class="max-input disabled-input" [value]="currentUser()?.email" readonly />
              <span class="input-caption">Email address cannot be changed.</span>
            </div>

            <div class="form-group">
              <label for="username" class="form-label">Username</label>
              <input 
                type="text" 
                id="username" 
                formControlName="username" 
                class="max-input" 
                placeholder="e.g. cash_tracker" 
                [class.error-border]="isFieldInvalid(profileForm, 'username')" />
              <div class="error-msg" *ngIf="isFieldInvalid(profileForm, 'username')">
                Username is required and must be at least 3 characters.
              </div>
            </div>

            <div class="form-group">
              <label for="preferredCurrency" class="form-label">Preferred Currency</label>
              <select id="preferredCurrency" formControlName="preferredCurrency" class="max-input max-select">
                <option value="USD">USD ($) - Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="INR">INR (₹) - Rupee</option>
                <option value="GBP">GBP (£) - Pound</option>
                <option value="JPY">JPY (¥) - Yen</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Profile Avatar</label>
              <div class="avatar-upload-section">
                <div class="avatar-preview-container">
                  <img 
                    *ngIf="profileForm.get('profilePictureUrl')?.value; else defaultIcon"
                    [src]="profileForm.get('profilePictureUrl')?.value" 
                    alt="Profile Avatar" 
                    class="avatar-preview" />
                  <ng-template #defaultIcon>
                    <div class="avatar-fallback">
                      <mat-icon>account_circle</mat-icon>
                    </div>
                  </ng-template>
                  <div class="avatar-overlay-spinner" *ngIf="isUploadingAvatar()">
                    <mat-progress-spinner mode="indeterminate" diameter="30"></mat-progress-spinner>
                  </div>
                </div>
                <div class="avatar-actions">
                  <label class="max-btn success file-upload-label">
                    <mat-icon>cloud_upload</mat-icon>
                    <span>Upload Image</span>
                    <input type="file" (change)="onAvatarSelected($event)" accept="image/*" style="display: none;" />
                  </label>
                  <button type="button" class="max-btn flat py-1" *ngIf="profileForm.get('profilePictureUrl')?.value" (click)="removeAvatar()">
                    <mat-icon>delete</mat-icon>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" class="max-btn primary" [disabled]="profileForm.invalid || isSavingProfile()">
              <mat-progress-spinner *ngIf="isSavingProfile()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
              <span>{{ isSavingProfile() ? 'SAVING CHANGES...' : 'SAVE SETTINGS' }}</span>
            </button>
          </form>
        </div>

        <!-- Right: Change Password Security Card -->
        <div class="max-card profile-card">
          <div class="card-header">
            <mat-icon class="card-icon" style="color: var(--color-secondary);">shield</mat-icon>
            <h3>Security & Password Control</h3>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="profile-form">
            <div class="form-group">
              <label for="currentPassword" class="form-label">Current Password</label>
              <input 
                type="password" 
                id="currentPassword" 
                formControlName="currentPassword" 
                class="max-input" 
                placeholder="••••••••" 
                [class.error-border]="isFieldInvalid(passwordForm, 'currentPassword')" />
              <div class="error-msg" *ngIf="isFieldInvalid(passwordForm, 'currentPassword')">
                Current password is required.
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword" class="form-label">New Password</label>
              <input 
                type="password" 
                id="newPassword" 
                formControlName="newPassword" 
                class="max-input" 
                placeholder="••••••••" 
                [class.error-border]="isFieldInvalid(passwordForm, 'newPassword')" />
              <div class="error-msg" *ngIf="isFieldInvalid(passwordForm, 'newPassword')">
                Password must match complexity rules (6+ chars, upper, lower, number, special).
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirm New Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                formControlName="confirmPassword" 
                class="max-input" 
                placeholder="••••••••" 
                [class.error-border]="isFieldInvalid(passwordForm, 'confirmPassword') || passwordForm.errors?.['mismatch']" />
              <div class="error-msg" *ngIf="passwordForm.errors?.['mismatch'] && passwordForm.get('confirmPassword')?.touched">
                Passwords do not match.
              </div>
            </div>

            <button type="submit" class="max-btn secondary" [disabled]="passwordForm.invalid || isSavingPassword()">
              <mat-progress-spinner *ngIf="isSavingPassword()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
              <span>{{ isSavingPassword() ? 'UPDATING SECURITY...' : 'CHANGE PASSWORD' }}</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .profile-container {
      width: 100%;
    }

    .profile-layout {
      margin-top: 8px;
    }

    .profile-card {
      padding: 32px !important;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 16px;
      
      .card-icon {
        font-size: 32px;
        height: 32px;
        width: 32px;
        color: var(--color-primary);
      }
      
      h3 {
        font-size: 18px;
        margin: 0;
      }
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .disabled-input {
      background-color: var(--bg-primary) !important;
      color: var(--text-secondary) !important;
      opacity: 0.7;
      cursor: not-allowed;
    }

    .input-caption {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 500;
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

    .error-border {
      border-color: var(--color-error) !important;
      box-shadow: 3px 3px 0px var(--color-error) !important;
    }

    .error-msg {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-error);
      margin-top: 1px;
    }

    .spinner {
      margin-right: 8px;
    }

    .avatar-upload-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 8px;
    }

    .avatar-preview-container {
      position: relative;
      height: 90px;
      width: 90px;
      border-radius: 50%;
      border: 3px solid var(--border-color);
      box-shadow: 4px 4px 0px var(--shadow-color);
      overflow: hidden;
      background-color: var(--bg-primary);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .avatar-preview {
      height: 100%;
      width: 100%;
      object-fit: cover;
    }

    .avatar-fallback {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: 100%;
      background-color: var(--bg-primary);
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 64px;
        height: 64px;
        width: 64px;
      }
    }

    .avatar-overlay-spinner {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: rgba(0, 0, 0, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2;
    }

    .avatar-actions {
      display: flex;
      flex-content: center;
      flex-direction: column;
      gap: 8px;
    }

    .file-upload-label {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // States
  currentUser = this.authService.currentUser;
  isSavingProfile = signal<boolean>(false);
  isSavingPassword = signal<boolean>(false);
  isUploadingAvatar = signal<boolean>(false);

  // Password complexity check
  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|])[A-Za-z\d\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|]{6,}$/;

  // Forms
  profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    preferredCurrency: ['INR', [Validators.required]],
    profilePictureUrl: ['']
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        username: user.username,
        preferredCurrency: user.preferredCurrency,
        profilePictureUrl: user.profilePictureUrl || ''
      });
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const newPass = g.get('newPassword')?.value;
    const confirmPass = g.get('confirmPassword')?.value;
    return newPass === confirmPass ? null : { mismatch: true };
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSavingProfile.set(true);
    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.isSavingProfile.set(false);
        this.notificationService.showSuccess('Profile settings successfully saved!');
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to save settings.');
      }
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isSavingPassword.set(true);
    const body = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.authService.changePassword(body).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.passwordForm.reset();
        this.notificationService.showSuccess('Security password updated!');
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to update password.');
      }
    });
  }

  onAvatarSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notificationService.showError('Please select a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notificationService.showError('Image size must be less than 2MB.');
      return;
    }

    this.isUploadingAvatar.set(true);
    const formData = new FormData();
    formData.append('file', file);

    this.apiService.post<any>('auth/profile/avatar-upload', formData).subscribe({
      next: (res) => {
        this.isUploadingAvatar.set(false);
        this.profileForm.patchValue({ profilePictureUrl: res.url });
        
        // Re-save user session with updated details immediately so toolbar updates
        this.authService.updateProfile({
          username: this.profileForm.value.username,
          preferredCurrency: this.profileForm.value.preferredCurrency,
          profilePictureUrl: res.url
        }).subscribe({
          next: () => {
            this.notificationService.showSuccess('Avatar uploaded and saved successfully!');
          }
        });
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to upload profile picture.');
      }
    });
  }

  removeAvatar(): void {
    this.profileForm.patchValue({ profilePictureUrl: '' });
    // Save state immediately
    this.authService.updateProfile({
      username: this.profileForm.value.username,
      preferredCurrency: this.profileForm.value.preferredCurrency,
      profilePictureUrl: ''
    }).subscribe({
      next: () => {
        this.notificationService.showSuccess('Avatar removed successfully!');
      }
    });
  }
}
