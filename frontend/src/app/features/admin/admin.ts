import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { User, AuditLog, Category } from '../../core/models/models';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalSavingsGoals: number;
  databaseProvider: string;
  isDatabaseOnline: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="admin-container">
      
      <!-- Statistics Row -->
      <div class="stats-row max-grid">
        <div class="max-card stat-card primary-glow">
          <div class="stat-icon-wrapper primary">
            <mat-icon class="stat-icon">people</mat-icon>
          </div>
          <div class="stat-data">
            <span class="stat-label">Total Users</span>
            <h2 class="stat-value">{{ stats()?.totalUsers ?? 0 }}</h2>
          </div>
        </div>
        
        <div class="max-card stat-card secondary-glow">
          <div class="stat-icon-wrapper secondary">
            <mat-icon class="stat-icon">payments</mat-icon>
          </div>
          <div class="stat-data">
            <span class="stat-label">Total Transactions</span>
            <h2 class="stat-value">{{ stats()?.totalTransactions ?? 0 }}</h2>
          </div>
        </div>

        <div class="max-card stat-card accent-glow">
          <div class="stat-icon-wrapper accent">
            <mat-icon class="stat-icon">track_changes</mat-icon>
          </div>
          <div class="stat-data">
            <span class="stat-label">Savings Goals</span>
            <h2 class="stat-value">{{ stats()?.totalSavingsGoals ?? 0 }}</h2>
          </div>
        </div>

        <div class="max-card stat-card success-glow">
          <div class="stat-icon-wrapper success" [class.db-offline]="!stats()?.isDatabaseOnline">
            <mat-icon class="stat-icon">dns</mat-icon>
          </div>
          <div class="stat-data">
            <span class="stat-label">Database Status ({{ stats()?.databaseProvider || 'Checking' }})</span>
            <div class="db-status-wrapper">
              <span class="status-dot" [class.online]="stats()?.isDatabaseOnline"></span>
              <h2 class="stat-value">{{ stats()?.isDatabaseOnline ? 'ONLINE' : 'OFFLINE' }}</h2>
            </div>
          </div>
        </div>
      </div>
      
      <div class="admin-layout">
        
        <!-- Left: User & Category Controls -->
        <div class="left-controls">
          
          <!-- User Management -->
          <div class="max-card admin-card">
            <div class="card-header">
              <mat-icon class="card-icon">people</mat-icon>
              <h3>User Accounts Control</h3>
            </div>
            
            <div class="table-responsive">
              <table class="max-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>TXs</th>
                    <th>Status</th>
                    <th class="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (usr of users(); track usr.id) {
                    <tr>
                      <td class="bold-cell">{{ usr.username }}</td>
                      <td>{{ usr.email }}</td>
                      <td>
                        <span class="max-badge" [class.primary]="usr.role === 'Admin'" [class.flat]="usr.role !== 'Admin'">
                          {{ usr.role }}
                        </span>
                      </td>
                      <td class="bold-cell">{{ usr.transactionCount }}</td>
                      <td>
                        <span class="status-indicator" [class.active]="usr.isActive">
                          {{ usr.isActive ? 'ACTIVE' : 'DISABLED' }}
                        </span>
                      </td>
                      <td class="text-center">
                        <button 
                          class="max-btn flat toggle-btn" 
                          [disabled]="usr.role === 'Admin'" 
                          (click)="toggleUserStatus(usr.id)">
                          TOGGLE
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- System Categories -->
          <div class="max-card admin-card secondary-glow">
            <div class="card-header">
              <mat-icon class="card-icon" style="color: var(--color-secondary);">folder_special</mat-icon>
              <h3>Default Platform Categories</h3>
            </div>

            <!-- Add default category inline form -->
            <form [formGroup]="categoryForm" (ngSubmit)="createCategory()" class="category-inline-form">
              <input type="text" formControlName="name" class="max-input" placeholder="Category Name" />
              
              <select formControlName="type" class="max-input max-select">
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>

              <input type="text" formControlName="icon" class="max-input" placeholder="Icon" />
              <input type="text" formControlName="color" class="max-input" placeholder="Color Hex" />

              <button type="submit" class="max-btn secondary" [disabled]="categoryForm.invalid">
                ADD SYSTEM
              </button>
            </form>

            <div class="table-responsive mt-4">
              <table class="max-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Icon</th>
                    <th>Color Hex</th>
                    <th class="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cat of systemCategories(); track cat.id) {
                    <tr>
                      <td class="bold-cell">{{ cat.name }}</td>
                      <td>
                        <span class="max-badge" [class.success]="cat.type === 'Income'" [class.secondary]="cat.type === 'Expense'">
                          {{ cat.type }}
                        </span>
                      </td>
                      <td>
                        <mat-icon class="icon-inline">{{ cat.icon }}</mat-icon>
                        <code>{{ cat.icon }}</code>
                      </td>
                      <td>
                        <span class="color-preview" [style.background-color]="cat.color"></span>
                        <code>{{ cat.color }}</code>
                      </td>
                      <td class="text-center">
                        <button class="icon-btn delete" (click)="deleteCategory(cat.id)" title="Delete System Category">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Right: Audit Logs Feed -->
        <div class="right-controls">
          <div class="max-card admin-card accent-glow audit-card">
            <div class="card-header audit-header">
              <div class="title-wrapper">
                <mat-icon class="card-icon" style="color: var(--color-accent);">history_edu</mat-icon>
                <h3>Platform Audit Trail</h3>
              </div>
              <button 
                class="max-btn danger py-1 px-3 clear-btn" 
                (click)="clearAuditLogs()" 
                *ngIf="auditLogs().length > 0">
                Clear Trails
              </button>
            </div>

            <div class="audit-feed">
              @for (log of auditLogs(); track log.id) {
                <div class="audit-item">
                  <div class="audit-meta">
                    <span class="audit-user">{{ log.username }}</span>
                    <span class="audit-time">{{ log.timestamp | date:'short' }}</span>
                  </div>
                  <div class="audit-action-line">
                    <span class="max-badge flat py-1">{{ log.action }}</span>
                    <span class="audit-entity">{{ log.entityName }}</span>
                  </div>
                  <p class="audit-desc">{{ log.changes }}</p>
                  <span class="audit-ip" *ngIf="log.ipAddress">IP: {{ log.ipAddress }}</span>
                </div>
              } @empty {
                <div class="empty-logs">No audit records generated.</div>
              }
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .admin-container {
      width: 100%;
    }

    .stats-row {
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px !important;
      
      .stat-icon-wrapper {
        height: 52px;
        width: 52px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 2px 2px 0px var(--border-color);
        background-color: var(--bg-primary);
        
        .stat-icon {
          font-size: 28px;
          height: 28px;
          width: 28px;
          color: #000;
        }

        &.primary { background-color: var(--color-primary); }
        &.secondary { background-color: var(--color-secondary); .stat-icon { color: #fff; } }
        &.accent { background-color: var(--color-accent); }
        &.success { background-color: var(--color-success); }
        &.db-offline { background-color: var(--color-error); .stat-icon { color: #fff; } }
      }

      .stat-data {
        display: flex;
        flex-direction: column;

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-family: var(--font-family-body);
          font-weight: 700;
          font-size: 24px;
          margin: 4px 0 0 0;
        }

        .db-status-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;

          .status-dot {
            height: 10px;
            width: 10px;
            border-radius: 50%;
            border: 1px solid var(--border-color);
            background-color: var(--color-error);

            &.online {
              background-color: var(--color-success);
            }
          }

          .stat-value {
            margin: 0;
            font-size: 20px;
          }
        }
      }
    }

    .admin-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      
      @media (max-width: 1199px) {
        grid-template-columns: 1fr;
      }
    }

    .left-controls, .right-controls {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .admin-card {
      padding: 24px !important;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 16px;
      
      .card-icon {
        font-size: 28px;
        height: 28px;
        width: 28px;
        color: var(--color-primary);
      }
      
      h3 {
        font-size: 18px;
        margin: 0;
      }

      &.audit-header {
        justify-content: space-between;
        
        .title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .clear-btn {
          font-size: 11px;
          padding: 6px 12px !important;
        }
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
      
      th {
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-weight: 700;
        font-size: 12px;
        padding: 10px 12px;
        border-bottom: 2px solid var(--border-color);
        text-transform: uppercase;
      }
      
      td {
        padding: 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        vertical-align: middle;
      }
    }

    .bold-cell {
      font-weight: 700;
    }

    .status-indicator {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
      
      &.active {
        background-color: rgba(57, 255, 20, 0.1);
        color: var(--color-success);
        border-color: var(--color-success);
      }
    }

    .toggle-btn {
      padding: 4px 10px !important;
      font-size: 11px;
    }

    .category-inline-form {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr auto;
      gap: 8px;
      align-items: center;
      
      @media (max-width: 767px) {
        grid-template-columns: 1fr;
      }
    }

    .max-select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 14px;
      padding-right: 32px;
      cursor: pointer;
    }

    .icon-inline {
      font-size: 16px;
      height: 16px;
      width: 16px;
      vertical-align: middle;
      margin-right: 4px;
    }

    .color-preview {
      display: inline-block;
      height: 12px;
      width: 12px;
      border: 1px solid var(--border-color);
      border-radius: 50%;
      vertical-align: middle;
      margin-right: 6px;
    }

    code {
      font-family: monospace;
      font-weight: 700;
      color: var(--text-secondary);
      font-size: 12px;
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
      box-shadow: 2px 2px 0px var(--border-color);
      transition: all 0.1s ease;
      
      &:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px var(--border-color);
      }
      
      &.delete:hover { background-color: var(--color-error); color: #fff; }
    }

    .mt-4 { margin-top: 16px; }
    .text-center { text-align: center; }

    .audit-card {
      display: flex;
      flex-direction: column;
      max-height: 800px;
    }

    .audit-feed {
      flex-grow: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-right: 4px;
    }

    .empty-logs {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .audit-item {
      padding: 12px;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--bg-primary);
      box-shadow: 3px 3px 0px var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .audit-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      
      .audit-user {
        color: var(--color-primary);
      }
      .audit-time {
        color: var(--text-secondary);
      }
    }

    .audit-action-line {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .audit-entity {
        font-weight: 700;
        font-size: 13px;
        color: var(--text-primary);
        text-transform: uppercase;
      }
    }

    .audit-desc {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.3;
    }

    .audit-ip {
      font-size: 10px;
      color: var(--text-secondary);
      font-family: monospace;
      font-weight: 700;
    }
  `]
})
export class AdminComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // States
  users = signal<User[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  systemCategories = signal<Category[]>([]);
  stats = signal<AdminStats | null>(null);

  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    type: ['Expense', [Validators.required]],
    icon: ['category', [Validators.required]],
    color: ['#cccccc', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadAuditLogs();
    this.loadSystemCategories();
    this.loadStats();
  }

  loadUsers(): void {
    this.apiService.get<User[]>('admin/users').subscribe({
      next: (data) => this.users.set(data)
    });
  }

  loadAuditLogs(): void {
    this.apiService.get<AuditLog[]>('admin/audit-logs').subscribe({
      next: (data) => this.auditLogs.set(data)
    });
  }

  loadSystemCategories(): void {
    this.apiService.get<Category[]>('categories').subscribe({
      next: (cats) => {
        this.systemCategories.set(cats.filter(c => c.isDefault));
      }
    });
  }

  loadStats(): void {
    this.apiService.get<AdminStats>('admin/stats').subscribe({
      next: (data) => this.stats.set(data)
    });
  }

  toggleUserStatus(id: string): void {
    this.apiService.post(`admin/users/${id}/toggle-status`, {}).subscribe({
      next: (res: any) => {
        this.notificationService.showSuccess(res.message || 'User status toggled.');
        this.loadUsers();
        this.loadAuditLogs();
        this.loadStats();
      },
      error: (err) => {
        this.notificationService.showError(err.error?.message || 'Failed to toggle status.');
      }
    });
  }

  createCategory(): void {
    if (this.categoryForm.invalid) return;

    this.apiService.post('admin/categories', this.categoryForm.value).subscribe({
      next: () => {
        this.notificationService.showSuccess('Default category added to platform!');
        this.categoryForm.reset({
          name: '',
          type: 'Expense',
          icon: 'category',
          color: '#cccccc'
        });
        this.loadSystemCategories();
        this.loadAuditLogs();
        this.loadStats();
      },
      error: (err) => {
        this.notificationService.showError(err.error?.message || 'Failed to create default category.');
      }
    });
  }

  deleteCategory(id: string): void {
    if (confirm('Are you sure you want to delete this default category? Platform-wide transactions assigned to it will prevent deletion.')) {
      this.apiService.delete(`admin/categories/${id}`).subscribe({
        next: () => {
          this.notificationService.showSuccess('Default category deleted successfully.');
          this.loadSystemCategories();
          this.loadAuditLogs();
          this.loadStats();
        },
        error: (err) => {
          this.notificationService.showError(err.error?.message || 'Could not delete category.');
        }
      });
    }
  }

  clearAuditLogs(): void {
    if (confirm('Are you sure you want to clear all platform audit trails? This action cannot be undone.')) {
      this.apiService.post('admin/audit-logs/clear', {}).subscribe({
        next: () => {
          this.notificationService.showSuccess('Platform audit trails cleared successfully.');
          this.loadAuditLogs();
          this.loadStats();
        },
        error: (err) => {
          this.notificationService.showError(err.error?.message || 'Failed to clear logs.');
        }
      });
    }
  }
}
