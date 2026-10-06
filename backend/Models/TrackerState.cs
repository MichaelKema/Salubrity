using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.Models;

public class Nutrition
{
    [JsonRequired, Range(0, 1000000)] public decimal Calories { get; set; }
    [JsonRequired, Range(0, 1000000)] public decimal Protein { get; set; }
    [JsonRequired, Range(0, 1000000)] public decimal Carbs { get; set; }
    [JsonRequired, Range(0, 1000000)] public decimal Fat { get; set; }
    [Range(0, 1000000)] public decimal? Fiber { get; set; }
    [Range(0, 1000000)] public decimal? Sugar { get; set; }
    [Range(0, 10000000)] public decimal? Sodium { get; set; }
}

public class Food
{
    [Required, StringLength(100)] public string Id { get; set; } = "";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Required, StringLength(200)] public string Source { get; set; } = "Custom label";
    [Range(0.1, 10000)] public decimal BasisAmount { get; set; } = 100;
    [Required, RegularExpression("^(g|ml)$")] public string BasisUnit { get; set; } = "g";
    [Required] public Nutrition Nutrients { get; set; } = new();
}

public class Ingredient
{
    [Required] public string FoodId { get; set; } = "";
    [Range(0.1, 10000)] public decimal Amount { get; set; }
}

public class Meal
{
    [Required, StringLength(100)] public string Id { get; set; } = "";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Range(0.1, 100)] public decimal Servings { get; set; } = 1;
    [Required, MinLength(1), MaxLength(100)] public List<Ingredient> Ingredients { get; set; } = [];
}

public class DiaryEntry
{
    [Required, StringLength(100)] public string Id { get; set; } = "";
    public DateOnly Date { get; set; }
    [Required, RegularExpression("^(Breakfast|Lunch|Dinner|Snacks)$")] public string Slot { get; set; } = "Breakfast";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Required, StringLength(100)] public string Portion { get; set; } = "";
    [Required] public Nutrition Nutrients { get; set; } = new();
}

public class Targets
{
    [Range(1, 20000)] public decimal Calories { get; set; } = 2000;
    [Range(1, 2000)] public decimal Protein { get; set; } = 100;
    [Range(1, 2000)] public decimal Carbs { get; set; } = 250;
    [Range(1, 2000)] public decimal Fat { get; set; } = 65;
}

public class TrackerState : IValidatableObject
{
    [Range(0, long.MaxValue)] public long Revision { get; set; }
    [Required, MaxLength(5000)] public List<Food> Foods { get; set; } = [];
    [Required, MaxLength(1000)] public List<Meal> Meals { get; set; } = [];
    [Required, MaxLength(50000)] public List<DiaryEntry> Entries { get; set; } = [];
    [Required] public Targets Targets { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Foods == null || Meals == null || Entries == null) yield break;
        if (Foods.Any(f => f == null) || Meals.Any(m => m == null) || Entries.Any(e => e == null))
        {
            yield return new ValidationResult("Items cannot be null.");
            yield break;
        }
        if (Foods.Select(f => f.Id).Distinct().Count() != Foods.Count ||
            Meals.Select(m => m.Id).Distinct().Count() != Meals.Count ||
            Entries.Select(e => e.Id).Distinct().Count() != Entries.Count)
            yield return new ValidationResult("Item IDs must be unique.");
        var ids = Foods.Select(f => f.Id).ToHashSet();
        if (Meals.Any(m => m.Ingredients == null || m.Ingredients.Any(i => i == null || !ids.Contains(i.FoodId))))
            yield return new ValidationResult("Every meal ingredient must refer to a saved food.");
        if (Entries.Any(e => e.Date == default))
            yield return new ValidationResult("Diary entries need a valid date.");
    }
}
