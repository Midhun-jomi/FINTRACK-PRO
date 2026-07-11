using System;

namespace FinTrack.Api.Entities
{
    public class Budget
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid? CategoryId { get; set; } // Null represents an overall monthly budget limit
        public double MonthlyLimit { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; } = null!;
        public Category? Category { get; set; }
    }
}
