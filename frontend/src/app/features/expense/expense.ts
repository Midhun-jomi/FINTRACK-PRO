import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Transaction, Category } from '../../core/models/models';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="expense-container">
      
      <!-- Top Action Bar -->
      <div class="action-bar">
        <div class="filter-controls">
          <input 
            type="text" 
            [formControl]="searchControl" 
            class="max-input search-input" 
            placeholder="Search notes or categories..." 
            (input)="onFilterChange()" />
          
          <select [formControl]="categoryFilterControl" class="max-input select-filter" (change)="onFilterChange()">
            <option value="">All Categories</option>
            @for (cat of expenseCategories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>

        <button mat-button class="max-btn secondary" (click)="openAddForm()">
          <mat-icon>add</mat-icon>
          <span>LOG EXPENSE</span>
        </button>
      </div>

      <!-- Main Table Card -->
      <div class="table-card max-card">
        @if (isLoading()) {
          <div class="loading-spinner-box">
            <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          </div>
        } @else {
          
          @if (expenses().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">receipt</mat-icon>
              <h3>No Expenses Found</h3>
              <p>You haven't logged any expenses yet. Start tracking your spendings.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="max-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th>Receipt</th>
                    <th>Notes</th>
                    <th class="text-right">Amount</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of expenses(); track item.id) {
                    <tr>
                      <td class="bold-cell">{{ item.date | date:'mediumDate' }}</td>
                      <td>
                        <span class="max-badge" [style.background-color]="item.categoryColor" style="color: #000;">
                          <mat-icon class="icon-inline">{{ item.categoryIcon }}</mat-icon>
                          {{ item.categoryName }}
                        </span>
                      </td>
                      <td><span class="max-badge flat py-1">{{ item.paymentMethod }}</span></td>
                      <td class="text-center">
                        @if (item.receiptUrl) {
                          <button class="receipt-preview-btn" (click)="viewReceipt(item.receiptUrl)" title="View Receipt">
                            <mat-icon>image</mat-icon>
                          </button>
                        } @else {
                          <span class="text-secondary">—</span>
                        }
                      </td>
                      <td class="notes-cell">{{ item.notes || '—' }}</td>
                      <td class="amount-cell text-right bold-cell text-danger">
                        -{{ item.amount | currency:currencyCode() }}
                      </td>
                      <td class="text-center actions-cell">
                        <button class="icon-btn edit" (click)="openEditForm(item)" title="Edit">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button class="icon-btn delete" (click)="deleteExpense(item.id)" title="Delete">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div class="pagination-bar">
              <span class="pagination-info">
                Showing Page {{ page() }} of {{ totalPages() }} ({{ totalItems() }} Total)
              </span>
              <div class="pagination-buttons">
                <button class="max-btn flat py-1 px-3" [disabled]="page() === 1" (click)="changePage(page() - 1)">PREV</button>
                <button class="max-btn flat py-1 px-3" [disabled]="page() === totalPages()" (click)="changePage(page() + 1)">NEXT</button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Add/Edit Overlay Modal -->
      <div class="modal-overlay" *ngIf="showForm()">
        <div class="max-card modal-card secondary-glow">
          <div class="modal-header">
            <h3>{{ isEditMode() ? 'EDIT EXPENSE TRANSACTION' : 'LOG NEW EXPENSE' }}</h3>
            <button class="close-btn" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="expenseForm" (ngSubmit)="saveExpense()" class="modal-form">
            <div class="form-group">
              <label for="amount" class="form-label">Amount</label>
              <input type="number" id="amount" formControlName="amount" class="max-input" placeholder="0.00" step="0.01" />
            </div>

            <div class="form-group">
              <label for="categoryId" class="form-label">Category</label>
              <select id="categoryId" formControlName="categoryId" class="max-input max-select">
                <option value="">Select Category</option>
                @for (cat of expenseCategories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="date" class="form-label">Date</label>
              <input type="date" id="date" formControlName="date" class="max-input" />
            </div>

            <div class="form-group">
              <label for="paymentMethod" class="form-label">Payment Method</label>
              <select id="paymentMethod" formControlName="paymentMethod" class="max-input max-select">
                <option value="Card">Credit/Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Transfer">Bank Transfer</option>
                <option value="UPI">UPI / Digital Wallet</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Receipt Image</label>
              <div class="upload-wrapper">
                <input type="file" style="display:none" #fileInput (change)="onFileSelected($event)" accept="image/*" />
                <button type="button" class="max-btn flat upload-btn" (click)="fileInput.click()">
                  <mat-icon>cloud_upload</mat-icon>
                  <span>{{ isUploading() ? 'UPLOADING...' : 'CHOOSE FILE' }}</span>
                </button>
                <span class="upload-name" *ngIf="expenseForm.value.receiptUrl">
                  <mat-icon class="icon-inline">check_circle</mat-icon>
                  <a [href]="expenseForm.value.receiptUrl" target="_blank">View Uploaded</a>
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="notes" class="form-label">Notes</label>
              <textarea id="notes" formControlName="notes" class="max-input" placeholder="e.g. Grocery shopping at Walmart" rows="3"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="max-btn flat" (click)="closeForm()">CANCEL</button>
              <button type="submit" class="max-btn secondary" [disabled]="expenseForm.invalid || isSaving() || isUploading()">
                <span>{{ isSaving() ? 'SAVING...' : 'SAVE RECORD' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Receipt Preview Overlay Modal -->
      <div class="modal-overlay receipt-view-overlay" *ngIf="activeReceiptUrl()" (click)="closeReceipt()">
        <div class="receipt-wrapper max-card" (click)="$event.stopPropagation()">
          <div class="receipt-header">
            <h3>Receipt Attachment</h3>
            <button class="close-btn" (click)="closeReceipt()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="receipt-image-box">
            <img [src]="activeReceiptUrl()" alt="Receipt attachment copy" />
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .expense-container {
      width: 100%;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      
      @media (max-width: 767px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .filter-controls {
      display: flex;
      gap: 12px;
      flex-grow: 1;
      
      .search-input {
        max-width: 300px;
      }
      
      .select-filter {
        max-width: 200px;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 14px;
        padding-right: 32px;
        cursor: pointer;
      }
    }

    .table-card {
      padding: 0 !important;
      overflow: hidden;
    }

    .loading-spinner-box {
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
        color: var(--color-secondary);
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 20px;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .max-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-family: var(--font-family-body);
      
      th {
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 13px;
        padding: 16px;
        border-bottom: var(--border-width) solid var(--border-color);
        letter-spacing: 0.5px;
      }
      
      td {
        padding: 16px;
        border-bottom: 2px solid var(--border-color);
        color: var(--text-primary);
        font-size: 15px;
        vertical-align: middle;
      }
      
      tr:last-child td {
        border-bottom: none;
      }
    }

    .bold-cell {
      font-weight: 700;
    }

    .notes-cell {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .amount-cell {
      font-size: 17px !important;
    }

    .icon-inline {
      font-size: 16px;
      height: 16px;
      width: 16px;
      vertical-align: middle;
      margin-right: 4px;
      margin-top: -2px;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .actions-cell {
      white-space: nowrap;
    }

    .receipt-preview-btn {
      height: 32px;
      width: 32px;
      border: 2px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--color-accent);
      color: #000;
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-shadow: 2px 2px 0px var(--border-color);
      transition: all 0.1s ease;
      
      mat-icon {
        font-size: 16px;
        height: 16px;
        width: 16px;
      }
      
      &:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px var(--border-color);
      }
    }

    .icon-btn {
      height: 32px;
      width: 32px;
      border: 2px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin: 0 4px;
      box-shadow: 2px 2px 0px var(--border-color);
      transition: all 0.1s ease;
      
      mat-icon {
        font-size: 16px;
        height: 16px;
        width: 16px;
      }
      
      &:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px var(--border-color);
      }
      
      &.edit:hover { background-color: var(--color-accent); }
      &.delete:hover { background-color: var(--color-error); color: #fff; }
    }

    .pagination-bar {
      padding: 16px 24px;
      border-top: var(--border-width) solid var(--border-color);
      background-color: var(--bg-primary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .pagination-info {
        font-weight: 700;
        font-size: 13px;
        color: var(--text-secondary);
      }
      
      .pagination-buttons {
        display: flex;
        gap: 8px;
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
      max-width: 500px;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      box-shadow: 8px 8px 0px var(--shadow-color);
      padding: 0 !important;
      overflow: hidden;
    }

    .modal-header {
      background-color: var(--color-secondary);
      color: #ffffff;
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
        color: #fff;
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

    .upload-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .upload-btn {
        padding: 8px 16px !important;
        font-size: 13px;
      }
      
      .upload-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-success);
        
        a {
          color: var(--color-primary);
          text-decoration: underline;
        }
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }

    // Receipt viewer wrapper
    .receipt-wrapper {
      width: 100%;
      max-width: 600px;
      padding: 0 !important;
      overflow: hidden;
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      
      .receipt-header {
        background-color: var(--color-primary);
        color: #000;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: var(--border-width) solid var(--border-color);
        
        h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
        }
      }
      
      .receipt-image-box {
        padding: 16px;
        display: flex;
        justify-content: center;
        max-height: 500px;
        overflow-y: auto;
        
        img {
          max-width: 100%;
          height: auto;
          border: 2px solid var(--border-color);
          border-radius: 4px;
        }
      }
    }
  `]
})
export class ExpenseComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // States
  expenses = signal<Transaction[]>([]);
  expenseCategories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  
  // Filtering & Pagination
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  
  // Controls
  searchControl = this.fb.control('');
  categoryFilterControl = this.fb.control('');

  // Modals
  showForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId: string | null = null;
  activeReceiptUrl = signal<string | null>(null);

  expenseForm: FormGroup = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    categoryId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    paymentMethod: ['Card', [Validators.required]],
    receiptUrl: [''],
    notes: ['']
  });

  // Currency
  currencyCode = computed(() => this.authService.currentUser()?.preferredCurrency || 'INR');

  ngOnInit(): void {
    this.loadCategories();
    this.loadExpenses();
  }

  loadCategories(): void {
    this.apiService.get<Category[]>('categories').subscribe({
      next: (cats) => {
        this.expenseCategories.set(cats.filter(c => c.type === 'Expense'));
      }
    });
  }

  loadExpenses(): void {
    this.isLoading.set(true);
    
    const searchVal = this.searchControl.value;
    const catVal = this.categoryFilterControl.value;
    
    let path = `transactions?type=Expense&page=${this.page()}&pageSize=${this.pageSize()}`;
    if (searchVal) path += `&search=${encodeURIComponent(searchVal)}`;
    if (catVal) path += `&categoryId=${catVal}`;

    this.apiService.get<any>(path).subscribe({
      next: (res) => {
        this.expenses.set(res.items);
        this.totalItems.set(res.totalItems);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Could not load expenses.');
      }
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadExpenses();
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page.set(newPage);
    this.loadExpenses();
  }

  openAddForm(): void {
    this.isEditMode.set(false);
    this.editingId = null;
    this.expenseForm.reset({
      amount: 0,
      categoryId: '',
      date: new Date().toISOString().substring(0, 10),
      paymentMethod: 'Card',
      receiptUrl: '',
      notes: ''
    });
    this.showForm.set(true);
  }

  openEditForm(item: Transaction): void {
    this.isEditMode.set(true);
    this.editingId = item.id;
    this.expenseForm.setValue({
      amount: item.amount,
      categoryId: item.categoryId,
      date: item.date.substring(0, 10),
      paymentMethod: item.paymentMethod,
      receiptUrl: item.receiptUrl || '',
      notes: item.notes || ''
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);

    this.apiService.post<any>('transactions/receipt-upload', formData).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.expenseForm.patchValue({ receiptUrl: res.url });
        this.notificationService.showSuccess('Receipt uploaded successfully!');
      },
      error: () => {
        this.isUploading.set(false);
        this.notificationService.showError('Receipt image upload failed.');
      }
    });
  }

  saveExpense(): void {
    if (this.expenseForm.invalid) return;

    this.isSaving.set(true);
    const body = {
      ...this.expenseForm.value,
      type: 'Expense'
    };

    if (this.isEditMode()) {
      this.apiService.put(`transactions/${this.editingId}`, body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Expense log updated!');
          this.loadExpenses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to update expense.');
        }
      });
    } else {
      this.apiService.post('transactions', body).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showForm.set(false);
          this.notificationService.showSuccess('Expense log saved successfully!');
          this.loadExpenses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.showError(err.error?.message || 'Failed to log expense.');
        }
      });
    }
  }

  deleteExpense(id: string): void {
    if (confirm('Are you sure you want to delete this expense record?')) {
      this.apiService.delete(`transactions/${id}`).subscribe({
        next: () => {
          this.notificationService.showSuccess('Expense record deleted.');
          this.loadExpenses();
        },
        error: () => {
          this.notificationService.showError('Could not delete expense record.');
        }
      });
    }
  }

  viewReceipt(url: string): void {
    this.activeReceiptUrl.set(url);
  }

  closeReceipt(): void {
    this.activeReceiptUrl.set(null);
  }
}
