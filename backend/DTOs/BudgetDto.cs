using System;

namespace FinTrack.Api.DTOs
{
    public class BudgetCreateRequest
    {
        public Guid? CategoryId { get; set; } // Null for overall budget limit
        public double MonthlyLimit { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class BudgetResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid? CategoryId { get; set; }
        public string CategoryName { get; set; } = "Overall";
        public string CategoryColor { get; set; } = "#cccccc";
        public double MonthlyLimit { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public DateTime CreatedAt { get; set; }
        public double CurrentSpending { get; set; }
        public double PercentageUsed { get; set; }
    }
}
