import { getApiBaseUrl } from '../config/env';
import type {
  ApiUserIngredient,
  CreateUserIngredientRequest,
  PatchUserIngredientRequest,
} from '../types/userIngredients';

/** Escolhe o nome da unidade para exibir junto à quantidade na despensa. */
function pickMeasureUnitDisplayName(nested: Record<string, unknown> | undefined): string | undefined {
  if (!nested || typeof nested !== 'object') return undefined;

  const raw = nested.ingredientUnitMeasureUnits ?? nested.ingredient_unit_measure_units;
  const arr = Array.isArray(raw) ? raw : [];
  const rows = arr
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const id = String(r.measureUnitsId ?? r.measure_units_id ?? '').trim();
      const name = String(r.name ?? '').trim();
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((x): x is { id: string; name: string } => x !== null);

  const muNested = nested.measureUnit ?? nested.measure_unit;
  if (muNested && typeof muNested === 'object') {
    const muId = String((muNested as Record<string, unknown>).id ?? '').trim();
    if (muId) {
      const found = rows.find((r) => r.id === muId);
      if (found) return found.name;
    }
    const fallbackName = (muNested as Record<string, unknown>).name;
    if (typeof fallbackName === 'string' && fallbackName.trim()) {
      return fallbackName.trim();
    }
  }

  if (rows.length === 1) return rows[0].name;
  if (rows.length > 1) return rows.map((r) => r.name).join(', ');

  return undefined;
}
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

function parseList<T>(data: unknown, mapFn: (item: unknown) => T): T[] {
  if (Array.isArray(data)) return data.map(mapFn);
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const arr = o.data ?? o.items ?? o.results;
    if (Array.isArray(arr)) return arr.map(mapFn);
  }
  return [];
}

export function normalizeUserIngredient(raw: unknown): ApiUserIngredient {
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o._id;
  const ingredientId = o.ingredientId ?? o.ingredient_id;
  const quantity = o.quantity ?? o.quantidade;
  const nested = (o.ingredient ?? o.ingredients) as Record<string, unknown> | undefined;
  let nome = '';
  let imageUrl: string | null | undefined;
  let measureUnitName: string | undefined;
  if (nested && typeof nested === 'object') {
    nome = String(nested.name ?? nested.nome ?? '');
    const img = nested.imageUrl ?? nested.image_url;
    imageUrl =
      img === null || img === undefined ? null : typeof img === 'string' ? img : String(img);
    measureUnitName = pickMeasureUnitDisplayName(nested);
  }
  const out: ApiUserIngredient = {
    id: String(id ?? ''),
    ingredientId: String(ingredientId ?? ''),
    quantity: String(quantity ?? ''),
    nome: nome.trim() || 'Ingrediente',
    imageUrl,
  };
  if (measureUnitName) out.measureUnitName = measureUnitName;
  return out;
}

/**
 * Lista itens da despensa do usuário (GET /user-ingredients).
 */
export async function listUserIngredientsApi(accessToken: string): Promise<ApiUserIngredient[]> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/user-ingredients`, {
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

  return parseList(data, normalizeUserIngredient);
}

/**
 * Adiciona à despensa (POST /user-ingredients) — 201.
 */
export async function createUserIngredientApi(
  accessToken: string,
  body: CreateUserIngredientRequest
): Promise<ApiUserIngredient> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/user-ingredients`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        ingredientId: body.ingredientId,
        quantity: body.quantity.trim().slice(0, 100),
      }),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return normalizeUserIngredient(data);
}

/**
 * Atualiza registro da despensa (PATCH /user-ingredients/:id).
 */
export async function patchUserIngredientApi(
  accessToken: string,
  rowId: string,
  body: PatchUserIngredientRequest
): Promise<ApiUserIngredient> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload: Record<string, unknown> = {};
  if (body.ingredientId !== undefined) payload.ingredientId = body.ingredientId;
  if (body.quantity !== undefined) payload.quantity = body.quantity.trim().slice(0, 100);

  let res: Response;
  try {
    res = await fetch(`${base}/user-ingredients/${encodeURIComponent(rowId)}`, {
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

  return normalizeUserIngredient(data);
}

/**
 * Remove da despensa (DELETE /user-ingredients/:id) — 204.
 */
export async function deleteUserIngredientApi(accessToken: string, rowId: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/user-ingredients/${encodeURIComponent(rowId)}`, {
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
