FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["FinTrack.Api.csproj", "./"]
RUN dotnet restore "FinTrack.Api.csproj"
COPY . .
RUN dotnet build "FinTrack.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FinTrack.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
RUN mkdir -p wwwroot/uploads
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "FinTrack.Api.dll"]
