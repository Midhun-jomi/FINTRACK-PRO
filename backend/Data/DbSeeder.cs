using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using FinTrack.Api.Entities;

namespace FinTrack.Api.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(FinTrackDbContext context)
        {
            // Ensure database is created and schema exists
            await context.Database.EnsureCreatedAsync();

            // Seed Categories
            if (!await context.Categories.AnyAsync())
            {
                var categories = new[]
                {
                    // Income
                    new Category { Id = Guid.Parse("c0000000-0000-0000-0000-000000000001"), Name = "Salary", Type = "Income", Icon = "work", Color = "#10b981", IsDefault = true },
                    new Category { Id = Guid.Parse("c0000000-0000-0000-0000-000000000002"), Name = "Freelancing", Type = "Income", Icon = "computer", Color = "#00f0ff", IsDefault = true },
                    new Category { Id = Guid.Parse("c0000000-0000-0000-0000-000000000003"), Name = "Business", Type = "Income", Icon = "storefront", Color = "#ff5f1f", IsDefault = true },
                    new Category { Id = Guid.Parse("c0000000-0000-0000-0000-000000000004"), Name = "Investment", Type = "Income", Icon = "trending_up", Color = "#39ff14", IsDefault = true },
                    new Category { Id = Guid.Parse("c0000000-0000-0000-0000-000000000005"), Name = "Other", Type = "Income", Icon = "more_horiz", Color = "#a855f7", IsDefault = true },

                    // Expense
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000001"), Name = "Food", Type = "Expense", Icon = "restaurant", Color = "#ff007f", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000002"), Name = "Shopping", Type = "Expense", Icon = "shopping_bag", Color = "#e879f9", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000003"), Name = "Travel", Type = "Expense", Icon = "flight", Color = "#38bdf8", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000004"), Name = "Fuel", Type = "Expense", Icon = "local_gas_station", Color = "#facc15", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000005"), Name = "Bills", Type = "Expense", Icon = "receipt_long", Color = "#ff5f1f", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000006"), Name = "EMI", Type = "Expense", Icon = "credit_card", Color = "#f43f5e", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000007"), Name = "Medical", Type = "Expense", Icon = "medical_services", Color = "#10b981", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000008"), Name = "Education", Type = "Expense", Icon = "school", Color = "#818cf8", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000009"), Name = "Entertainment", Type = "Expense", Icon = "sports_esports", Color = "#00f0ff", IsDefault = true },
                    new Category { Id = Guid.Parse("e0000000-0000-0000-0000-000000000010"), Name = "Others", Type = "Expense", Icon = "payments", Color = "#94a3b8", IsDefault = true }
                };

                await context.Categories.AddRangeAsync(categories);
                await context.SaveChangesAsync();
            }

            // Seed Users
            if (!await context.Users.AnyAsync())
            {
                var passwordHasher = new PasswordHasher<User>();

                // Create Admin
                var admin = new User
                {
                    Id = Guid.Parse("a0d5c80e-3ef4-4f9e-9b6b-4e8cda1b0001"),
                    Username = "admin",
                    Email = "admin@fintrack.com",
                    Role = "Admin",
                    PreferredCurrency = "INR",
                    EmailVerified = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                admin.PasswordHash = passwordHasher.HashPassword(admin, "AdminPassword123!");

                // Create User
                var user = new User
                {
                    Id = Guid.Parse("a0d5c80e-3ef4-4f9e-9b6b-4e8cda1b0002"),
                    Username = "user",
                    Email = "user@fintrack.com",
                    Role = "User",
                    PreferredCurrency = "INR",
                    EmailVerified = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                user.PasswordHash = passwordHasher.HashPassword(user, "UserPassword123!");

                await context.Users.AddRangeAsync(admin, user);
                await context.SaveChangesAsync();

                // Add a few seed transactions for demo purposes
                var foodCat = Guid.Parse("e0000000-0000-0000-0000-000000000001");
                var salaryCat = Guid.Parse("c0000000-0000-0000-0000-000000000001");
                var billsCat = Guid.Parse("e0000000-0000-0000-0000-000000000005");
                var shoppingCat = Guid.Parse("e0000000-0000-0000-0000-000000000002");

                var transactions = new[]
                {
                    new Transaction
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        Amount = 150000,
                        Type = "Income",
                        CategoryId = salaryCat,
                        Date = DateTime.UtcNow.AddDays(-5),
                        Notes = "Monthly salary credit",
                        PaymentMethod = "Transfer"
                    },
                    new Transaction
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        Amount = 3500.00,
                        Type = "Expense",
                        CategoryId = foodCat,
                        Date = DateTime.UtcNow.AddDays(-4),
                        Notes = "Sushi dinner with friends",
                        PaymentMethod = "Card"
                    },
                    new Transaction
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        Amount = 8000.00,
                        Type = "Expense",
                        CategoryId = billsCat,
                        Date = DateTime.UtcNow.AddDays(-2),
                        Notes = "Electricity bill",
                        PaymentMethod = "Transfer"
                    },
                    new Transaction
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        Amount = 6500.00,
                        Type = "Expense",
                        CategoryId = shoppingCat,
                        Date = DateTime.UtcNow.AddDays(-1),
                        Notes = "Sneakers",
                        PaymentMethod = "Card"
                    }
                };

                await context.Transactions.AddRangeAsync(transactions);

                // Add a seed budget
                var budget = new Budget
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    CategoryId = foodCat,
                    MonthlyLimit = 35000.00,
                    Month = DateTime.UtcNow.Month,
                    Year = DateTime.UtcNow.Year
                };
                await context.Budgets.AddAsync(budget);

                // Add a seed savings goal
                var goal = new SavingsGoal
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Name = "Emergency Fund",
                    TargetAmount = 500000.00,
                    CurrentAmount = 150000.00,
                    Deadline = DateTime.UtcNow.AddMonths(12),
                    Status = "In Progress"
                };
                await context.SavingsGoals.AddAsync(goal);

                await context.SaveChangesAsync();
            }
        }
    }
}
