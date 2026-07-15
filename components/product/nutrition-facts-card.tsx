import { AlertTriangle } from 'lucide-react';
import { escapeHtml } from '@/lib/utils';

type HealthInfo = {
  servingSize: string;
  servingsPerContainer?: { toString(): string } | null;
  calories: number;
  proteinGrams: { toString(): string };
  carbohydratesGrams: { toString(): string };
  fatGrams: { toString(): string };
  fiberGrams?: { toString(): string } | null;
  sugarGrams?: { toString(): string } | null;
  sodiumMg?: number | null;
  allergens: string[];
  additionalNotes?: string | null;
};

export function NutritionFactsCard({
  healthInfo,
  ingredients,
}: {
  healthInfo: HealthInfo;
  ingredients?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-foreground/80 bg-card p-6">
      <h2 className="border-b-8 border-foreground pb-2 text-2xl font-bold">Nutrition Facts</h2>
      <p className="mt-2 text-sm">Serving size: {healthInfo.servingSize}</p>
      {healthInfo.servingsPerContainer && (
        <p className="text-sm text-muted-foreground">Servings per container: {String(healthInfo.servingsPerContainer)}</p>
      )}
      <div className="mt-4 border-b-4 border-foreground py-2">
        <p className="text-3xl font-bold">{healthInfo.calories} <span className="text-lg font-normal">Calories</span></p>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {(
          [
            ['Protein', `${healthInfo.proteinGrams}g`],
            ['Total Carbohydrate', `${healthInfo.carbohydratesGrams}g`],
            ['Total Fat', `${healthInfo.fatGrams}g`],
            healthInfo.fiberGrams ? ['Dietary Fiber', `${healthInfo.fiberGrams}g`] : null,
            healthInfo.sugarGrams ? ['Total Sugars', `${healthInfo.sugarGrams}g`] : null,
            healthInfo.sodiumMg != null ? ['Sodium', `${healthInfo.sodiumMg}mg`] : null,
          ] as Array<[string, string] | null>
        )
          .filter((row): row is [string, string] => row !== null)
          .map(([label, value]) => (
            <div key={label as string} className="flex justify-between border-b border-border py-1">
              <span>{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
      </div>
      {ingredients && (
        <div className="mt-4">
          <p className="font-semibold">Ingredients</p>
          <p className="mt-1 text-sm text-muted-foreground">{escapeHtml(ingredients)}</p>
        </div>
      )}
      {healthInfo.allergens.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Allergen information</p>
              <p className="mt-1">Contains: {healthInfo.allergens.map(escapeHtml).join(', ')}</p>
              <p className="mt-2 text-xs">Always check packaging if you have severe allergies.</p>
            </div>
          </div>
        </div>
      )}
      {healthInfo.additionalNotes && (
        <p className="mt-4 text-sm text-muted-foreground">{escapeHtml(healthInfo.additionalNotes)}</p>
      )}
    </div>
  );
}
