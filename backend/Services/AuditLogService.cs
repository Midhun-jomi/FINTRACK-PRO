using System;
using System.Threading.Tasks;
using FinTrack.Api.Data;
using FinTrack.Api.Entities;

namespace FinTrack.Api.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly FinTrackDbContext _context;

        public AuditLogService(FinTrackDbContext context)
        {
            _context = context;
        }

        public async Task LogActionAsync(Guid? userId, string action, string entityName, Guid? entityId, string? changes, string? ipAddress = null)
        {
            var log = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Changes = changes,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow
            };

            await _context.AuditLogs.AddAsync(log);
            await _context.SaveChangesAsync();
        }
    }
}
