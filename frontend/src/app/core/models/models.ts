export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  preferredCurrency: string;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: string;
  transactionCount?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  preferredCurrency: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  username: string;
  preferredCurrency: string;
  profilePictureUrl?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  username: string;
  email: string;
  role: string;
  preferredCurrency: string;
  profilePictureUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'Income' | 'Expense';
  icon: string;
  color: string;
  isDefault: boolean;
  userId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'Income' | 'Expense';
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  notes?: string;
  receiptUrl?: string;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'UPI' | 'Other';
  isRecurring: boolean;
  recurringInterval: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'None';
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  month: number;
  year: number;
  createdAt: string;
  currentSpending: number;
  percentageUsed: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'In Progress' | 'Completed' | 'Failed';
  createdAt: string;
  progressPercentage: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'BudgetAlert' | 'SavingMilestone' | 'BillReminder' | 'Info';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  entityName: string;
  entityId?: string;
  changes?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface FinancialInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export interface CategorySpend {
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  totalAmount: number;
  percentage: number;
  type: 'Income' | 'Expense';
}

export interface MonthlyCashFlow {
  monthName: string;
  month: number;
  year: number;
  income: number;
  expense: number;
  savings: number;
}

export interface DashboardSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  budgetProgressPercent: number;
  recentTransactions: Transaction[];
  expenseCategoryDistribution: CategorySpend[];
  incomeCategoryDistribution: CategorySpend[];
  monthlyCashFlows: MonthlyCashFlow[];
  insights: FinancialInsight[];
}
