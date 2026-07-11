using System;

namespace FinTrack.Api.Entities
{
    public class Transaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public double Amount { get; set; }
        public string Type { get; set; } = "Expense"; // "Income" or "Expense"
        public Guid CategoryId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        public string? ReceiptUrl { get; set; }
        public string PaymentMethod { get; set; } = "Card"; // "Cash", "Card", "Transfer", "UPI", "Other"
        public bool IsRecurring { get; set; } = false;
        public string RecurringInterval { get; set; } = "None"; // "Daily", "Weekly", "Monthly", "Yearly", "None"

        // Navigation
        public User User { get; set; } = null!;
        public Category Category { get; set; } = null!;
    }
}
