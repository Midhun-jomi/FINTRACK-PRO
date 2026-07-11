import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="reports-container">
      
      <div class="intro-card max-card primary-glow">
        <mat-icon class="intro-icon">analytics</mat-icon>
        <h2>Financial Reports & Data Management</h2>
        <p>Export your platform ledger records, download printable summaries, or bulk import historical statements via CSV.</p>
      </div>

      <div class="reports-grid max-grid">
        
        <!-- Document Exports Card -->
        <div class="max-card report-card">
          <div class="card-header">
            <mat-icon class="card-icon">picture_as_pdf</mat-icon>
            <h3>Document & Print Exports</h3>
          </div>
          <p class="card-desc">Download styled financial summaries suitable for printing or record keeping.</p>
          <div class="button-stack">
            <button mat-button class="max-btn full-width" (click)="exportReport('export/pdf', 'fintrack_financial_report.txt')">
              <mat-icon>description</mat-icon>
              <span>DOWNLOAD PDF TEXT REPORT</span>
            </button>
            <button mat-button class="max-btn flat full-width btn-print" (click)="triggerPrint()">
              <mat-icon>print</mat-icon>
              <span>PRINT CURRENT DASHBOARD</span>
            </button>
          </div>
        </div>

        <!-- Spreadsheet Exports Card -->
        <div class="max-card report-card">
          <div class="card-header">
            <mat-icon class="card-icon">table_view</mat-icon>
            <h3>Spreadsheet Exports</h3>
          </div>
          <p class="card-desc">Export your raw data streams directly to CSV or Microsoft Excel formats.</p>
          <div class="button-stack">
            <button mat-button class="max-btn secondary full-width" (click)="exportReport('export/csv', 'fintrack_ledger_export.csv')">
              <mat-icon>article</mat-icon>
              <span>EXPORT TO CSV FORMAT</span>
            </button>
            <button mat-button class="max-btn flat full-width" (click)="exportReport('export/excel', 'fintrack_ledger_export.xls')">
              <mat-icon>grid_on</mat-icon>
              <span>EXPORT TO EXCEL (XLS)</span>
            </button>
          </div>
        </div>

        <!-- Data Import Card -->
        <div class="max-card report-card accent-glow">
          <div class="card-header">
            <mat-icon class="card-icon" style="color: var(--color-accent);">cloud_upload</mat-icon>
            <h3>Import Transactions</h3>
          </div>
          <p class="card-desc">Bulk upload bank statements using a standard comma-separated CSV format.</p>
          
          <div class="import-wrapper">
            <input type="file" #csvInput style="display:none" (change)="onFileSelected($event)" accept=".csv" />
            
            <button mat-button class="max-btn accent full-width" (click)="csvInput.click()" [disabled]="isImporting()">
              <mat-progress-spinner *ngIf="isImporting()" mode="indeterminate" diameter="20" class="spinner"></mat-progress-spinner>
              <span>{{ isImporting() ? 'PARSING CSV STATEMENTS...' : 'UPLOAD CSV FILE' }}</span>
            </button>

            <!-- Sample CSV Tip -->
            <div class="csv-tip-box">
              <span class="tip-header">Expected Headers:</span>
              <code>Date,Type,Amount,Category,PaymentMethod,Notes</code>
              <span class="tip-example">Example: 2026-07-10,Expense,50.00,Food,Card,"Lunch"</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .reports-container {
      width: 100%;
    }

    .intro-card {
      padding: 32px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
      
      .intro-icon {
        font-size: 56px;
        height: 56px;
        width: 56px;
        color: #000;
        margin-bottom: 12px;
      }
      
      h2 {
        font-size: 26px;
        color: #000;
        margin-bottom: 8px;
      }
      
      p {
        font-size: 15px;
        font-weight: 700;
        color: #000;
        opacity: 0.8;
        max-width: 600px;
      }
      
      body.dark-theme & {
        .intro-icon, h2, p { color: #000; }
      }
    }

    .report-card {
      padding: 24px !important;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 280px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 12px;
      
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
    }

    .card-desc {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.4;
      flex-grow: 1;
    }

    .button-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .full-width {
      width: 100%;
      justify-content: center;
    }

    .btn-print {
      border-color: var(--border-color);
    }

    .import-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      .spinner {
        margin-right: 8px;
      }
    }

    .csv-tip-box {
      background-color: var(--bg-primary);
      border: 2px dashed var(--border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .tip-header {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      
      code {
        font-family: monospace;
        font-size: 11px;
        font-weight: 700;
        color: var(--color-secondary);
        word-break: break-all;
      }
      
      .tip-example {
        font-size: 10px;
        color: var(--text-secondary);
        opacity: 0.8;
      }
    }
  `]
})
export class ReportsComponent {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  isImporting = signal<boolean>(false);

  exportReport(endpoint: string, filename: string): void {
    const url = `http://localhost:5269/api/reports/${endpoint}`;
    
    // Request raw binary blob from backend
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.notificationService.showSuccess('Report downloaded successfully!');
      },
      error: () => {
        this.notificationService.showError('Failed to generate report export.');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isImporting.set(true);
    const formData = new FormData();
    formData.append('file', file);

    const url = 'http://localhost:5269/api/reports/import/csv';
    this.http.post<any>(url, formData).subscribe({
      next: (res) => {
        this.isImporting.set(false);
        this.notificationService.showSuccess(res.message || 'CSV statements imported successfully!');
      },
      error: (err) => {
        this.isImporting.set(false);
        this.notificationService.showError(err.error?.message || 'Failed to import statements.');
      }
    });
  }

  triggerPrint(): void {
    window.print();
  }
}
