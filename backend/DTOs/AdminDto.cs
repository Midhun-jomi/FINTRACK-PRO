using System;

namespace FinTrack.Api.DTOs
{
    public class UserManagementResponse
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string PreferredCurrency { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TransactionCount { get; set; }
    }

    public class AuditLogResponse
    {
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public string Username { get; set; } = "System";
        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public Guid? EntityId { get; set; }
        public string? Changes { get; set; }
        public string? IpAddress { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
