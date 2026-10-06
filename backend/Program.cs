using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var builder = WebApplication.CreateBuilder(args);
var desktop = builder.Configuration.GetValue<bool>("Salubrity:Desktop");
var token = Environment.GetEnvironmentVariable("SALUBRITY_API_TOKEN");
if (desktop && (token is null || token.Length < 64))
    throw new InvalidOperationException("Desktop mode requires a private session token.");

// Desktop chooses an available port; browser development remains on 5289.
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, desktop ? 0 : builder.Configuration.GetValue<int?>("Salubrity:Port") ?? 5289));
builder.Services.AddControllers();
builder.Services.AddSingleton<backend.Controllers.TrackerStore>();
builder.Services.AddMemoryCache(options => options.SizeLimit = 256);
builder.Services.AddHttpClient("FoodSearch", client =>
{
    client.BaseAddress = new Uri("https://search.openfoodfacts.org/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Salubrity/0.1");
});
var allowedOrigins = new[] { "http://localhost:5173", "http://127.0.0.1:5173" };
builder.Services.AddCors(options => options.AddPolicy("LocalFrontend", policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.Use(async (context, next) =>
{
    // Reject unexpected Host headers and remote clients, including DNS rebinding.
    if (context.Connection.RemoteIpAddress is not { } remote || !IPAddress.IsLoopback(remote)
        || context.Request.Host.Host is not ("localhost" or "127.0.0.1" or "[::1]"))
    {
        context.Response.StatusCode = 403;
        await context.Response.WriteAsJsonAsync(new { message = "Local access only." });
        return;
    }
    if (desktop)
    {
        var supplied = context.Request.Headers["X-Salubrity-Token"].ToString();
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(token!));
        var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(supplied));
        if (!CryptographicOperations.FixedTimeEquals(expectedHash, suppliedHash))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { message = "Unauthorized local client." });
            return;
        }
    }
    else if (context.Request.Headers.Origin.Count > 0 && !allowedOrigins.Contains(context.Request.Headers.Origin.ToString()))
    {
        context.Response.StatusCode = 403;
        await context.Response.WriteAsJsonAsync(new { message = "This origin is not allowed." });
        return;
    }
    await next();
});
app.UseRouting();
if (!desktop) app.UseCors("LocalFrontend");
app.MapControllers();

if (desktop)
{
    // Shut down even if the native app crashes and cannot clean up its child.
    var parentId = builder.Configuration.GetValue<int>("Salubrity:ParentPid");
    if (parentId <= 0) throw new InvalidOperationException("Desktop mode requires a parent process.");
    var parent = Process.GetProcessById(parentId);
    _ = WatchParent(parent, app.Lifetime);
}
await app.StartAsync();
if (desktop)
{
    var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
    Console.WriteLine("SALUBRITY_READY:" + addresses.Addresses.Single());
    Console.Out.Flush();
}
await app.WaitForShutdownAsync();

static async Task WatchParent(Process parent, IHostApplicationLifetime lifetime)
{
    using (parent)
    {
        await parent.WaitForExitAsync();
        lifetime.StopApplication();
    }
}
