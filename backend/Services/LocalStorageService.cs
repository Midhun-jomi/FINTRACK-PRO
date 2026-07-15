using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace FinTrack.Api.Services
{
    public class LocalStorageService : IStorageService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _uploadsFolder;

        public LocalStorageService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
            _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(_uploadsFolder))
            {
                Directory.CreateDirectory(_uploadsFolder);
            }
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
        {
            var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(fileName);
            var filePath = Path.Combine(_uploadsFolder, uniqueFileName);

            using (var destinationStream = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(destinationStream);
            }

            var request = _httpContextAccessor.HttpContext?.Request;
            var scheme = request?.Scheme ?? "https";
            if (request != null && !request.Host.Host.Contains("localhost") && !request.Host.Host.Contains("127.0.0.1"))
            {
                scheme = "https";
            }
            var fileUrl = $"{scheme}://{request?.Host}/uploads/{uniqueFileName}";
            return fileUrl;
        }

        public Task<bool> DeleteFileAsync(string fileUrl)
        {
            try
            {
                var uri = new Uri(fileUrl);
                var fileName = Path.GetFileName(uri.LocalPath);
                var filePath = Path.Combine(_uploadsFolder, fileName);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return Task.FromResult(true);
                }
            }
            catch
            {
                // Ignored
            }
            return Task.FromResult(false);
        }
    }
}
