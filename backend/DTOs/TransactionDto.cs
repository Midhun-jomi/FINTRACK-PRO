using System;

namespace FinTrack.Api.DTOs
{
    public class TransactionCreateRequest
    {
        public double Amount { get; set; }
        public string Type { get; set; } = "Expense"; // "Income" or "Expense"
        public Guid CategoryId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        public string? ReceiptUrl { get; set; }
        public string PaymentMethod { get; set; } = "Card"; // "Cash", "Card", "Transfer", "UPI", "Other"
        public bool IsRecurring { get; set; } = false;
        public string RecurringInterval { get; set; } = "None"; // "Daily", "Weekly", "Monthly", "Yearly", "None"
    }

    public class TransactionResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public double Amount { get; set; }
        public string Type { get; set; } = string.Empty;
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryIcon { get; set; } = string.Empty;
        public string CategoryColor { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? Notes { get; set; }
        public string? ReceiptUrl { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public bool IsRecurring { get; set; }
        public string RecurringInterval { get; set; } = string.Empty;
    }
}
