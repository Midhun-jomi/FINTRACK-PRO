import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { nonAuthGuard } from './core/guards/non-auth.guard';

export const routes: Routes = [
  // Authentication Routes (Non-Authenticated)
  {
    path: 'auth/login',
    canActivate: [nonAuthGuard],
    loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    canActivate: [nonAuthGuard],
    loadComponent: () => import('./features/auth/register').then(m => m.RegisterComponent)
  },
  {
    path: 'auth/forgot-password',
    canActivate: [nonAuthGuard],
    loadComponent: () => import('./features/auth/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    canActivate: [nonAuthGuard],
    loadComponent: () => import('./features/auth/reset-password').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'auth/verify',
    canActivate: [nonAuthGuard],
    loadComponent: () => import('./features/auth/verify-email').then(m => m.VerifyEmailComponent)
  },

  // Main Core Dashboard Features (Authenticated Layout Children)
  {
    path: '',
    loadComponent: () => import('./features/layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'income',
        loadComponent: () => import('./features/income/income').then(m => m.IncomeComponent)
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/expense/expense').then(m => m.ExpenseComponent)
      },
      {
        path: 'budget',
        loadComponent: () => import('./features/budget/budget').then(m => m.BudgetComponent)
      },
      {
        path: 'savings',
        loadComponent: () => import('./features/savings/savings').then(m => m.SavingsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.ReportsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent)
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin').then(m => m.AdminComponent)
      }
    ]
  },

  // Redirect invalid routes to Dashboard
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
