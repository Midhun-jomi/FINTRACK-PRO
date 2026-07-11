using System;
using System.Threading.Tasks;

namespace FinTrack.Api.Services
{
    public interface IAuditLogService
    {
        Task LogActionAsync(Guid? userId, string action, string entityName, Guid? entityId, string? changes, string? ipAddress = null);
    }
}
