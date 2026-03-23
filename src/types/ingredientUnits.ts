/** POST /ingredient-units/upsert — cria ou atualiza vínculo ingrediente × unidade × gramas */
export interface UpsertIngredientUnitRequest {
  ingredientId: string;
  measureUnitsId: string;
  gramsEquivalent: number;
}
