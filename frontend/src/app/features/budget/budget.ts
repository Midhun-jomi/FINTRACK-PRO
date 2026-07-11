import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Budget, Category } from '../../core/models/models';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="budget-container">
      
      <!-- Date Selector & Log Button Row -->
      <div class="action-bar">
        <div class="date-controls">
          <select [formControl]="monthControl" class="max-input select-date" (change)="onDateChange()">
            <option [value]="1">January</option>
            <option [value]="2">February</option>
            <option [value]="3">March</option>
            <option [value]="4">April</option>
            <option [value]="5">May</option>
            <option [value]="6">June</option>
            <option [value]="7">July</option>
            <option [value]="8">August</option>
            <option [value]="9">September</option>
            <option [value]="10">October</option>
            <option [value]="11">November</option>
            <option [value]="12">December</option>
          </select>

          <select [formControl]="yearControl" class="max-input select-date" (change)="onDateChange()">
            <option [value]="2025">2025</option>
            <option [value]="2026">2026</option>
            <option [value]="2027">2027</option>
            <option [value]="2028">2028</option>
          </select>
        </div>

        <button mat-button class="max-btn primary" (click)="openAddForm()">
          <mat-icon>add</mat-icon>
          <span>SET LIMIT</span>
        </button>
      </div>

      <!-- Budget Cards List -->
      @if (isLoading()) {
        <div class="loading-box max-card">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        </div>
      } @else {
        
        @if (budgets().length === 0) {
          <div class="empty-state max-card">
            <mat-icon class="empty-icon">assignment_late</mat-icon>
            <h3>No Budgets Set</h3>
            <p>You haven't defined any spending caps for {{ selectedMonthName() }} {{ yearControl.value }}.</p>
            <button mat-button class="max-btn flat mt-4" (click)="openAddForm()">CREATE FIRST BUDGET</button>
          </div>
        } @else {
          <div class="budgets-grid max-grid">
            @for (budget of budgets(); track budget.id) {
              <div class="max-card budget-card" [class.danger-glow]="budget.percentageUsed >= 100" [class.warning-glow]="budget.percentageUsed >= 80 && budget.percentageUsed < 100">
                
                <!-- Category Details Header -->
                <div class="card-header">
                  <div class="header-left">
                    <div class="category-indicator" [style.background-color]="budget.categoryColor">
                      <mat-icon *ngIf="budget.categoryId">{{ budget.categoryColor ? 'payments' : 'settings' }}</mat-icon>
                    </div>
                    <div>
                      <h4 class="category-title">{{ budget.categoryName }} Limit</h4>
                      <span class="period-text">{{ selectedMonthName() }} {{ budget.year }}</span>
                    </div>
                  </div>
                  <div class="actions">
                    <button class="icon-btn edit" (click)="openEditForm(budget)" title="Edit Limit"><mat-icon>edit</mat-icon></button>
                    <button class="icon-btn delete" (click)="deleteBudget(budget.id)" title="Delete"><mat-icon>delete</mat-icon></button>
                  </div>
                </div>

                <!-- Spend & Limits Stats -->
                <div class="spending-stats">
                  <div class="stat-item">
                    <span class="stat-label">Spent</span>
                    <span class="stat-value" [class.warning]="budget.percentageUsed >= 80" [class.critical]="budget.percentageUsed >= 100">
                      {{ budget.currentSpending | currency:currencyCode() }}
                    </span>
                  </div>
                  <div class="stat-divider">/</div>
                  <div class="stat-item">
                    <span class="stat-label">Budget Cap</span>
                    <span class="stat-value limit-cap">{{ budget.monthlyLimit | currency:currencyCode() }}</span>
                  </div>
                </div>

                <!-- Brutalist Progress bar -->
                <div class="max-progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="Math.min(100, budget.percentageUsed)"
                       [class.warning]="budget.percentageUsed >= 80"
                       [class.critical]="budget.percentageUsed >= 100"></div>
                </div>

                <!-- Bottom Status Messages -->
                <div class="card-footer">
                  <span class="percentage-badge" [class.warning]="budget.percentageUsed >= 80" [class.critical]="budget.percentageUsed >= 100">
                    {{ budget.percentageUsed }}% UTILISED
                  </span>
                  
                  @if (budget.percentageUsed >= 100) {
                    <span class="footer-alert critical">OVER BUDGET! ⚠️</span>
                  } @else if (budget.percentageUsed >= 80) {
                    <span class="footer-alert warning">CLOSE TO LIMIT! ⚠️</span>
                  } @else {
                    <span class="footer-alert text-success">SAFE ZONE ✅</span>
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
            <h3>{{ isEditMode() ? 'EDIT BUDGET CEILING' : 'CREATE MONTHLY BUDGET' }}</h3>
            <button class="close-btn" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="budgetForm" (ngSubmit)="saveBudget()" class="modal-form">
            <div class="form-group" *ngIf="!isEditMode()">
              <label for="categoryId" class="form-label">Category</label>
              <select id="categoryId" formControlName="categoryId" class="max-input max-select">
                <option value="">Overall Monthly Budget (All Categories)</option>
                @for (cat of expenseCategories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="monthlyLimit" class="form-label">Monthly Limit</label>
              <input type="number" id="monthlyLimit" formControlName="monthlyLimit" class="max-input" placeholder="0.00" step="0.01" />
            </div>

            <div class="form-group" *ngIf="!isEditMode()">
              <label for="month" class="form-label">Month</label>
              <select id="month" formControlName="month" class="max-input max-select">
                <option [value]="1">January</option>
                <option [value]="2">February</option>
                <option [value]="3">March</option>
                <option [value]="4">April</option>
                <option [value]="5">May</option>
                <option [value]="6">June</option>
                <option [value]="7">July</option>
                <option [value]="8">August</option>
                <option [value]="9">September</option>
                <option [value]="10">October</option>
                <option [value]="11">November</option>
                <option [value]="12">December</option>
              </select>
            </div>

            <div class="form-group" *ngIf="!isEditMode()">
              <label for="year" class="form-label">Year</label>
              <select id="year" formControlName="year" class="max-input max-select">
                <option [value]="2025">2025</option>
                <option [value]="2026">2026</option>
                <option [value]="2027">2027</option>
                <option [value]="2028">2028</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="max-btn flat" (click)="closeForm()">CANCEL</button>
              <button type="submit" class="max-btn primary" [disabled]="budgetForm.invalid || isSaving()">
                <span>{{ isSaving() ? 'CONFIGURING...' : 'CONFIRM BUDGET' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .budget-container {
      width: 100%;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }

    .date-controls {
      display: flex;
      gap: 12px;
      
      .select-date {
        min-width: 140px;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 14px;
        padding-right: 32px;
        cursor: pointer;
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

    .budgets-grid {
      margin-top: 8px;
    }

    .budget-card {
      padding: 20px !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      &.warning-glow {
        border-color: var(--color-warning);
        box-shadow: 6px 6px 0px var(--color-warning);
      }
      
      &.danger-glow {
        border-color: var(--color-secondary);
        box-shadow: 6px 6px 0px var(--color-secondary);
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
      
      .category-indicator {
        height: 38px;
        width: 38px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #000;
        
        mat-icon {
          font-size: 20px;
          height: 20px;
          width: 20px;
        }
      }
      
      .category-title {
        font-size: 16px;
        margin: 0;
        line-height: 1.2;
      }
      
      .period-text {
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

    .spending-stats {
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
          
          &.warning { color: var(--color-warning); }
          &.critical { color: var(--color-secondary); }
          body.dark-theme &.critical { color: var(--color-secondary); }
        }
        
        .limit-cap {
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
        background-color: var(--color-primary);
        border-right: 2px solid var(--border-color);
        transition: width 0.3s ease-out;
        
        &.warning { background-color: var(--color-warning); }
        &.critical { background-color: var(--color-secondary); }
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      
      .percentage-badge {
        background-color: var(--bg-primary);
        border: 2px solid var(--border-color);
        padding: 2px 8px;
        border-radius: 4px;
        
        &.warning { background-color: rgba(255, 95, 31, 0.2); color: var(--color-warning); }
        &.critical { background-color: rgba(255, 0, 127, 0.2); color: var(--color-secondary); }
      }
      
      .footer-alert {
        font-family: var(--font-family-header);
        
        &.warning { color: var(--color-warning); }
        &.critical { color: var(--color-secondary); }
        body.dark-theme &.critical { color: var(--color-secondary); }
      }
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

    .max-select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 40px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }
  `]
})
export class BudgetComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // States
  budgets = signal<Budget[]>([]);
  expenseCategories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  // Date controls
  monthControl = this.fb.control(new Date().getMonth() + 1);
  yearControl = this.fb.control(new Date().getFullYear());

  // Form Modals
  showForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId: string | null = null;

  budgetForm: FormGroup = this.fb.group({
    categoryId: [''], // Nullable for overall budget
    monthlyLimit: [0, [Validators.required, Validators.min(1)]],
    month: [new Date().getMonth() + 1, [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required]]
  });

  // Math helper for template
  protected Math = Math;

  // Currency
  currencyCode = computed(() => this.authService.currentUser()?.preferredCurrency || 'INR');

  selectedMonthName = computed(() => {
    const month = this.monthControl.value;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(month || 1) - 1];
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadBudgets();
  }

  loadCategories(): void {
    this.apiService.get<Category[]>('categories').subscribe({
      next: (cats) => {
        this.expenseCategories.set(cats.filter(c => c.type === 'Expense'));
      }
    });
  }

  loadBudgets(): void {
    this.isLoading.set(true);
    const m = this.monthControl.value;
    const y = this.yearControl.value;
    
    this.apiService.get<Budget[]>(`budgets?month=${m}&year=${y}`).subscribe({
      next: (data) => {
        this.budgets.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Could not load monthly budgets.');
      }
    });
  }

  onDateChange(): void {
    this.loadBudgets();
  }

  openAddForm(): void {
    this.isEditMode.set(false);
    this.editingId = null;
    this.budgetForm.reset({
      categoryId: '',
      monthlyLimit: 0,
      month: this.monthControl.value,
      year: this.yearControl.value
    });
    this.showForm.set(true);
  }

  openEditForm(budget: Budget): void {
    this.isEditMode.set(true);
    this.editingId = budget.id;
    this.budgetForm.setValue({
      categoryId: budget.categoryId || '',
      monthlyLimit: budget.monthlyLimit,
      month: budget.month,
      year: budget.year
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  saveBudget(): void {
    if (this.budgetForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.budgetForm.value;
    const body = {
      categoryId: formVal.categoryId === '' ? null : formVal.categoryId,
      monthlyLimit: formVal.monthlyLimit,
      month: parseInt(formVal.month),
      year: parseInt(formVal.year)
    };

    if (this.isEditMode()) {
      this.apiService.put(`budgets/${this.editingId}`, body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Budget limit updated!');
          this.loadBudgets();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to update budget.');
        }
      });
    } else {
      this.apiService.post('budgets', body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Budget limit configured!');
          this.loadBudgets();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to configure budget.');
        }
      });
    }
  }

  deleteBudget(id: string): void {
    if (confirm('Are you sure you want to remove this budget ceiling?')) {
      this.apiService.delete(`budgets/${id}`).subscribe({
        next: () => {
          this.notificationService.showSuccess('Budget limit removed.');
          this.loadBudgets();
        },
        error: () => {
          this.notificationService.showError('Could not delete budget plan.');
        }
      });
    }
  }
}
