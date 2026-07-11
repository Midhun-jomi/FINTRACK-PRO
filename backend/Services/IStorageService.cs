using System.IO;
using System.Threading.Tasks;

namespace FinTrack.Api.Services
{
    public interface IStorageService
    {
        /// <summary>
        /// Uploads a file stream to the storage provider and returns the public access URL.
        /// </summary>
        Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);

        /// <summary>
        /// Deletes a file from the storage provider.
        /// </summary>
        Task<bool> DeleteFileAsync(string fileUrl);
    }
}
