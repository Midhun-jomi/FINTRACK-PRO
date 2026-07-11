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
    [Route("api/savings-goals")]
    public class SavingsGoalController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;

        public SavingsGoalController(
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
        [ProducesResponseType(typeof(List<SavingsGoalResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSavingsGoals()
        {
            var userId = GetCurrentUserId();
            var goals = await _context.SavingsGoals
                .Where(g => g.UserId == userId)
                .OrderBy(g => g.Deadline)
                .ToListAsync();

            var response = _mapper.Map<List<SavingsGoalResponse>>(goals);
            return Ok(response);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetSavingsGoal(Guid id)
        {
            var userId = GetCurrentUserId();
            var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

            if (goal == null) return NotFound();

            var response = _mapper.Map<SavingsGoalResponse>(goal);
            return Ok(response);
        }

        [HttpPost]
        [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateSavingsGoal([FromBody] SavingsGoalCreateRequest request)
        {
            var userId = GetCurrentUserId();

            var goal = new SavingsGoal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = request.Name,
                TargetAmount = request.TargetAmount,
                CurrentAmount = request.CurrentAmount,
                Deadline = request.Deadline,
                Status = request.CurrentAmount >= request.TargetAmount ? "Completed" : "In Progress",
                CreatedAt = DateTime.UtcNow
            };

            await _context.SavingsGoals.AddAsync(goal);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "CreateSavingsGoal", "SavingsGoal", goal.Id, $"Created savings goal: {goal.Name} (Target: {goal.TargetAmount})");

            // Send milestone notification if seeded as completed
            if (goal.Status == "Completed")
            {
                await CreateMilestoneNotificationAsync(userId, goal.Name, goal.TargetAmount);
            }

            var response = _mapper.Map<SavingsGoalResponse>(goal);
            return CreatedAtAction(nameof(GetSavingsGoal), new { id = goal.Id }, response);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateSavingsGoal(Guid id, [FromBody] SavingsGoalCreateRequest request)
        {
            var userId = GetCurrentUserId();
            var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

            if (goal == null) return NotFound();

            var prevStatus = goal.Status;

            goal.Name = request.Name;
            goal.TargetAmount = request.TargetAmount;
            goal.CurrentAmount = request.CurrentAmount;
            goal.Deadline = request.Deadline;
            goal.Status = goal.CurrentAmount >= goal.TargetAmount ? "Completed" : "In Progress";

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "UpdateSavingsGoal", "SavingsGoal", goal.Id, $"Updated savings goal: {goal.Name}");

            // Send milestone notification if status changed to completed
            if (goal.Status == "Completed" && prevStatus != "Completed")
            {
                await CreateMilestoneNotificationAsync(userId, goal.Name, goal.TargetAmount);
            }

            var response = _mapper.Map<SavingsGoalResponse>(goal);
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteSavingsGoal(Guid id)
        {
            var userId = GetCurrentUserId();
            var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

            if (goal == null) return NotFound();

            _context.SavingsGoals.Remove(goal);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "DeleteSavingsGoal", "SavingsGoal", id, $"Deleted savings goal: {goal.Name}");

            return Ok(new { Message = "Savings goal deleted successfully." });
        }

        [HttpPost("{id}/contribute")]
        [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Contribute(Guid id, [FromBody] ContributionRequest request)
        {
            var userId = GetCurrentUserId();
            var goal = await _context.SavingsGoals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

            if (goal == null) return NotFound();
            if (request.Amount <= 0)
            {
                return BadRequest(new { Message = "Contribution amount must be positive." });
            }

            var prevStatus = goal.Status;

            goal.CurrentAmount += request.Amount;
            goal.Status = goal.CurrentAmount >= goal.TargetAmount ? "Completed" : "In Progress";

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "ContributeSavingsGoal", "SavingsGoal", goal.Id, $"Contributed {request.Amount} to goal '{goal.Name}'");

            if (goal.Status == "Completed" && prevStatus != "Completed")
            {
                await CreateMilestoneNotificationAsync(userId, goal.Name, goal.TargetAmount);
            }

            var response = _mapper.Map<SavingsGoalResponse>(goal);
            return Ok(response);
        }

        private async Task CreateMilestoneNotificationAsync(Guid userId, string goalName, double targetAmount)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Message = $"Congratulations! You have achieved your savings goal '{goalName}' by saving {targetAmount:C}!",
                Type = "SavingMilestone",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }
    }

    public class ContributionRequest
    {
        public double Amount { get; set; }
    }
}
