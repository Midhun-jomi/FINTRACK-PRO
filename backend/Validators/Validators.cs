using FluentValidation;
using FinTrack.Api.DTOs;

namespace FinTrack.Api.Validators
{
    public class LoginRequestValidator : AbstractValidator<LoginRequest>
    {
        public LoginRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.");
        }
    }

    public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator()
        {
            RuleFor(x => x.Username)
                .NotEmpty().WithMessage("Username is required.")
                .MinimumLength(3).WithMessage("Username must be at least 3 characters long.")
                .MaximumLength(20).WithMessage("Username cannot exceed 20 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(6).WithMessage("Password must be at least 6 characters long.")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
                .Matches(@"[0-9]").WithMessage("Password must contain at least one digit.")
                .Matches(@"[\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'""\,\<\.\>\/\?\\\|]").WithMessage("Password must contain at least one special character.");

            RuleFor(x => x.PreferredCurrency)
                .NotEmpty().WithMessage("Preferred currency is required.")
                .Length(3).WithMessage("Preferred currency must be a 3-letter ISO code.");
        }
    }

    public class TransactionCreateRequestValidator : AbstractValidator<TransactionCreateRequest>
    {
        public TransactionCreateRequestValidator()
        {
            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Amount must be greater than 0.");

            RuleFor(x => x.Type)
                .NotEmpty().WithMessage("Type is required.")
                .Must(x => x == "Income" || x == "Expense").WithMessage("Type must be either 'Income' or 'Expense'.");

            RuleFor(x => x.CategoryId)
                .NotEmpty().WithMessage("CategoryId is required.");

            RuleFor(x => x.Date)
                .NotEmpty().WithMessage("Date is required.");

            RuleFor(x => x.PaymentMethod)
                .NotEmpty().WithMessage("Payment method is required.")
                .Must(x => x == "Cash" || x == "Card" || x == "Transfer" || x == "UPI" || x == "Other")
                .WithMessage("Payment method must be one of: Cash, Card, Transfer, UPI, Other.");

            RuleFor(x => x.RecurringInterval)
                .NotEmpty().WithMessage("Recurring interval is required.")
                .Must(x => x == "Daily" || x == "Weekly" || x == "Monthly" || x == "Yearly" || x == "None")
                .WithMessage("Recurring interval must be one of: Daily, Weekly, Monthly, Yearly, None.");
        }
    }

    public class BudgetCreateRequestValidator : AbstractValidator<BudgetCreateRequest>
    {
        public BudgetCreateRequestValidator()
        {
            RuleFor(x => x.MonthlyLimit)
                .GreaterThan(0).WithMessage("Monthly limit must be greater than 0.");

            RuleFor(x => x.Month)
                .InclusiveBetween(1, 12).WithMessage("Month must be between 1 and 12.");

            RuleFor(x => x.Year)
                .GreaterThanOrEqualTo(2000).WithMessage("Year must be a valid four-digit year starting from 2000.");
        }
    }

    public class SavingsGoalCreateRequestValidator : AbstractValidator<SavingsGoalCreateRequest>
    {
        public SavingsGoalCreateRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Goal name is required.")
                .MaximumLength(50).WithMessage("Goal name cannot exceed 50 characters.");

            RuleFor(x => x.TargetAmount)
                .GreaterThan(0).WithMessage("Target amount must be greater than 0.");

            RuleFor(x => x.CurrentAmount)
                .GreaterThanOrEqualTo(0).WithMessage("Current amount cannot be negative.");

            RuleFor(x => x.Deadline)
                .GreaterThan(System.DateTime.UtcNow).WithMessage("Deadline must be in the future.");
        }
    }
}
