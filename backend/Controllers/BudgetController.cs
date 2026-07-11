using System;
using System.Collections.Generic;
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
    [Route("api/budgets")]
    public class BudgetController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;

        public BudgetController(
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

        [HttpGet]
        [ProducesResponseType(typeof(List<BudgetResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetBudgets([FromQuery] int? month, [FromQuery] int? year)
        {
            var userId = GetCurrentUserId();
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var targetYear = year ?? DateTime.UtcNow.Year;

            var budgets = await _context.Budgets
                .Include(b => b.Category)
                .Where(b => b.UserId == userId && b.Month == targetMonth && b.Year == targetYear)
                .ToListAsync();

            var responseList = new List<BudgetResponse>();

            foreach (var budget in budgets)
            {
                var response = _mapper.Map<BudgetResponse>(budget);

                // Fetch actual spending in the budget period
                var query = _context.Transactions
                    .Where(t => t.UserId == userId && t.Type == "Expense" && t.Date.Month == targetMonth && t.Date.Year == targetYear);

                if (budget.CategoryId.HasValue)
                {
                    query = query.Where(t => t.CategoryId == budget.CategoryId.Value);
                }

                response.CurrentSpending = await query.SumAsync(t => t.Amount);
                response.PercentageUsed = response.MonthlyLimit > 0
                    ? Math.Round((response.CurrentSpending / response.MonthlyLimit) * 100, 2)
                    : 0;

                responseList.Add(response);
            }

            return Ok(responseList.OrderBy(b => b.CategoryId == null).ThenBy(b => b.CategoryName).ToList());
        }

        [HttpPost]
        [ProducesResponseType(typeof(BudgetResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateBudget([FromBody] BudgetCreateRequest request)
        {
            var userId = GetCurrentUserId();

            // Validate category if specified
            if (request.CategoryId.HasValue)
            {
                var category = await _context.Categories.FindAsync(request.CategoryId.Value);
                if (category == null || (!category.IsDefault && category.UserId != userId))
                {
                    return BadRequest(new { Message = "Invalid CategoryId." });
                }
            }

            // Check if budget already exists for this category/month/year combination
            var existingBudget = await _context.Budgets
                .FirstOrDefaultAsync(b => b.UserId == userId && 
                                          b.CategoryId == request.CategoryId && 
                                          b.Month == request.Month && 
                                          b.Year == request.Year);

            if (existingBudget != null)
            {
                return BadRequest(new { Message = "A budget is already defined for this category and time frame." });
            }

            var budget = new Budget
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CategoryId = request.CategoryId,
                MonthlyLimit = request.MonthlyLimit,
                Month = request.Month,
                Year = request.Year,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Budgets.AddAsync(budget);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "CreateBudget", "Budget", budget.Id, $"Created budget of {budget.MonthlyLimit}");

            var freshBudget = await _context.Budgets
                .Include(b => b.Category)
                .FirstAsync(b => b.Id == budget.Id);

            var response = _mapper.Map<BudgetResponse>(freshBudget);
            response.CurrentSpending = 0;
            response.PercentageUsed = 0;

            return CreatedAtAction(nameof(GetBudgets), new { month = budget.Month, year = budget.Year }, response);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(typeof(BudgetResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateBudget(Guid id, [FromBody] BudgetCreateRequest request)
        {
            var userId = GetCurrentUserId();
            var budget = await _context.Budgets.Include(b => b.Category).FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

            if (budget == null) return NotFound();

            budget.MonthlyLimit = request.MonthlyLimit;
            budget.Month = request.Month;
            budget.Year = request.Year;
            budget.CategoryId = request.CategoryId;

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "UpdateBudget", "Budget", budget.Id, $"Updated budget limit to {budget.MonthlyLimit}");

            var response = _mapper.Map<BudgetResponse>(budget);
            var query = _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" && t.Date.Month == budget.Month && t.Date.Year == budget.Year);

            if (budget.CategoryId.HasValue)
            {
                query = query.Where(t => t.CategoryId == budget.CategoryId.Value);
            }

            response.CurrentSpending = await query.SumAsync(t => t.Amount);
            response.PercentageUsed = response.MonthlyLimit > 0
                ? Math.Round((response.CurrentSpending / response.MonthlyLimit) * 100, 2)
                : 0;

            return Ok(response);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteBudget(Guid id)
        {
            var userId = GetCurrentUserId();
            var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

            if (budget == null) return NotFound();

            _context.Budgets.Remove(budget);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "DeleteBudget", "Budget", id, $"Deleted budget.");

            return Ok(new { Message = "Budget deleted successfully." });
        }
    }
}
