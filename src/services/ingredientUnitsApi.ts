import { getApiBaseUrl } from '../config/env';
import type { UpsertIngredientUnitRequest } from '../types/ingredientUnits';
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

/**
 * Cria ou atualiza registro em ingredient_units (POST /ingredient-units/upsert).
 * Resposta esperada: 200 OK.
 */
export async function upsertIngredientUnitApi(
  accessToken: string,
  body: UpsertIngredientUnitRequest
): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');

  const payload = {
    ingredientId: body.ingredientId,
    measureUnitsId: body.measureUnitsId,
    gramsEquivalent: body.gramsEquivalent,
  };

  let res: Response;
  try {
    res = await fetch(`${base}/ingredient-units/upsert`, {
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
}
