/** Ingrediente retornado pela API (campos comuns; nomes podem vir em snake_case e são normalizados no cliente) */
export interface ApiIngredient {
  id: string;
  name: string;
  measureUnitsId: string;
  imageUrl?: string | null;
}

export interface CreateIngredientRequest {
  name: string;
  measureUnitsId: string;
  imageUrl?: string | null;
}

export interface PatchIngredientRequest {
  name?: string;
  measureUnitsId?: string;
  imageUrl?: string | null;
}

/** Unidade de medida (para POST /ingredients). Ajuste o path em ingredientsApi se sua API for outro. */
export interface ApiMeasureUnit {
  id: string;
  name?: string;
  symbol?: string;
}
