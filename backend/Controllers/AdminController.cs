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
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;

        public AdminController(
            FinTrackDbContext context,
            IMapper mapper,
            IAuditLogService auditLogService)
        {
            _context = context;
            _mapper = mapper;
            _auditLogService = auditLogService;
        }

        private Guid GetCurrentAdminId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var adminId))
            {
                throw new UnauthorizedAccessException("Administrator is not authorized.");
            }
            return adminId;
        }

        [HttpGet("users")]
        [ProducesResponseType(typeof(List<UserManagementResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Include(u => u.Transactions)
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            var response = _mapper.Map<List<UserManagementResponse>>(users);
            return Ok(response);
        }

        [HttpPost("users/{id}/toggle-status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ToggleUserStatus(Guid id)
        {
            var adminId = GetCurrentAdminId();
            if (id == adminId)
            {
                return BadRequest(new { Message = "Cannot disable your own administrator account." });
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();

            var state = user.IsActive ? "Activated" : "Disabled";
            await _auditLogService.LogActionAsync(adminId, "ToggleUserStatus", "User", user.Id, $"Administrator toggled user status. User is now {state}.");

            return Ok(new { Message = $"User has been successfully {state.ToLower()}." });
        }

        [HttpGet("audit-logs")]
        [ProducesResponseType(typeof(List<AuditLogResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAuditLogs()
        {
            var logs = await _context.AuditLogs
                .Include(l => l.User)
                .OrderByDescending(l => l.Timestamp)
                .Take(200) // Return last 200 logs
                .ToListAsync();

            var response = _mapper.Map<List<AuditLogResponse>>(logs);
            return Ok(response);
        }

        [HttpPost("categories")]
        [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateSystemCategory([FromBody] CategoryCreateRequest request)
        {
            var adminId = GetCurrentAdminId();

            if (await _context.Categories.AnyAsync(c => c.IsDefault && 
                c.Name.ToLower() == request.Name.ToLower() && c.Type.ToLower() == request.Type.ToLower()))
            {
                return BadRequest(new { Message = $"A default category named '{request.Name}' already exists." });
            }

            var category = new Category
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Type = request.Type,
                Icon = request.Icon,
                Color = request.Color,
                IsDefault = true,
                UserId = null
            };

            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(adminId, "CreateSystemCategory", "Category", category.Id, $"Created default category: {category.Name}");

            var response = _mapper.Map<CategoryResponse>(category);
            return CreatedAtAction("GetCategories", "Category", new { id = category.Id }, response);
        }

        [HttpDelete("categories/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteSystemCategory(Guid id)
        {
            var adminId = GetCurrentAdminId();
            var category = await _context.Categories.FindAsync(id);

            if (category == null) return NotFound();
            if (!category.IsDefault)
            {
                return BadRequest(new { Message = "This endpoint can only be used to delete default system categories." });
            }

            // Check if there are transactions using this category
            var transactionCount = await _context.Transactions.CountAsync(t => t.CategoryId == id);
            if (transactionCount > 0)
            {
                return BadRequest(new { Message = $"Cannot delete system category because it is used by {transactionCount} transaction(s). Reassign them first." });
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(adminId, "DeleteSystemCategory", "Category", id, $"Deleted default system category: {category.Name}");

            return Ok(new { Message = "System category deleted successfully." });
        }

        [HttpGet("stats")]
        [ProducesResponseType(typeof(AdminStatsResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPlatformStats()
        {
            var adminId = GetCurrentAdminId();
            
            var totalUsers = await _context.Users.CountAsync();
            var totalTransactions = await _context.Transactions.CountAsync();
            var totalSavingsGoals = await _context.SavingsGoals.CountAsync();
            var dbProvider = _context.Database.ProviderName?.Split('.').LastOrDefault() ?? "Unknown";

            var isOnline = false;
            try
            {
                isOnline = await _context.Database.CanConnectAsync();
            }
            catch { }

            var stats = new AdminStatsResponse
            {
                TotalUsers = totalUsers,
                TotalTransactions = totalTransactions,
                TotalSavingsGoals = totalSavingsGoals,
                DatabaseProvider = dbProvider,
                IsDatabaseOnline = isOnline
            };

            return Ok(stats);
        }

        [HttpPost("audit-logs/clear")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ClearAuditLogs()
        {
            var adminId = GetCurrentAdminId();

            _context.AuditLogs.RemoveRange(_context.AuditLogs);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(adminId, "ClearAuditLogs", "System", adminId, "Administrator cleared all platform audit logs.");

            return Ok(new { Message = "Platform audit trails cleared successfully." });
        }
    }
}
