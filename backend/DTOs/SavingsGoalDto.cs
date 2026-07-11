using System;

namespace FinTrack.Api.DTOs
{
    public class SavingsGoalCreateRequest
    {
        public string Name { get; set; } = string.Empty;
        public double TargetAmount { get; set; }
        public double CurrentAmount { get; set; }
        public DateTime Deadline { get; set; }
    }

    public class SavingsGoalResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public double TargetAmount { get; set; }
        public double CurrentAmount { get; set; }
        public DateTime Deadline { get; set; }
        public string Status { get; set; } = string.Empty; // "In Progress", "Completed", "Failed"
        public DateTime CreatedAt { get; set; }
        public double ProgressPercentage { get; set; }
    }
}
