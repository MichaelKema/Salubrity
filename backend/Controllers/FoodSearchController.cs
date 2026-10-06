using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace backend.Controllers;

[ApiController]
[Route("api/foods/search")]
public class FoodSearchController(IHttpClientFactory clients, IMemoryCache cache) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery, Required, StringLength(120, MinimumLength = 2)] string query,
        CancellationToken cancellationToken)
    {
        query = query.Trim();
        if (query.Length < 2) return BadRequest(new { message = "Enter at least two characters to search." });
        var key = "food-search:" + query.ToLowerInvariant();
        if (cache.TryGetValue<JsonElement>(key, out var cached)) return Ok(new { products = cached });

        try
        {
            // Search-a-licious supports full-text queries. The legacy CGI endpoint is unreliable.
            var url = "search?q=" + Uri.EscapeDataString(query) +
                "&page_size=24&fields=code,product_name,brands,nutriments";
            using var response = await clients.CreateClient("FoodSearch").GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return StatusCode(response.StatusCode == System.Net.HttpStatusCode.TooManyRequests ? 429 : 503,
                    new { message = "Open Food Facts is temporarily unavailable. Please try again shortly, or add a custom food." });

            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            if (!body.RootElement.TryGetProperty("hits", out var hits) || hits.ValueKind != JsonValueKind.Array)
                return StatusCode(502, new { message = "The food search service returned an unexpected response. Please try again." });
            if (body.RootElement.TryGetProperty("timed_out", out var timedOut) && timedOut.ValueKind == JsonValueKind.True)
                return StatusCode(504, new { message = "Food search took too long. Please try again." });

            var products = hits.Clone();
            cache.Set(key, products, new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10)).SetSize(1));
            return Ok(new { products });
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new { message = "Food search took too long. Please try again." });
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new { message = "Couldn’t reach Open Food Facts. Please try again shortly, or add a custom food." });
        }
        catch (JsonException)
        {
            return StatusCode(502, new { message = "The food search service returned an unexpected response. Please try again." });
        }
    }
}
