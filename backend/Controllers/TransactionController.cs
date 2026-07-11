using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
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
    [Route("api/transactions")]
    public class TransactionController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;
        private readonly IStorageService _storageService;

        public TransactionController(
            FinTrackDbContext context,
            IMapper mapper,
            IAuditLogService auditLogService,
            IStorageService storageService)
        {
            _context = context;
            _mapper = mapper;
            _auditLogService = auditLogService;
            _storageService = storageService;
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

        [HttpGet]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? search,
            [FromQuery] string? type, // "Income" or "Expense"
            [FromQuery] Guid? categoryId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = GetCurrentUserId();
            var query = _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId);

            // Filter by Search Text (Notes/CategoryName)
            if (!string.IsNullOrWhiteSpace(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(t => (t.Notes != null && t.Notes.ToLower().Contains(lowerSearch)) || 
                                         t.Category.Name.ToLower().Contains(lowerSearch));
            }

            // Filter by Type
            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(t => t.Type == type);
            }

            // Filter by Category
            if (categoryId.HasValue)
            {
                query = query.Where(t => t.CategoryId == categoryId.Value);
            }

            // Filter by Date Range
            if (startDate.HasValue)
            {
                query = query.Where(t => t.Date >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(t => t.Date <= endDate.Value);
            }

            // Pagination
            var totalItems = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var responseItems = _mapper.Map<List<TransactionResponse>>(items);

            return Ok(new
            {
                TotalItems = totalItems,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalItems / pageSize),
                Items = responseItems
            });
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetTransaction(Guid id)
        {
            var userId = GetCurrentUserId();
            var transaction = await _context.Transactions
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null) return NotFound();

            var response = _mapper.Map<TransactionResponse>(transaction);
            return Ok(response);
        }

        [HttpPost]
        [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateTransaction([FromBody] TransactionCreateRequest request)
        {
            var userId = GetCurrentUserId();

            // Validate category
            var category = await _context.Categories.FindAsync(request.CategoryId);
            if (category == null || (!category.IsDefault && category.UserId != userId))
            {
                return BadRequest(new { Message = "Invalid CategoryId." });
            }

            // Verify category matches type
            if (category.Type != request.Type)
            {
                return BadRequest(new { Message = "Category type does not match transaction type." });
            }

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = request.Amount,
                Type = request.Type,
                CategoryId = request.CategoryId,
                Date = request.Date,
                Notes = request.Notes,
                ReceiptUrl = request.ReceiptUrl,
                PaymentMethod = request.PaymentMethod,
                IsRecurring = request.IsRecurring,
                RecurringInterval = request.RecurringInterval
            };

            await _context.Transactions.AddAsync(transaction);
            await _context.SaveChangesAsync();

            // Audit
            await _auditLogService.LogActionAsync(userId, "CreateTransaction", "Transaction", transaction.Id, $"Created {transaction.Type} transaction of {transaction.Amount}");

            // If it is an expense, check budget limits & alerts
            if (transaction.Type == "Expense")
            {
                await CheckBudgetsAsync(userId, transaction.CategoryId, transaction.Amount, transaction.Date.Month, transaction.Date.Year);
            }

            // Return fully mapped transaction
            var seededTransaction = await _context.Transactions
                .Include(t => t.Category)
                .FirstAsync(t => t.Id == transaction.Id);

            var response = _mapper.Map<TransactionResponse>(seededTransaction);
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, response);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateTransaction(Guid id, [FromBody] TransactionCreateRequest request)
        {
            var userId = GetCurrentUserId();
            var transaction = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null) return NotFound();

            // Validate category
            var category = await _context.Categories.FindAsync(request.CategoryId);
            if (category == null || (!category.IsDefault && category.UserId != userId))
            {
                return BadRequest(new { Message = "Invalid CategoryId." });
            }

            var diffAmount = 0.0;
            if (request.Type == "Expense" && transaction.Type == "Expense")
            {
                diffAmount = request.Amount - transaction.Amount;
            }
            else if (request.Type == "Expense" && transaction.Type != "Expense")
            {
                diffAmount = request.Amount;
            }

            transaction.Amount = request.Amount;
            transaction.Type = request.Type;
            transaction.CategoryId = request.CategoryId;
            transaction.Date = request.Date;
            transaction.Notes = request.Notes;
            transaction.ReceiptUrl = request.ReceiptUrl;
            transaction.PaymentMethod = request.PaymentMethod;
            transaction.IsRecurring = request.IsRecurring;
            transaction.RecurringInterval = request.RecurringInterval;

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "UpdateTransaction", "Transaction", transaction.Id, $"Updated transaction of {transaction.Amount}");

            // If it is an expense, check budget thresholds
            if (diffAmount > 0)
            {
                await CheckBudgetsAsync(userId, transaction.CategoryId, diffAmount, transaction.Date.Month, transaction.Date.Year);
            }

            var seededTransaction = await _context.Transactions
                .Include(t => t.Category)
                .FirstAsync(t => t.Id == transaction.Id);

            var response = _mapper.Map<TransactionResponse>(seededTransaction);
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var userId = GetCurrentUserId();
            var transaction = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null) return NotFound();

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "DeleteTransaction", "Transaction", id, $"Deleted transaction of {transaction.Amount}");

            return Ok(new { Message = "Transaction deleted successfully." });
        }

        [HttpPost("receipt-upload")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UploadReceipt(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Message = "No file uploaded." });
            }

            using (var stream = file.OpenReadStream())
            {
                var fileUrl = await _storageService.UploadFileAsync(stream, file.FileName, file.ContentType);
                return Ok(new { Url = fileUrl });
            }
        }

        private async Task CheckBudgetsAsync(Guid userId, Guid categoryId, double addedAmount, int month, int year)
        {
            // Category specific budget check
            var budget = await _context.Budgets
                .Include(b => b.Category)
                .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == categoryId && b.Month == month && b.Year == year);

            if (budget != null)
            {
                await EvaluateBudgetAlertsAsync(budget, addedAmount);
            }

            // Overall budget check (CategoryId == null)
            var overallBudget = await _context.Budgets
                .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == null && b.Month == month && b.Year == year);

            if (overallBudget != null)
            {
                await EvaluateBudgetAlertsAsync(overallBudget, addedAmount);
            }
        }

        private async Task EvaluateBudgetAlertsAsync(Budget budget, double addedAmount)
        {
            var query = _context.Transactions
                .Where(t => t.UserId == budget.UserId && t.Type == "Expense" && t.Date.Month == budget.Month && t.Date.Year == budget.Year);

            if (budget.CategoryId != null)
            {
                query = query.Where(t => t.CategoryId == budget.CategoryId);
            }

            var currentSpend = await query.SumAsync(t => t.Amount);
            var prevSpend = currentSpend - addedAmount;
            var limit = budget.MonthlyLimit;

            var categoryName = budget.Category != null ? budget.Category.Name : "Overall";

            // Check 100% limit
            if (currentSpend >= limit && prevSpend < limit)
            {
                var msg = $"Alert! You have exceeded your monthly budget for '{categoryName}' (Limit: {limit:C}, Current Spend: {currentSpend:C}).";
                await CreateNotificationAsync(budget.UserId, msg, "BudgetAlert");
            }
            // Check 80% limit
            else if (currentSpend >= limit * 0.8 && prevSpend < limit * 0.8)
            {
                var msg = $"Warning: You have utilized 80% of your monthly budget for '{categoryName}' (Limit: {limit:C}, Current Spend: {currentSpend:C}).";
                await CreateNotificationAsync(budget.UserId, msg, "BudgetAlert");
            }
        }

        private async Task CreateNotificationAsync(Guid userId, string message, string type)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }
    }
}
