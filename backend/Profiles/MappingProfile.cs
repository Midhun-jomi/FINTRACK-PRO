using AutoMapper;
using FinTrack.Api.Entities;
using FinTrack.Api.DTOs;

namespace FinTrack.Api.Profiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User mappings
            CreateMap<User, UserResponse>();
            
            CreateMap<User, UserManagementResponse>()
                .ForMember(dest => dest.TransactionCount, opt => opt.MapFrom(src => src.Transactions.Count));

            // Category mappings
            CreateMap<Category, CategoryResponse>();

            // Transaction mappings
            CreateMap<Transaction, TransactionResponse>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category.Name))
                .ForMember(dest => dest.CategoryIcon, opt => opt.MapFrom(src => src.Category.Icon))
                .ForMember(dest => dest.CategoryColor, opt => opt.MapFrom(src => src.Category.Color));

            // Budget mappings
            CreateMap<Budget, BudgetResponse>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : "Overall"))
                .ForMember(dest => dest.CategoryColor, opt => opt.MapFrom(src => src.Category != null ? src.Category.Color : "#cccccc"))
                .ForMember(dest => dest.CurrentSpending, opt => opt.Ignore()) // Calculated in controller/service
                .ForMember(dest => dest.PercentageUsed, opt => opt.Ignore()); // Calculated in controller/service

            // SavingsGoal mappings
            CreateMap<SavingsGoal, SavingsGoalResponse>()
                .ForMember(dest => dest.ProgressPercentage, opt => opt.MapFrom(src => 
                    src.TargetAmount > 0 ? Math.Min(100.0, Math.Round((src.CurrentAmount / src.TargetAmount) * 100, 2)) : 0));

            // Notification mappings
            CreateMap<Notification, NotificationResponse>();

            // AuditLog mappings
            CreateMap<AuditLog, AuditLogResponse>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User != null ? src.User.Username : "System"));
        }
    }
}
