using System;

namespace FinTrack.Api.DTOs
{
    public class NotificationResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "BudgetAlert", "SavingMilestone", "BillReminder", "Info"
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
