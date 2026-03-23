/** Valores de dificuldade enviados/recebidos pela API */
export type RecipeDifficultyApi = 'FACIL' | 'MEDIO' | 'DIFICIL' | string;

export interface RecipeStepInput {
  description: string;
}

/**
 * Vínculo receita ↔ ingrediente (POST/PATCH /recipes).
 * Corpo: `amount` numérico + `note` opcional (ex.: tipo de farinha).
 */
export interface RecipeIngredientInput {
  ingredientId: string;
  amount: number;
  note?: string | null;
}

export interface CreateRecipeRequest {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  difficulty: RecipeDifficultyApi;
  prepTime: number;
  servings: number;
  isPrivate: boolean;
  steps: RecipeStepInput[];
  /** Opcional: substitui / define os ingredientes da receita (lista completa no PATCH) */
  ingredients?: RecipeIngredientInput[];
}

export interface PatchRecipeRequest {
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  difficulty?: RecipeDifficultyApi;
  prepTime?: number;
  servings?: number;
  isPrivate?: boolean;
  steps?: RecipeStepInput[];
  ingredients?: RecipeIngredientInput[];
}
