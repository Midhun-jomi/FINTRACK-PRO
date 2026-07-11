using System;

namespace FinTrack.Api.Entities
{
    public class AuditLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid? UserId { get; set; } // Null if performed by system or unauthenticated user
        public string Action { get; set; } = string.Empty; // "Create", "Update", "Delete", "Login", etc.
        public string EntityName { get; set; } = string.Empty; // e.g., "Transaction"
        public Guid? EntityId { get; set; }
        public string? Changes { get; set; } // JSON list of changes or simple description
        public string? IpAddress { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Navigation
        public User? User { get; set; }
    }
}
