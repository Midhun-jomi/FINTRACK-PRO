using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using FinTrack.Api.Data;
using FinTrack.Api.Middleware;
using FinTrack.Api.Profiles;
using FinTrack.Api.Services;
using FinTrack.Api.Validators;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/fintrack-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Native OpenAPI Generator Setup for .NET 10
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "FinTrack Pro API",
            Version = "v1",
            Description = "Enterprise-grade Personal Finance & Expense Tracker REST API"
        };

        // Define JWT Bearer security scheme
        var securityScheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Enter your JWT Bearer token."
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes.Add("Bearer", securityScheme);

        // Define global JWT requirement
        var securitySchemeRef = new OpenApiSecuritySchemeReference("Bearer", document);
        var requirement = new OpenApiSecurityRequirement
        {
            [securitySchemeRef] = new List<string>()
        };

        document.Security.Add(requirement);

        return Task.CompletedTask;
    });
});

// Configure EF Core Database Connection (SQLite, SQL Server, or Postgres/Supabase)
var dbProvider = builder.Configuration["DbProvider"] ?? "Sqlite";
var connectionString = dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
    ? builder.Configuration.GetConnectionString("SqlServer")
    : dbProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) || dbProvider.Equals("Supabase", StringComparison.OrdinalIgnoreCase)
        ? builder.Configuration.GetConnectionString("Postgres")
        : builder.Configuration.GetConnectionString("Sqlite");

builder.Services.AddDbContext<FinTrackDbContext>(options =>
{
    if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlServer(connectionString);
    }
    else if (dbProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) || 
             dbProvider.Equals("Supabase", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

// Configure AutoMapper
builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<MappingProfile>();
});

// Register FluentValidation Validators
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

// Register Application Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// Register HttpContextAccessor for LocalStorageService
builder.Services.AddHttpContextAccessor();

// Register Storage Service based on configuration
var storageProvider = builder.Configuration["Storage:Provider"] ?? "Local";
if (storageProvider.Equals("AzureBlob", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IStorageService, AzureBlobStorageService>();
}
else
{
    builder.Services.AddScoped<IStorageService, LocalStorageService>();
}

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "FinTrackProSuperSecretSecurityKey999!!!NeonMaximalistAestheticsForLife";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS for Angular Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowOrigins", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:4200" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Enable Scalar API UI in development
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi(); // Exposes /openapi/v1.json
    app.MapScalarApiReference(); // Exposes /scalar/v1
}

// Global Exception Handler Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

// Enable Static Files for Receipt Uploads
app.UseStaticFiles();

// Apply CORS Policy
app.UseCors("AllowOrigins");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed the Database on Startup
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<FinTrackDbContext>();
    await DbSeeder.SeedAsync(context);
    Log.Information("Database successfully migrated and seeded.");
}
catch (Exception ex)
{
    Log.Error(ex, "An error occurred during database seeding/migrations.");
}

app.Run();
