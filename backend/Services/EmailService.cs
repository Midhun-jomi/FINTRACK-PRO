using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace FinTrack.Api.Services
{
    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;

        public EmailService(ILogger<EmailService> logger)
        {
            _logger = logger;
        }

        public Task SendVerificationEmailAsync(string email, string token)
        {
            var verificationUrl = $"http://localhost:4200/auth/verify?email={email}&token={token}";
            _logger.LogInformation("================ MOCK EMAIL SYSTEM ==================");
            _logger.LogInformation("To: {Email}", email);
            _logger.LogInformation("Subject: FinTrack Pro - Verify Email Address");
            _logger.LogInformation("Body: Thank you for registering! Verify email here: {Url}", verificationUrl);
            _logger.LogInformation("=====================================================");
            return Task.CompletedTask;
        }

        public Task SendPasswordResetEmailAsync(string email, string token)
        {
            var resetUrl = $"http://localhost:4200/auth/reset-password?email={email}&token={token}";
            _logger.LogInformation("================ MOCK EMAIL SYSTEM ==================");
            _logger.LogInformation("To: {Email}", email);
            _logger.LogInformation("Subject: FinTrack Pro - Reset Password Request");
            _logger.LogInformation("Body: Use the link below to reset your password: {Url}", resetUrl);
            _logger.LogInformation("=====================================================");
            return Task.CompletedTask;
        }
    }
}
