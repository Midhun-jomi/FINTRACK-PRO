import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SavingsGoal } from '../../core/models/models';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="savings-container">
      
      <!-- Top Action Bar -->
      <div class="action-bar">
        <h3>Savings Goals Tracking</h3>
        <button mat-button class="max-btn primary" (click)="openAddForm()">
          <mat-icon>add</mat-icon>
          <span>NEW GOAL</span>
        </button>
      </div>

      <!-- Goals Listing -->
      @if (isLoading()) {
        <div class="loading-box max-card">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        </div>
      } @else {
        
        @if (goals().length === 0) {
          <div class="empty-state max-card">
            <mat-icon class="empty-icon">track_changes</mat-icon>
            <h3>No Savings Goals Active</h3>
            <p>Define your first financial target (e.g. Dream Vacation, Rainy Day Fund, New Car) and start saving!</p>
            <button mat-button class="max-btn flat mt-4" (click)="openAddForm()">CREATE FIRST GOAL</button>
          </div>
        } @else {
          <div class="goals-grid max-grid">
            @for (goal of goals(); track goal.id) {
              <div class="max-card goal-card" [class.success-glow]="goal.status === 'Completed'">
                
                <!-- Card Header -->
                <div class="card-header">
                  <div class="header-left">
                    <div class="goal-icon-box" [class.completed]="goal.status === 'Completed'">
                      <mat-icon>{{ goal.status === 'Completed' ? 'emoji_events' : 'savings' }}</mat-icon>
                    </div>
                    <div>
                      <h4 class="goal-title">{{ goal.name }}</h4>
                      <span class="deadline-text">Target: {{ goal.deadline | date:'mediumDate' }}</span>
                    </div>
                  </div>
                  <div class="actions">
                    <button class="icon-btn edit" (click)="openEditForm(goal)" title="Edit Goal"><mat-icon>edit</mat-icon></button>
                    <button class="icon-btn delete" (click)="deleteGoal(goal.id)" title="Delete"><mat-icon>delete</mat-icon></button>
                  </div>
                </div>

                <!-- Goal Progress Stats -->
                <div class="progress-stats">
                  <div class="stat-item">
                    <span class="stat-label">Saved</span>
                    <span class="stat-value text-accent">{{ goal.currentAmount | currency:currencyCode() }}</span>
                  </div>
                  <div class="stat-divider">/</div>
                  <div class="stat-item">
                    <span class="stat-label">Goal Target</span>
                    <span class="stat-value target-cap">{{ goal.targetAmount | currency:currencyCode() }}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="max-progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="Math.min(100, goal.progressPercentage)"
                       [class.completed]="goal.status === 'Completed'"></div>
                </div>

                <!-- Card Footer & Contribute -->
                <div class="card-footer">
                  <span class="percentage-badge" [class.completed]="goal.status === 'Completed'">
                    {{ goal.progressPercentage }}% ACHIVEMENT
                  </span>

                  @if (goal.status === 'Completed') {
                    <span class="milestone-badge max-badge success">GOAL ACHIEVED! 🏆</span>
                  } @else {
                    <button mat-button class="max-btn flat py-1 px-3 contribute-btn" (click)="openContributeForm(goal)">
                      <mat-icon class="icon-inline">add_circle</mat-icon>
                      <span>ADD CASH</span>
                    </button>
                  }
                </div>

              </div>
            }
          </div>
        }
      }

      <!-- Add/Edit Overlay Modal -->
      <div class="modal-overlay" *ngIf="showForm()">
        <div class="max-card modal-card primary-glow">
          <div class="modal-header">
            <h3>{{ isEditMode() ? 'EDIT SAVINGS TARGET' : 'NEW SAVINGS GOAL' }}</h3>
            <button class="close-btn" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="goalForm" (ngSubmit)="saveGoal()" class="modal-form">
            <div class="form-group">
              <label for="name" class="form-label">Goal Name</label>
              <input type="text" id="name" formControlName="name" class="max-input" placeholder="e.g. Emergency Fund" />
            </div>

            <div class="form-group">
              <label for="targetAmount" class="form-label">Target Amount</label>
              <input type="number" id="targetAmount" formControlName="targetAmount" class="max-input" placeholder="0.00" step="0.01" />
            </div>

            <div class="form-group">
              <label for="currentAmount" class="form-label">Initial Saved Amount</label>
              <input type="number" id="currentAmount" formControlName="currentAmount" class="max-input" placeholder="0.00" step="0.01" />
            </div>

            <div class="form-group">
              <label for="deadline" class="form-label">Deadline</label>
              <input type="date" id="deadline" formControlName="deadline" class="max-input" />
            </div>

            <div class="modal-actions">
              <button type="button" class="max-btn flat" (click)="closeForm()">CANCEL</button>
              <button type="submit" class="max-btn primary" [disabled]="goalForm.invalid || isSaving()">
                <span>{{ isSaving() ? 'CONFIGURING...' : 'CONFIRM TARGET' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Contribution Overlay Modal -->
      <div class="modal-overlay" *ngIf="showContributeForm()">
        <div class="max-card modal-card success-glow">
          <div class="modal-header">
            <h3>ADD SAVINGS TO GOAL</h3>
            <button class="close-btn" (click)="closeContributeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-info-panel" *ngIf="activeGoal()">
            <p><strong>Goal:</strong> {{ activeGoal()?.name }}</p>
            <p><strong>Remaining:</strong> {{ (activeGoal()!.targetAmount - activeGoal()!.currentAmount) | currency:currencyCode() }}</p>
          </div>

          <form [formGroup]="contributionForm" (ngSubmit)="saveContribution()" class="modal-form">
            <div class="form-group">
              <label for="amount" class="form-label">Contribution Amount</label>
              <input type="number" id="amount" formControlName="amount" class="max-input" placeholder="0.00" step="0.01" />
            </div>

            <div class="modal-actions">
              <button type="button" class="max-btn flat" (click)="closeContributeForm()">CANCEL</button>
              <button type="submit" class="max-btn success" [disabled]="contributionForm.invalid || isSaving()">
                <span>{{ isSaving() ? 'CONTRIBUTING...' : 'ADD SAVINGS' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .savings-container {
      width: 100%;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      border-bottom: 3px solid var(--border-color);
      padding-bottom: 12px;
      
      h3 {
        margin: 0;
        font-size: 22px;
      }
    }

    .loading-box {
      padding: 60px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .empty-state {
      padding: 60px;
      text-align: center;
      color: var(--text-secondary);
      
      .empty-icon {
        font-size: 64px;
        height: 64px;
        width: 64px;
        color: var(--color-primary);
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 20px;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
      
      .mt-4 { margin-top: 16px; }
    }

    .goals-grid {
      margin-top: 8px;
    }

    .goal-card {
      padding: 20px !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      &.success-glow {
        border-color: var(--color-success);
        box-shadow: 6px 6px 0px var(--color-success);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .goal-icon-box {
        height: 38px;
        width: 38px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--color-primary);
        color: #000;
        
        mat-icon {
          font-size: 20px;
          height: 20px;
          width: 20px;
        }
        
        &.completed {
          background-color: var(--color-success);
        }
      }
      
      .goal-title {
        font-size: 16px;
        margin: 0;
        line-height: 1.2;
      }
      
      .deadline-text {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
      }
    }

    .icon-btn {
      height: 28px;
      width: 28px;
      border: 2px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin: 0 2px;
      box-shadow: 2px 2px 0px var(--border-color);
      transition: all 0.1s ease;
      
      mat-icon {
        font-size: 14px;
        height: 14px;
        width: 14px;
      }
      
      &:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px var(--border-color);
      }
      
      &.edit:hover { background-color: var(--color-primary); color: #000; }
      &.delete:hover { background-color: var(--color-secondary); color: #fff; }
      
      body.dark-theme &.edit:hover { color: #000; }
    }

    .progress-stats {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      
      .stat-divider {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-secondary);
        opacity: 0.5;
        padding-bottom: 2px;
      }
      
      .stat-item {
        display: flex;
        flex-direction: column;
        
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        
        .stat-value {
          font-family: var(--font-family-body);
          font-weight: 700;
          font-size: 20px;
          
          &.text-accent { color: var(--color-accent); }
        }
        
        .target-cap {
          color: var(--text-primary);
          opacity: 0.7;
        }
      }
    }

    // Progress Bar
    .max-progress-bar {
      width: 100%;
      height: 20px;
      background-color: var(--bg-primary);
      border: 2px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 2px 2px 0px var(--border-color);
      
      .progress-fill {
        height: 100%;
        background-color: var(--color-accent);
        border-right: 2px solid var(--border-color);
        transition: width 0.3s ease-out;
        
        &.completed {
          background-color: var(--color-success);
        }
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      min-height: 38px;
      
      .percentage-badge {
        background-color: var(--bg-primary);
        border: 2px solid var(--border-color);
        padding: 2px 8px;
        border-radius: 4px;
        color: var(--color-accent);
        
        &.completed {
          color: var(--color-success);
          border-color: var(--color-success);
        }
      }
      
      .contribute-btn {
        padding: 6px 12px !important;
        font-size: 12px;
        border-radius: 6px;
        background-color: var(--color-success);
        color: #000;
        box-shadow: 2px 2px 0px var(--border-color);
        
        &:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0px var(--border-color);
        }
      }
    }

    .icon-inline {
      font-size: 16px;
      height: 16px;
      width: 16px;
      vertical-align: middle;
      margin-right: 4px;
      margin-top: -2px;
    }

    // Modal overlay styling
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 100vw;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(4px);
      padding: 24px;
    }

    .modal-card {
      width: 100%;
      max-width: 480px;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      box-shadow: 8px 8px 0px var(--shadow-color);
      padding: 0 !important;
      overflow: hidden;
    }

    .modal-header {
      background-color: var(--color-primary);
      color: #000000;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: var(--border-width) solid var(--border-color);
      
      h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: #000;
        cursor: pointer;
      }
    }

    .modal-info-panel {
      padding: 16px 24px 0 24px;
      font-family: var(--font-family-body);
      font-weight: 500;
      color: var(--text-secondary);
      display: flex;
      justify-content: space-between;
    }

    .modal-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
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

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }
  `]
})
export class SavingsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // States
  goals = signal<SavingsGoal[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  // Modals
  showForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId: string | null = null;
  
  showContributeForm = signal<boolean>(false);
  activeGoal = signal<SavingsGoal | null>(null);

  goalForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    targetAmount: [0, [Validators.required, Validators.min(1)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    deadline: ['', [Validators.required]]
  });

  contributionForm: FormGroup = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]]
  });

  // Math helper
  protected Math = Math;

  // Currency
  currencyCode = computed(() => this.authService.currentUser()?.preferredCurrency || 'INR');

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.isLoading.set(true);
    this.apiService.get<SavingsGoal[]>('savings-goals').subscribe({
      next: (data) => {
        this.goals.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Could not load savings goals.');
      }
    });
  }

  openAddForm(): void {
    this.isEditMode.set(false);
    this.editingId = null;
    this.goalForm.reset({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().substring(0, 10)
    });
    this.showForm.set(true);
  }

  openEditForm(goal: SavingsGoal): void {
    this.isEditMode.set(true);
    this.editingId = goal.id;
    this.goalForm.setValue({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline.substring(0, 10)
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  saveGoal(): void {
    if (this.goalForm.invalid) return;

    this.isSaving.set(true);
    const body = this.goalForm.value;

    if (this.isEditMode()) {
      this.apiService.put(`savings-goals/${this.editingId}`, body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Goal target details updated!');
          this.loadGoals();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to update savings goal.');
        }
      });
    } else {
      this.apiService.post('savings-goals', body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Savings goal target configured!');
          this.loadGoals();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to create savings goal.');
        }
      });
    }
  }

  deleteGoal(id: string): void {
    if (confirm('Are you sure you want to delete this savings target?')) {
      this.apiService.delete(`savings-goals/${id}`).subscribe({
        next: () => {
          this.notificationService.showSuccess('Savings target deleted.');
          this.loadGoals();
        },
        error: () => {
          this.notificationService.showError('Could not delete savings target.');
        }
      });
    }
  }

  openContributeForm(goal: SavingsGoal): void {
    this.activeGoal.set(goal);
    this.contributionForm.reset({
      amount: 0
    });
    this.showContributeForm.set(true);
  }

  closeContributeForm(): void {
    this.showContributeForm.set(false);
    this.activeGoal.set(null);
  }

  saveContribution(): void {
    if (this.contributionForm.invalid || !this.activeGoal()) return;

    this.isSaving.set(true);
    const goalId = this.activeGoal()!.id;
    const body = this.contributionForm.value;

    this.apiService.post(`savings-goals/${goalId}/contribute`, body).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showContributeForm.set(false);
        this.activeGoal.set(null);
        this.notificationService.showSuccess('Savings contribution added!');
        this.loadGoals();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to record contribution.');
      }
    });
  }
}
