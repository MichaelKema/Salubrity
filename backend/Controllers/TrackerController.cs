using System.Text.Json;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// A single local profile, persisted on this machine. Not an authenticated cloud service.
public sealed class TrackerStore(IWebHostEnvironment environment, IConfiguration config)
{
    private readonly string path = Path.Combine(config["Salubrity:DataDirectory"] ??
        Path.Combine(environment.ContentRootPath, "App_Data"), "nutrition.json");
    private readonly SemaphoreSlim gate = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    private async Task<TrackerState> Read() => File.Exists(path)
        ? JsonSerializer.Deserialize<TrackerState>(await File.ReadAllTextAsync(path), JsonOptions)
          ?? throw new InvalidDataException("The nutrition file is empty.")
        : new TrackerState();

    public async Task<TrackerState> Load()
    {
        await gate.WaitAsync();
        try { return await Read(); }
        finally { gate.Release(); }
    }

    public async Task<TrackerState?> Save(TrackerState state)
    {
        await gate.WaitAsync();
        try
        {
            var current = await Read();
            if (state.Revision != current.Revision) return null;
            state.Revision++;
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            if (!OperatingSystem.IsWindows())
                File.SetUnixFileMode(Path.GetDirectoryName(path)!, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            var temporary = path + ".tmp";
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(state, JsonOptions));
            if (!OperatingSystem.IsWindows())
                File.SetUnixFileMode(temporary, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            File.Move(temporary, path, overwrite: true);
            return state;
        }
        finally { gate.Release(); }
    }
}

[ApiController]
[Route("api/tracker")]
public class TrackerController(TrackerStore store) : ControllerBase
{
    [HttpGet]
    public async Task<TrackerState> Get() => await store.Load();

    [HttpPut, RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Put(TrackerState state)
    {
        var saved = await store.Save(state);
        return saved == null
            ? Conflict(new { message = "Your diary changed in another window. Reload to get the latest version before trying again." })
            : Ok(saved);
    }
}
