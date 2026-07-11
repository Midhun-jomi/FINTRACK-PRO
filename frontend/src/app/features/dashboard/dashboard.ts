import { Component, OnInit, inject, signal, effect, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardSummary } from '../../core/models/models';
import { Chart } from 'chart.js/auto';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
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
    <div class="dashboard-container">
      
      <!-- Loading Skeleton -->
      @if (isLoading()) {
        <div class="skeleton-grid max-grid">
          <div class="max-card skeleton" style="height: 120px;"></div>
          <div class="max-card skeleton" style="height: 120px;"></div>
          <div class="max-card skeleton" style="height: 120px;"></div>
          <div class="max-card skeleton" style="height: 120px;"></div>
        </div>
        <div class="max-card skeleton" style="height: 400px; margin-top: 24px;"></div>
      } @else {
        
        <!-- Metrics Row -->
        <div class="metrics-row max-grid">
          <div class="max-card metric-card primary-glow">
            <div class="metric-icon-box primary"><mat-icon>account_balance_wallet</mat-icon></div>
            <div class="metric-data">
              <span class="metric-label">Current Balance</span>
              <h2 class="metric-value">{{ summary()?.currentBalance | currency:currencyCode() }}</h2>
            </div>
          </div>

          <div class="max-card metric-card success-glow">
            <div class="metric-icon-box success"><mat-icon>trending_up</mat-icon></div>
            <div class="metric-data">
              <span class="metric-label">Total Incomes</span>
              <h2 class="metric-value text-success">+{{ summary()?.totalIncome | currency:currencyCode() }}</h2>
            </div>
          </div>

          <div class="max-card metric-card secondary-glow">
            <div class="metric-icon-box secondary"><mat-icon>trending_down</mat-icon></div>
            <div class="metric-data">
              <span class="metric-label">Total Expenses</span>
              <h2 class="metric-value text-danger">-{{ summary()?.totalExpenses | currency:currencyCode() }}</h2>
            </div>
          </div>

          <div class="max-card metric-card accent-glow">
            <div class="metric-icon-box accent"><mat-icon>track_changes</mat-icon></div>
            <div class="metric-data">
              <span class="metric-label">Saved Goals Pot</span>
              <h2 class="metric-value text-accent">{{ summary()?.totalSavings | currency:currencyCode() }}</h2>
            </div>
          </div>
        </div>

        <!-- Charts Layout Row -->
        <div class="charts-row">
          <div class="max-card chart-card cashflow-widget">
            <h3>Income vs Expense (6-Month Trend)</h3>
            <div class="canvas-container">
              <canvas id="cashflowChart"></canvas>
            </div>
          </div>

          <div class="max-card chart-card distribution-widget">
            <h3>Expense Category Split</h3>
            <div class="canvas-container">
              @if (summary()?.expenseCategoryDistribution?.length === 0) {
                <div class="empty-chart">No expenses logged yet.</div>
              }
              <canvas id="categoryChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Detailed Status Widgets Row -->
        <div class="widgets-row">
          <!-- Left: Recent Ledger & Alerts -->
          <div class="left-widgets">
            <!-- Budget utilization -->
            <div class="max-card budget-widget">
              <div class="widget-header">
                <h3>Monthly Budget Status</h3>
                <a routerLink="/budget" class="max-badge primary">Adjust Limit</a>
              </div>
              <div class="budget-progress-container">
                <div class="budget-info">
                  <span>Overall Spending Limit</span>
                  <span class="budget-stats">{{ summary()?.budgetProgressPercent }}% Used</span>
                </div>
                <!-- Neo-Brutalist Progress Bar -->
                <div class="max-progress-bar">
                  <div class="progress-fill" [style.width.%]="summary()?.budgetProgressPercent"
                       [class.warning]="(summary()?.budgetProgressPercent || 0) >= 80"
                       [class.critical]="(summary()?.budgetProgressPercent || 0) >= 100"></div>
                </div>
                <p class="budget-caption" *ngIf="(summary()?.budgetProgressPercent || 0) >= 80">
                  ⚠️ You are close to exceeding your monthly spending limits!
                </p>
              </div>
            </div>

            <!-- Recent Transactions Table -->
            <div class="max-card recent-widget">
              <div class="widget-header">
                <h3>Recent Transactions</h3>
                <a routerLink="/expenses" class="max-badge secondary">All Logs</a>
              </div>
              
              <div class="recent-list">
                @if (summary()?.recentTransactions?.length === 0) {
                  <div class="empty-list">No transactions. Start logging your income/expenses!</div>
                } @else {
                  @for (item of summary()?.recentTransactions; track item.id) {
                    <div class="transaction-item">
                      <div class="item-left">
                        <div class="cat-icon-badge" [style.background-color]="item.categoryColor">
                          <mat-icon>{{ item.categoryIcon }}</mat-icon>
                        </div>
                        <div class="item-details">
                          <span class="item-name">{{ item.categoryName }}</span>
                          <span class="item-date">{{ item.date | date:'mediumDate' }}</span>
                        </div>
                      </div>
                      <div class="item-right">
                        <span class="item-amount" [class.income]="item.type === 'Income'" [class.expense]="item.type === 'Expense'">
                          {{ item.type === 'Income' ? '+' : '-' }}{{ item.amount | currency:currencyCode() }}
                        </span>
                        <span class="max-badge flat py-1">{{ item.paymentMethod }}</span>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- Right: Insights & Tips -->
          <div class="right-widgets">
            <div class="max-card insights-widget">
              <h3>FinTrack Smart Insights</h3>
              <div class="insights-list">
                @for (insight of summary()?.insights; track insight.message) {
                  <div class="insight-card" [class]="insight.type">
                    <mat-icon class="insight-icon">
                      {{ insight.type === 'success' ? 'check_circle' : insight.type === 'warning' ? 'error' : 'info' }}
                    </mat-icon>
                    <p class="insight-text">{{ insight.message }}</p>
                  </div>
                }
              </div>
            </div>
            
            <div class="max-card banner-widget">
              <h3>Quick Receipt Upload</h3>
              <p>Uploaded receipts auto-attach to transactions for audit logs.</p>
              <button mat-button routerLink="/expenses" class="max-btn accent full-width">Upload Receipt Image</button>
            </div>
          </div>
        </div>

      }

    </div>
  `,
  styles: [`
    .dashboard-container {
      width: 100%;
    }

    .metrics-row {
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px !important;
      
      .metric-icon-box {
        height: 52px;
        width: 52px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 2px 2px 0px var(--border-color);
        
        mat-icon {
          font-size: 28px;
          height: 28px;
          width: 28px;
        }

        &.primary { background-color: var(--color-primary); color: #000; }
        &.success { background-color: var(--color-success); color: #000; }
        &.secondary { background-color: var(--color-secondary); color: #fff; }
        &.accent { background-color: var(--color-accent); color: #000; }
      }

      .metric-data {
        display: flex;
        flex-direction: column;
        
        .metric-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .metric-value {
          font-family: var(--font-family-body);
          font-weight: 700;
          font-size: 24px;
          margin: 4px 0 0 0;
          
          &.text-success { color: var(--color-success); }
          &.text-danger { color: var(--color-secondary); }
          &.text-accent { color: var(--color-accent); }
          
          body.dark-theme &.text-danger { color: var(--color-secondary); }
        }
      }
    }

    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
      
      @media (max-width: 959px) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card {
      h3 {
        font-size: 18px;
        margin-bottom: 20px;
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 8px;
      }
    }

    .canvas-container {
      position: relative;
      height: 300px;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      
      .empty-chart {
        position: absolute;
        font-weight: 700;
        color: var(--text-secondary);
      }
    }

    .widgets-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      
      @media (max-width: 959px) {
        grid-template-columns: 1fr;
      }
    }

    .left-widgets, .right-widgets {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 8px;
      
      h3 {
        margin: 0;
        font-size: 18px;
      }
      
      a {
        text-decoration: none;
      }
    }

    // Neo-Brutalist Progress Bar
    .budget-progress-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .budget-info {
        display: flex;
        justify-content: space-between;
        font-weight: 700;
        font-size: 15px;
      }
      
      .max-progress-bar {
        width: 100%;
        height: 24px;
        background-color: var(--bg-primary);
        border: 2px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 2px 2px 0px var(--border-color);
        
        .progress-fill {
          height: 100%;
          background-color: var(--color-primary);
          border-right: 2px solid var(--border-color);
          transition: width 0.4s ease-out;
          
          &.warning {
            background-color: var(--color-warning);
          }
          &.critical {
            background-color: var(--color-secondary);
          }
        }
      }
      
      .budget-caption {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-warning);
      }
    }

    // Transaction list widget
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .empty-list {
        padding: 20px;
        text-align: center;
        color: var(--text-secondary);
        font-weight: 500;
      }
    }

    .transaction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--bg-primary);
      box-shadow: 2px 2px 0px var(--border-color);
      
      .item-left {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .cat-icon-badge {
          height: 38px;
          width: 38px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #000000;
          
          mat-icon {
            font-size: 20px;
            height: 20px;
            width: 20px;
          }
        }
        
        .item-details {
          display: flex;
          flex-direction: column;
          
          .item-name {
            font-weight: 700;
            font-size: 15px;
          }
          .item-date {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 2px;
          }
        }
      }
      
      .item-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        
        .item-amount {
          font-family: var(--font-family-body);
          font-weight: 700;
          font-size: 16px;
          
          &.income { color: var(--color-success); }
          &.expense { color: var(--color-secondary); }
          body.dark-theme &.expense { color: var(--color-secondary); }
        }
      }
    }

    // Insights List Widget
    .insights-widget {
      h3 {
        font-size: 18px;
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 8px;
        margin-bottom: 16px;
      }
    }

    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .insight-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 2px 2px 0px var(--border-color);
      
      .insight-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .insight-text {
        font-size: 13px;
        font-weight: 700;
        margin: 0;
        line-height: 1.4;
      }
      
      &.success {
        background-color: rgba(57, 255, 20, 0.05);
        .insight-icon { color: var(--color-success); }
      }
      &.warning {
        background-color: rgba(255, 95, 31, 0.05);
        .insight-icon { color: var(--color-warning); }
      }
      &.info {
        background-color: rgba(0, 240, 255, 0.05);
        .insight-icon { color: var(--color-primary); }
      }
    }

    .banner-widget {
      border-color: var(--color-accent);
      
      h3 {
        color: var(--color-accent);
        border-color: var(--border-color);
      }
      
      p {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 16px;
      }
    }
    
    .full-width {
      width: 100%;
      justify-content: center;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  // States
  isLoading = signal<boolean>(true);
  summary = signal<DashboardSummary | null>(null);

  // Currencies
  currencyCode = computed(() => this.authService.currentUser()?.preferredCurrency || 'INR');

  // Chart instances
  private cashflowChart: Chart | null = null;
  private categoryChart: Chart | null = null;

  constructor() {
    // Redraw charts if the theme switches, using an effect
    effect(() => {
      const dark = this.themeService.isDark();
      const currentSummary = this.summary();
      if (currentSummary) {
        // Yield to browser thread to make sure DOM classes updated
        setTimeout(() => this.createCharts(currentSummary), 50);
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Handled in effects & load success
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.apiService.get<DashboardSummary>('reports/dashboard').subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
        // Build charts
        setTimeout(() => this.createCharts(data), 100);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private createCharts(data: DashboardSummary): void {
    const isDark = this.themeService.isDark();
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    // 1. Destroy existing charts to prevent overlaps
    if (this.cashflowChart) this.cashflowChart.destroy();
    if (this.categoryChart) this.categoryChart.destroy();

    // 2. Build Cashflow Trend Chart
    const ctxCashflow = document.getElementById('cashflowChart') as HTMLCanvasElement;
    if (ctxCashflow) {
      this.cashflowChart = new Chart(ctxCashflow, {
        type: 'bar',
        data: {
          labels: data.monthlyCashFlows.map(cf => cf.monthName),
          datasets: [
            {
              label: 'Income',
              data: data.monthlyCashFlows.map(cf => cf.income),
              backgroundColor: isDark ? '#39ff14' : '#10b981', // Radioactive green or Emerald
              borderColor: '#000000',
              borderWidth: 2,
              borderRadius: 4
            },
            {
              label: 'Expense',
              data: data.monthlyCashFlows.map(cf => cf.expense),
              backgroundColor: isDark ? '#ff007f' : '#f43f5e', // Neon hot pink or Rose
              borderColor: '#000000',
              borderWidth: 2,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: textColor,
                font: { family: 'Space Grotesk', weight: 'bold', size: 12 }
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } }
            }
          }
        }
      });
    }

    // 3. Build Expense Category split
    const ctxCategory = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (ctxCategory && data.expenseCategoryDistribution?.length > 0) {
      this.categoryChart = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
          labels: data.expenseCategoryDistribution.map(c => c.categoryName),
          datasets: [{
            data: data.expenseCategoryDistribution.map(c => c.totalAmount),
            backgroundColor: data.expenseCategoryDistribution.map(c => c.categoryColor),
            borderColor: '#000000',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                font: { family: 'Space Grotesk', weight: 'bold', size: 11 }
              }
            }
          }
        }
      });
    }
  }
}
