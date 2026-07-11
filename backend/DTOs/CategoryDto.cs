using System;

namespace FinTrack.Api.DTOs
{
    public class CategoryCreateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Expense"; // "Income" or "Expense"
        public string Icon { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }

    public class CategoryResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public Guid? UserId { get; set; }
    }
}
