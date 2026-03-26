/**
 * Cliente HTTP das rotas /recipes (Nest sem globalPrefix).
 * Respostas: owner, owner_id, is_private (snake), recipeSteps com stepNumber;
 * requests: isPrivate (camel). POST → 201 com corpo da receita.
 */
import { getApiBaseUrl } from '../config/env';
import type { CreateRecipeRequest, PatchRecipeRequest } from '../types/recipes';
import type { RecipePantryComparison } from '../types/recipePantryComparison';
import type { Recipe } from '../data/mockData';
import { mapApiRecipeToRecipe } from '../utils/recipeUi';
import { AuthApiError, parseErrorMessage, parseResponseJsonBody } from './authApi';

const CONNECTION_MSG =
  'Não foi possível conectar ao servidor. Verifique a API e a rede.';

function authHeaders(accessToken: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function parseList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const arr = o.data ?? o.items ?? o.results;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

/**
 * Lista receitas públicas + privadas do usuário (GET /recipes).
 */
export async function listRecipesApi(
  accessToken: string,
  currentUserId: string | null
): Promise<Recipe[]> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/recipes`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, []);

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return parseList(data).map((raw) => mapApiRecipeToRecipe(raw, currentUserId));
}

/** Parse do JSON de GET /recipes/pantry-availability (can_make / cannot_make). */
export function mapPantryAvailabilityResponse(
  data: unknown,
  currentUserId: string | null
): { canMake: Recipe[]; cannotMake: Recipe[] } {
  const o = data as Record<string, unknown>;
  const canRaw = o.can_make ?? o.canMake;
  const cannotRaw = o.cannot_make ?? o.cannotMake;
  const mapArr = (x: unknown) =>
    Array.isArray(x) ? x.map((raw) => mapApiRecipeToRecipe(raw, currentUserId)) : [];
  return {
    canMake: mapArr(canRaw),
    cannotMake: mapArr(cannotRaw),
  };
}

export type PantryAvailabilityFetchResult =
  | {
      status: 'modified';
      canMake: Recipe[];
      cannotMake: Recipe[];
      etag: string | null;
      /** Corpo textual da 200 para persistir e hidratar após cold start */
      rawBodyText: string;
    }
  | { status: 'not_modified'; etag: string | null };

/**
 * GET /recipes/pantry-availability — listas can_make / cannot_make com suporte a If-None-Match → 304.
 */
export async function fetchRecipesPantryAvailabilityApi(
  accessToken: string,
  currentUserId: string | null,
  ifNoneMatch: string | null
): Promise<PantryAvailabilityFetchResult> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const inm = ifNoneMatch?.trim();
  if (inm) {
    headers['If-None-Match'] = inm;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/recipes/pantry-availability`, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const newEtag = res.headers.get('ETag');

  if (res.status === 304) {
    return { status: 'not_modified', etag: newEtag };
  }

  const text = await res.text();

  if (!res.ok) {
    const data = parseResponseJsonBody(text, res, {});
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  const data = parseResponseJsonBody(text, res, {});
  const { canMake, cannotMake } = mapPantryAvailabilityResponse(data, currentUserId);
  return {
    status: 'modified',
    canMake,
    cannotMake,
    etag: newEtag,
    rawBodyText: text,
  };
}

/**
 * Detalhe com passos ordenados (GET /recipes/:id).
 */
export async function getRecipeByIdApi(
  accessToken: string,
  id: string,
  currentUserId: string | null
): Promise<Recipe> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/recipes/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return mapApiRecipeToRecipe(data, currentUserId);
}

export async function createRecipeApi(
  accessToken: string,
  body: CreateRecipeRequest,
  currentUserId: string | null
): Promise<Recipe> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload: Record<string, unknown> = {
    title: body.title.trim(),
    description: body.description ?? null,
    imageUrl: body.imageUrl ?? null,
    difficulty: body.difficulty,
    prepTime: body.prepTime,
    servings: body.servings,
    isPrivate: body.isPrivate,
    steps: body.steps.map((s) => ({ description: s.description.trim() })),
  };
  if (body.ingredients !== undefined) {
    payload.ingredients = body.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      amount: i.amount,
      note:
        i.note === undefined || i.note === null || String(i.note).trim() === ''
          ? null
          : String(i.note).trim().slice(0, 500),
    }));
  }

  let res: Response;
  try {
    res = await fetch(`${base}/recipes`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }
  /* 201 Created ou 200 OK */
  return mapApiRecipeToRecipe(data, currentUserId);
}

export async function patchRecipeApi(
  accessToken: string,
  id: string,
  body: PatchRecipeRequest,
  currentUserId: string | null
): Promise<Recipe> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title.trim();
  if (body.description !== undefined) payload.description = body.description;
  if (body.imageUrl !== undefined) payload.imageUrl = body.imageUrl;
  if (body.difficulty !== undefined) payload.difficulty = body.difficulty;
  if (body.prepTime !== undefined) payload.prepTime = body.prepTime;
  if (body.servings !== undefined) payload.servings = body.servings;
  if (body.isPrivate !== undefined) payload.isPrivate = body.isPrivate;
  if (body.steps !== undefined) {
    payload.steps = body.steps.map((s) => ({ description: s.description.trim() }));
  }
  if (body.ingredients !== undefined) {
    payload.ingredients = body.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      amount: i.amount,
      note:
        i.note === undefined || i.note === null || String(i.note).trim() === ''
          ? null
          : String(i.note).trim().slice(0, 500),
    }));
  }

  let res: Response;
  try {
    res = await fetch(`${base}/recipes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return mapApiRecipeToRecipe(data, currentUserId);
}

/**
 * Compara ingredientes da receita com a despensa do usuário (GET /recipes/:id/pantry-comparison).
 */
export async function getRecipePantryComparisonApi(
  accessToken: string,
  recipeId: string
): Promise<RecipePantryComparison> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(
      `${base}/recipes/${encodeURIComponent(recipeId)}/pantry-comparison`,
      {
        method: 'GET',
        headers: authHeaders(accessToken),
      }
    );
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return data as RecipePantryComparison;
}

export async function deleteRecipeApi(accessToken: string, id: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/recipes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  if (res.status === 204 || res.status === 200) {
    return;
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});
  throw new AuthApiError(parseErrorMessage(data), res.status, data);
}
