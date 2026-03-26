import { getApiBaseUrl } from '../config/env';
import type {
  ApiIngredient,
  ApiIngredientMeasureUnits,
  ApiMeasureUnit,
  CreateIngredientRequest,
  PatchIngredientRequest,
} from '../types/ingredients';
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

function normalizeIngredient(raw: unknown): ApiIngredient {
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o._id;
  const name = o.name ?? o.nome;
  const measureUnitsId = o.measureUnitsId ?? o.measure_units_id ?? o.measureUnitId;
  const imageUrl = o.imageUrl ?? o.image_url;
  const createdAt = o.createdAt ?? o.created_at;
  const updatedAt = o.updatedAt ?? o.updated_at;
  const measureUnits = o.measureUnits ?? o.measure_units;
  return {
    id: String(id ?? ''),
    name: String(name ?? ''),
    measureUnitsId: String(measureUnitsId ?? ''),
    imageUrl:
      imageUrl === null || imageUrl === undefined
        ? null
        : typeof imageUrl === 'string'
          ? imageUrl
          : String(imageUrl),
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : undefined,
    measureUnits:
      measureUnits !== null && measureUnits !== undefined
        ? (measureUnits as ApiIngredientMeasureUnits)
        : undefined,
  };
}

function normalizeMeasureUnit(raw: unknown): ApiMeasureUnit {
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o._id;
  return {
    id: String(id ?? ''),
    name: typeof o.name === 'string' ? o.name : typeof o.label === 'string' ? o.label : undefined,
    symbol: typeof o.symbol === 'string' ? o.symbol : undefined,
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

/** Parse do JSON de GET /ingredients (array ou envelope data/items/results). */
export function parseIngredientsListPayload(data: unknown): ApiIngredient[] {
  return parseList(data, normalizeIngredient);
}

export type FetchIngredientsListResult =
  | {
      status: 'modified';
      ingredients: ApiIngredient[];
      etag: string | null;
      rawBodyText: string;
    }
  | { status: 'not_modified'; etag: string | null };

/**
 * GET /ingredients com If-None-Match → pode responder 304 sem corpo.
 * `ifNoneMatch`: valor exato do ETag anterior (incl. aspas, se o servidor enviar assim).
 * `bypassConditional`: true = não envia If-None-Match (forçar 200 após mutações).
 */
export async function fetchIngredientsListApi(
  accessToken: string,
  ifNoneMatch: string | null | undefined,
  options?: { bypassConditional?: boolean }
): Promise<FetchIngredientsListResult> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const inm = options?.bypassConditional ? null : ifNoneMatch?.trim();
  if (inm) {
    headers['If-None-Match'] = inm;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/ingredients`, {
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
  const data = parseResponseJsonBody(text, res, []);

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return {
    status: 'modified',
    ingredients: parseIngredientsListPayload(data),
    etag: newEtag,
    rawBodyText: text,
  };
}

/**
 * Lista ingredientes (GET /ingredients) sem revalidação condicional — útil após POST/PATCH/DELETE.
 */
export async function listIngredientsApi(accessToken: string): Promise<ApiIngredient[]> {
  const r = await fetchIngredientsListApi(accessToken, null, { bypassConditional: true });
  if (r.status === 'not_modified') {
    throw new AuthApiError('Resposta inesperada (304) em GET /ingredients sem revalidação.');
  }
  return r.ingredients;
}

/**
 * Unidades de medida — GET /measure-units (ajuste se o backend usar outro path).
 */
export async function listMeasureUnitsApi(accessToken: string): Promise<ApiMeasureUnit[]> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/measure-units`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
  } catch {
    throw new AuthApiError(CONNECTION_MSG);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = parseResponseJsonBody(text, res, []);
  } catch {
    return [];
  }

  if (!res.ok) {
    return [];
  }

  return parseList(data, normalizeMeasureUnit);
}

/**
 * Cria ingrediente (POST /ingredients).
 */
export async function createIngredientApi(
  accessToken: string,
  body: CreateIngredientRequest
): Promise<ApiIngredient> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
    measureUnitsId: body.measureUnitsId,
  };
  if (body.imageUrl !== undefined && body.imageUrl !== null && String(body.imageUrl).trim() !== '') {
    payload.imageUrl = String(body.imageUrl).trim();
  }

  let res: Response;
  try {
    res = await fetch(`${base}/ingredients`, {
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

  return normalizeIngredient(data);
}

/**
 * Atualiza ingrediente (PATCH /ingredients/:id).
 */
export async function patchIngredientApi(
  accessToken: string,
  id: string,
  body: PatchIngredientRequest
): Promise<ApiIngredient> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.measureUnitsId !== undefined) payload.measureUnitsId = body.measureUnitsId;
  if (body.imageUrl !== undefined) payload.imageUrl = body.imageUrl;

  let res: Response;
  try {
    res = await fetch(`${base}/ingredients/${encodeURIComponent(id)}`, {
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

  return normalizeIngredient(data);
}

/**
 * Exclui ingrediente (DELETE /ingredients/:id) — 204 sem corpo.
 */
export async function deleteIngredientApi(accessToken: string, id: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  let res: Response;
  try {
    res = await fetch(`${base}/ingredients/${encodeURIComponent(id)}`, {
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
