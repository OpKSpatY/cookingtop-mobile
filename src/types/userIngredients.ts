/** Uma linha de ingredient_units vinda aninhada em `ingredient` (GET /user-ingredients) */
export interface IngredientUnitMeasureRow {
  measureUnitsId: string;
  name: string;
  abbreviation?: string;
}

/** Registro em user_ingredients (linha da despensa do usuário) */
export interface ApiUserIngredient {
  /** UUID da linha em user_ingredients */
  id: string;
  /** UUID do ingrediente global (tabela ingredients) */
  ingredientId: string;
  quantity: string;
  /** Preenchido a partir do objeto aninhado `ingredient` na resposta da API */
  nome: string;
  imageUrl?: string | null;
  /**
   * Nome da unidade de medida para exibição (ex.: após a quantidade).
   * Derivado de `ingredient.ingredientUnitMeasureUnits` e/ou `ingredient.measureUnit`.
   */
  measureUnitName?: string;
}

export interface CreateUserIngredientRequest {
  ingredientId: string;
  quantity: string;
}

export interface PatchUserIngredientRequest {
  ingredientId?: string;
  quantity?: string;
}
