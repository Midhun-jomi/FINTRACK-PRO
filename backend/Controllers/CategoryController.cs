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
    [Route("api/categories")]
    public class CategoryController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IMapper _mapper;
        private readonly IAuditLogService _auditLogService;

        public CategoryController(
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
        [ProducesResponseType(typeof(List<CategoryResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var userId = GetCurrentUserId();
            var categories = await _context.Categories
                .Where(c => c.IsDefault || c.UserId == userId)
                .OrderBy(c => c.Type)
                .ThenBy(c => c.Name)
                .ToListAsync();

            var response = _mapper.Map<List<CategoryResponse>>(categories);
            return Ok(response);
        }

        [HttpPost]
        [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateCategory([FromBody] CategoryCreateRequest request)
        {
            var userId = GetCurrentUserId();

            // Check duplicate name for this user
            if (await _context.Categories.AnyAsync(c => (c.IsDefault || c.UserId == userId) && 
                c.Name.ToLower() == request.Name.ToLower() && c.Type.ToLower() == request.Type.ToLower()))
            {
                return BadRequest(new { Message = $"A category named '{request.Name}' already exists for type '{request.Type}'." });
            }

            var category = new Category
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Type = request.Type,
                Icon = request.Icon,
                Color = request.Color,
                IsDefault = false,
                UserId = userId
            };

            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "CreateCategory", "Category", category.Id, $"Created custom category: {category.Name}");

            var response = _mapper.Map<CategoryResponse>(category);
            return CreatedAtAction(nameof(GetCategories), new { id = category.Id }, response);
        }

        [HttpPut("{id}")]
        [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CategoryCreateRequest request)
        {
            var userId = GetCurrentUserId();
            var category = await _context.Categories.FindAsync(id);

            if (category == null) return NotFound();
            if (category.IsDefault || category.UserId != userId)
            {
                return BadRequest(new { Message = "Cannot modify default system categories." });
            }

            // Check duplicates
            if (await _context.Categories.AnyAsync(c => (c.IsDefault || c.UserId == userId) && 
                c.Name.ToLower() == request.Name.ToLower() && c.Type.ToLower() == request.Type.ToLower() && c.Id != id))
            {
                return BadRequest(new { Message = $"A category named '{request.Name}' already exists." });
            }

            category.Name = request.Name;
            category.Icon = request.Icon;
            category.Color = request.Color;

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "UpdateCategory", "Category", category.Id, $"Updated custom category: {category.Name}");

            var response = _mapper.Map<CategoryResponse>(category);
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var userId = GetCurrentUserId();
            var category = await _context.Categories.FindAsync(id);

            if (category == null) return NotFound();
            if (category.IsDefault || category.UserId != userId)
            {
                return BadRequest(new { Message = "Cannot delete default system categories." });
            }

            // Check if there are transactions using this category
            var transactionCount = await _context.Transactions.CountAsync(t => t.CategoryId == id);
            if (transactionCount > 0)
            {
                return BadRequest(new { Message = $"Cannot delete category because it is used by {transactionCount} transaction(s). Reassign them first." });
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "DeleteCategory", "Category", id, $"Deleted custom category: {category.Name}");

            return Ok(new { Message = "Category deleted successfully." });
        }
    }
}
