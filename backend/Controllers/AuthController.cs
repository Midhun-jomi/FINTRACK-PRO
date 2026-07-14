using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinTrack.Api.Data;
using FinTrack.Api.DTOs;
using FinTrack.Api.Entities;
using FinTrack.Api.Services;

namespace FinTrack.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly FinTrackDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IEmailService _emailService;
        private readonly IAuditLogService _auditLogService;
        private readonly IMapper _mapper;
        private readonly IStorageService _storageService;
        private readonly PasswordHasher<User> _passwordHasher;

        public AuthController(
            FinTrackDbContext context,
            IJwtService jwtService,
            IEmailService emailService,
            IAuditLogService auditLogService,
            IMapper mapper,
            IStorageService storageService)
        {
            _context = context;
            _jwtService = jwtService;
            _emailService = emailService;
            _auditLogService = auditLogService;
            _mapper = mapper;
            _storageService = storageService;
            _passwordHasher = new PasswordHasher<User>();
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

        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest(new { Message = "Email address is already in use." });
            }

            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                return BadRequest(new { Message = "Username is already taken." });
            }

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PreferredCurrency = request.PreferredCurrency,
                Role = "User",
                EmailVerified = false,
                VerificationToken = Guid.NewGuid().ToString("N"),
                IsActive = true
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Send verification email mock
            await _emailService.SendVerificationEmailAsync(user.Email, user.VerificationToken);

            await _auditLogService.LogActionAsync(user.Id, "Register", "User", user.Id, $"User registered: {user.Username}", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { Message = "Registration successful! Please check your email to verify your account." });
        }

        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null || !user.IsActive)
            {
                return BadRequest(new { Message = "Invalid email or inactive account." });
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { Message = "Invalid password." });
            }

            var jwtToken = _jwtService.GenerateJwtToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken(user.Id);

            // Revoke active refresh tokens for the user to ensure single-session safety if preferred, 
            // or just add the new one. Here we append the new one.
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(user.Id, "Login", "User", user.Id, "User logged in successfully", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new AuthResponse
            {
                Token = jwtToken,
                RefreshToken = refreshToken.Token,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                PreferredCurrency = user.PreferredCurrency,
                ProfilePictureUrl = user.ProfilePictureUrl
            });
        }

        [HttpPost("refresh")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        {
            var storedToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == request.Token);

            if (storedToken == null || !storedToken.IsActive)
            {
                return BadRequest(new { Message = "Invalid or expired refresh token." });
            }

            var user = storedToken.User;
            if (!user.IsActive)
            {
                return BadRequest(new { Message = "User is inactive." });
            }

            // Revoke current token
            storedToken.Revoked = DateTime.UtcNow;

            // Generate new pair
            var newJwt = _jwtService.GenerateJwtToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken(user.Id);

            await _context.RefreshTokens.AddAsync(newRefreshToken);
            await _context.SaveChangesAsync();

            return Ok(new AuthResponse
            {
                Token = newJwt,
                RefreshToken = newRefreshToken.Token,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                PreferredCurrency = user.PreferredCurrency,
                ProfilePictureUrl = user.ProfilePictureUrl
            });
        }

        [HttpPost("forgot-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user != null && user.IsActive)
            {
                user.PasswordResetToken = Guid.NewGuid().ToString("N");
                await _context.SaveChangesAsync();

                await _emailService.SendPasswordResetEmailAsync(user.Email, user.PasswordResetToken);
            }

            // Always return OK to prevent user enumeration
            return Ok(new { Message = "If the email is registered, a password reset link has been sent." });
        }

        [HttpPost("reset-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.PasswordResetToken == request.Token);
            if (user == null || !user.IsActive)
            {
                return BadRequest(new { Message = "Invalid email, reset token, or inactive user." });
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            user.PasswordResetToken = null; // Clear token
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(user.Id, "ResetPassword", "User", user.Id, "Password reset using link", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { Message = "Password has been reset successfully. You can now log in." });
        }

        [HttpGet("verify-email")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyEmail([FromQuery] string email, [FromQuery] string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.VerificationToken == token);
            if (user == null)
            {
                return BadRequest(new { Message = "Invalid verification request." });
            }

            user.EmailVerified = true;
            user.VerificationToken = null; // Clear token
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(user.Id, "VerifyEmail", "User", user.Id, "Email verified successfully", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { Message = "Email address has been successfully verified! You can now log in." });
        }

        [Authorize]
        [HttpPost("change-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
            if (result == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { Message = "Incorrect current password." });
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "ChangePassword", "User", userId, "User changed password", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { Message = "Password changed successfully." });
        }

        [Authorize]
        [HttpPut("profile")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            // Check if username is taken by another user
            if (user.Username != request.Username && await _context.Users.AnyAsync(u => u.Username == request.Username && u.Id != userId))
            {
                return BadRequest(new { Message = "Username is already taken." });
            }

            user.Username = request.Username;
            user.PreferredCurrency = request.PreferredCurrency;
            if (request.ProfilePictureUrl != null)
            {
                user.ProfilePictureUrl = request.ProfilePictureUrl;
            }

            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(userId, "UpdateProfile", "User", userId, "Updated profile preferences", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new AuthResponse
            {
                Token = _jwtService.GenerateJwtToken(user), // re-issue token with updated username/currency claims
                RefreshToken = "", // not rotated on profile edit
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                PreferredCurrency = user.PreferredCurrency,
                ProfilePictureUrl = user.ProfilePictureUrl
            });
        }

        [Authorize]
        [HttpPost("profile/avatar-upload")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Message = "No file uploaded." });
            }

            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            // Optional: delete old avatar from storage if it is a local path or storage path
            if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
            {
                try
                {
                    await _storageService.DeleteFileAsync(user.ProfilePictureUrl);
                }
                catch
                {
                    // Ignore storage deletion errors to avoid blocking profile updates
                }
            }

            using (var stream = file.OpenReadStream())
            {
                var fileUrl = await _storageService.UploadFileAsync(stream, file.FileName, file.ContentType);
                user.ProfilePictureUrl = fileUrl;
                await _context.SaveChangesAsync();
                
                await _auditLogService.LogActionAsync(userId, "UploadAvatar", "User", userId, "Uploaded new profile picture");

                return Ok(new { Url = fileUrl });
            }
        }

        [Authorize]
        [HttpGet("me")]
        [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMe()
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            var response = _mapper.Map<UserResponse>(user);
            return Ok(response);
        }
    }
}
