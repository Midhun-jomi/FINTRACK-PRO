using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinTrack.Api.Data;
using FinTrack.Api.DTOs;
using FinTrack.Api.Entities;
using FinTrack.Api.Services;

namespace FinTrack.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/reports")]
    public class ReportController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;

        public ReportController(
            FinTrackDbContext context,
            IMapper mapper,
            IAuditLogService auditLogService)
        {
            _context = context;
            _mapper = mapper;
            _auditLogService = auditLogService;
        }

        private Guid GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User is not authorized.");
            }
            return userId;
        }

        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(DashboardSummaryResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var userId = GetCurrentUserId();

            // Fetch user transactions
            var transactions = await _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            var balance = totalIncome - totalExpense;

            // Fetch savings goals target and savings current
            var savingsGoals = await _context.SavingsGoals
                .Where(g => g.UserId == userId)
                .ToListAsync();
            var totalSavings = savingsGoals.Sum(g => g.CurrentAmount);

            // Fetch active budgets
            var month = DateTime.UtcNow.Month;
            var year = DateTime.UtcNow.Year;
            var budgets = await _context.Budgets
                .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
                .ToListAsync();

            var overallBudget = budgets.FirstOrDefault(b => b.CategoryId == null);
            var budgetProgressPercent = 0.0;
            if (overallBudget != null && overallBudget.MonthlyLimit > 0)
            {
                var currentMonthlyExpense = transactions
                    .Where(t => t.Type == "Expense" && t.Date.Month == month && t.Date.Year == year)
                    .Sum(t => t.Amount);
                budgetProgressPercent = Math.Round((currentMonthlyExpense / overallBudget.MonthlyLimit) * 100, 2);
            }
            else if (budgets.Any(b => b.CategoryId.HasValue))
            {
                // Average category-wise budget progress
                var progressSum = 0.0;
                var count = 0;
                foreach (var b in budgets.Where(b => b.CategoryId.HasValue))
                {
                    var spend = transactions
                        .Where(t => t.CategoryId == b.CategoryId && t.Date.Month == month && t.Date.Year == year)
                        .Sum(t => t.Amount);
                    progressSum += (spend / b.MonthlyLimit) * 100;
                    count++;
                }
                budgetProgressPercent = count > 0 ? Math.Round(progressSum / count, 2) : 0;
            }

            // Recent transactions (Top 5)
            var recentTransactions = transactions.Take(5).ToList();

            // Calculate category distributions
            var categoryDistribution = transactions
                .GroupBy(t => new { t.CategoryId, t.Category.Name, t.Category.Color, t.Category.Icon, t.Type })
                .Select(g => new CategorySpend
                {
                    CategoryName = g.Key.Name,
                    CategoryColor = g.Key.Color,
                    CategoryIcon = g.Key.Icon,
                    TotalAmount = g.Sum(t => t.Amount),
                    Type = g.Key.Type,
                    Percentage = g.Key.Type == "Income" 
                        ? (totalIncome > 0 ? Math.Round((g.Sum(t => t.Amount) / totalIncome) * 100, 2) : 0)
                        : (totalExpense > 0 ? Math.Round((g.Sum(t => t.Amount) / totalExpense) * 100, 2) : 0)
                })
                .ToList();

            // Calculate cash flows for last 6 months
            var monthlyCashFlows = new List<MonthlyCashFlow>();
            for (int i = 5; i >= 0; i--)
            {
                var targetDate = DateTime.UtcNow.AddMonths(-i);
                var targetMonth = targetDate.Month;
                var targetYear = targetDate.Year;

                var income = transactions
                    .Where(t => t.Type == "Income" && t.Date.Month == targetMonth && t.Date.Year == targetYear)
                    .Sum(t => t.Amount);
                var expense = transactions
                    .Where(t => t.Type == "Expense" && t.Date.Month == targetMonth && t.Date.Year == targetYear)
                    .Sum(t => t.Amount);

                monthlyCashFlows.Add(new MonthlyCashFlow
                {
                    MonthName = targetDate.ToString("MMMM"),
                    Month = targetMonth,
                    Year = targetYear,
                    Income = income,
                    Expense = expense
                });
            }

            // Generate Insights
            var insights = new List<FinancialInsight>();

            if (totalIncome > 0)
            {
                var savingsRate = (totalIncome - totalExpense) / totalIncome * 100;
                if (savingsRate >= 20)
                {
                    insights.Add(new FinancialInsight { Type = "success", Message = $"Awesome! Your savings rate is {savingsRate:F1}%. That exceeds the standard 20% savings threshold." });
                }
                else if (savingsRate > 0)
                {
                    insights.Add(new FinancialInsight { Type = "info", Message = $"Your savings rate is {savingsRate:F1}%. Try reducing shopping or dining out to reach a 20% target." });
                }
                else
                {
                    insights.Add(new FinancialInsight { Type = "warning", Message = "Critical: You spent more than you earned this month! Audit your expenses to halt active cash deficits." });
                }
            }

            // Food or shopping spending heavy check
            var foodSpend = categoryDistribution.FirstOrDefault(c => c.CategoryName.Equals("Food", StringComparison.OrdinalIgnoreCase) && c.Type == "Expense");
            if (foodSpend != null && foodSpend.Percentage > 30)
            {
                insights.Add(new FinancialInsight { Type = "warning", Message = $"Dining & Groceries consume {foodSpend.Percentage:F1}% of your total expenses. Consider setting a specific Food budget limit." });
            }

            // Budget alert check
            if (budgetProgressPercent >= 90)
            {
                insights.Add(new FinancialInsight { Type = "warning", Message = $"Critical: You have utilized {budgetProgressPercent}% of your monthly budget limit. Halt non-essential purchases." });
            }

            if (!insights.Any())
            {
                insights.Add(new FinancialInsight { Type = "info", Message = "FinTrack Insights: Log your daily expenses to receive customized saving tips." });
            }

            var response = new DashboardSummaryResponse
            {
                CurrentBalance = balance,
                TotalIncome = totalIncome,
                TotalExpenses = totalExpense,
                TotalSavings = totalSavings,
                BudgetProgressPercent = Math.Min(100.0, budgetProgressPercent),
                RecentTransactions = _mapper.Map<List<TransactionResponse>>(recentTransactions),
                ExpenseCategoryDistribution = categoryDistribution.Where(c => c.Type == "Expense").ToList(),
                IncomeCategoryDistribution = categoryDistribution.Where(c => c.Type == "Income").ToList(),
                MonthlyCashFlows = monthlyCashFlows,
                Insights = insights
            };

            return Ok(response);
        }

        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var userId = GetCurrentUserId();
            var transactions = await _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var builder = new StringBuilder();
            builder.AppendLine("Date,Type,Amount,Category,PaymentMethod,Notes");

            foreach (var t in transactions)
            {
                builder.AppendLine($"{t.Date:yyyy-MM-dd HH:mm},{t.Type},{t.Amount},{t.Category.Name},{t.PaymentMethod},\"{t.Notes?.Replace("\"", "\"\"")}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(builder.ToString());
            return File(bytes, "text/csv", $"fintrack_report_{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        [HttpPost("import/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ImportCsv(IFormFile file)
        {
            var userId = GetCurrentUserId();
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Message = "No file uploaded." });
            }

            using var reader = new StreamReader(file.OpenReadStream());
            var headerLine = await reader.ReadLineAsync(); // skip header
            var lineCount = 0;
            var importedCount = 0;

            var defaultCategories = await _context.Categories
                .Where(c => c.IsDefault || c.UserId == userId)
                .ToListAsync();

            var transactionsToAdd = new List<Transaction>();

            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                lineCount++;

                var parts = line.Split(',');
                if (parts.Length < 4) continue;

                // Parse fields
                if (!DateTime.TryParse(parts[0], out var date)) continue;
                var type = parts[1].Trim();
                if (type != "Income" && type != "Expense") continue;
                if (!double.TryParse(parts[2], out var amount)) continue;
                var categoryName = parts[3].Trim();
                var paymentMethod = parts.Length > 4 ? parts[4].Trim() : "Card";
                var notes = parts.Length > 5 ? parts[5].Trim().Trim('"') : "";

                // Find or create category
                var category = defaultCategories.FirstOrDefault(c => c.Name.Equals(categoryName, StringComparison.OrdinalIgnoreCase) && c.Type.Equals(type, StringComparison.OrdinalIgnoreCase));
                if (category == null)
                {
                    category = new Category
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Name = categoryName,
                        Type = type,
                        Icon = type == "Income" ? "work" : "shopping_bag",
                        Color = type == "Income" ? "#10b981" : "#f43f5e"
                    };
                    await _context.Categories.AddAsync(category);
                    await _context.SaveChangesAsync();
                    defaultCategories.Add(category);
                }

                var transaction = new Transaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Amount = amount,
                    Type = type,
                    CategoryId = category.Id,
                    Date = date,
                    Notes = notes,
                    PaymentMethod = paymentMethod
                };
                transactionsToAdd.Add(transaction);
                importedCount++;
            }

            if (transactionsToAdd.Any())
            {
                await _context.Transactions.AddRangeAsync(transactionsToAdd);
                await _context.SaveChangesAsync();
            }

            await _auditLogService.LogActionAsync(userId, "ImportTransactions", "Transaction", null, $"Imported {importedCount} transactions from CSV");

            return Ok(new { Message = $"Successfully imported {importedCount} transactions.", TotalRows = lineCount });
        }

        [HttpGet("export/pdf")]
        public async Task<IActionResult> ExportPdf()
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            var transactions = await _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            var balance = totalIncome - totalExpense;

            // Generate structured text acting as clean printable PDF export template
            var builder = new StringBuilder();
            builder.AppendLine("==========================================================================");
            builder.AppendLine("                      FINTRACK PRO - FINANCIAL REPORT                     ");
            builder.AppendLine("==========================================================================");
            builder.AppendLine($"Report Generated At : {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            builder.AppendLine($"User Profile        : {user.Username} ({user.Email})");
            builder.AppendLine($"Default Currency    : {user.PreferredCurrency}");
            builder.AppendLine("--------------------------------------------------------------------------");
            builder.AppendLine("SUMMARY SUMMARY");
            builder.AppendLine($"  Total Incomes     : {totalIncome:N2} {user.PreferredCurrency}");
            builder.AppendLine($"  Total Expenses    : {totalExpense:N2} {user.PreferredCurrency}");
            builder.AppendLine($"  Net Balance       : {balance:N2} {user.PreferredCurrency}");
            builder.AppendLine("--------------------------------------------------------------------------");
            builder.AppendLine("TRANSACTION DETAILS");
            builder.AppendLine("Date       | Type    | Amount     | Category        | Notes");
            builder.AppendLine("--------------------------------------------------------------------------");

            foreach (var t in transactions.Take(100)) // Limit to top 100
            {
                var notes = t.Notes != null && t.Notes.Length > 20 ? t.Notes.Substring(0, 17) + "..." : t.Notes ?? "";
                builder.AppendLine($"{t.Date:yyyy-MM-dd} | {t.Type,-7} | {t.Amount,10:F2} | {t.Category.Name,-15} | {notes}");
            }
            builder.AppendLine("==========================================================================");

            var bytes = Encoding.UTF8.GetBytes(builder.ToString());

            // Return as plain text content, indicating pdf representation for local printing and rendering
            return File(bytes, "text/plain", $"fintrack_financial_report_{DateTime.UtcNow:yyyyMMdd}.txt");
        }

        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel()
        {
            var userId = GetCurrentUserId();
            var transactions = await _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var builder = new StringBuilder();
            builder.AppendLine("ID\tDate\tType\tAmount\tCategory\tPaymentMethod\tNotes");

            foreach (var t in transactions)
            {
                builder.AppendLine($"{t.Id}\t{t.Date:yyyy-MM-dd HH:mm}\t{t.Type}\t{t.Amount}\t{t.Category.Name}\t{t.PaymentMethod}\t{t.Notes}");
            }

            var bytes = Encoding.UTF8.GetBytes(builder.ToString());
            return File(bytes, "application/vnd.ms-excel", $"fintrack_report_{DateTime.UtcNow:yyyyMMdd}.xls");
        }
    }
}
