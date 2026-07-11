using System;
using FinTrack.Api.Entities;

namespace FinTrack.Api.Services
{
    public interface IJwtService
    {
        string GenerateJwtToken(User user);
        RefreshToken GenerateRefreshToken(Guid userId);
    }
}
