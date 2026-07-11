using System.Collections.Generic;

namespace FinTrack.Api.DTOs
{
    public class CategorySpend
    {
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryColor { get; set; } = string.Empty;
        public string CategoryIcon { get; set; } = string.Empty;
        public double TotalAmount { get; set; }
        public double Percentage { get; set; }
        public string Type { get; set; } = "Expense"; // "Income" or "Expense"
    }

    public class MonthlyCashFlow
    {
        public string MonthName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public double Income { get; set; }
        public double Expense { get; set; }
        public double Savings => Income - Expense;
    }

    public class FinancialInsight
    {
        public string Type { get; set; } = "info"; // "warning", "success", "info"
        public string Message { get; set; } = string.Empty;
    }

    public class DashboardSummaryResponse
    {
        public double CurrentBalance { get; set; }
        public double TotalIncome { get; set; }
        public double TotalExpenses { get; set; }
        public double TotalSavings { get; set; }
        public double BudgetProgressPercent { get; set; }
        public List<TransactionResponse> RecentTransactions { get; set; } = new();
        public List<CategorySpend> ExpenseCategoryDistribution { get; set; } = new();
        public List<CategorySpend> IncomeCategoryDistribution { get; set; } = new();
        public List<MonthlyCashFlow> MonthlyCashFlows { get; set; } = new();
        public List<FinancialInsight> Insights { get; set; } = new();
    }
}
