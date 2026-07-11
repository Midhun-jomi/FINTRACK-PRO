namespace FinTrack.Api.DTOs
{
    public class AdminStatsResponse
    {
        public int TotalUsers { get; set; }
        public int TotalTransactions { get; set; }
        public int TotalSavingsGoals { get; set; }
        public string DatabaseProvider { get; set; } = string.Empty;
        public bool IsDatabaseOnline { get; set; }
    }
}
