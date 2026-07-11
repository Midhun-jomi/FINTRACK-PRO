using System;

namespace FinTrack.Api.Entities
{
    public class SavingsGoal
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public double TargetAmount { get; set; }
        public double CurrentAmount { get; set; }
        public DateTime Deadline { get; set; }
        public string Status { get; set; } = "In Progress"; // "In Progress", "Completed", "Failed"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; } = null!;
    }
}
