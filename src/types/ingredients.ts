/** measureUnits aninhado — formato definido pela API; mantido opaco no cliente quando necessário */
export type ApiIngredientMeasureUnits = Record<string, unknown> | Record<string, unknown>[] | null;

/** Ingrediente retornado pela API (campos comuns; nomes podem vir em snake_case e são normalizados no cliente) */
export interface ApiIngredient {
  id: string;
  name: string;
  measureUnitsId: string;
  imageUrl?: string | null;
  createdAt?: string;
  /** ISO 8601 — GET /ingredients com cache condicional */
  updatedAt?: string;
  measureUnits?: ApiIngredientMeasureUnits;
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
