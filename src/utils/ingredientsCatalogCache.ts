import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import { fetchIngredientsListApi, parseIngredientsListPayload } from '../services/ingredientsApi';
import type { ApiIngredient } from '../types/ingredients';

/** Hidrata lista a partir do último JSON 200 guardado (cold start / antes da rede). */
export async function hydrateIngredientsCatalogFromDisk(): Promise<ApiIngredient[] | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.INGREDIENTS_LIST_PAYLOAD);
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    return parseIngredientsListPayload(data);
  } catch {
    return null;
  }
}

export async function getStoredIngredientsEtag(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.INGREDIENTS_LIST_ETAG);
}

export async function persistIngredientsCatalogCache(
  etag: string | null,
  rawBodyText: string
): Promise<void> {
  const pairs: [string, string][] = [[STORAGE_KEYS.INGREDIENTS_LIST_PAYLOAD, rawBodyText]];
  if (etag?.trim()) {
    pairs.push([STORAGE_KEYS.INGREDIENTS_LIST_ETAG, etag]);
  }
  await AsyncStorage.multiSet(pairs);
}

/**
 * GET /ingredients com ETag. Em 304, `ingredients` é null — manter a lista já em memória/cache em disco.
 */
export async function syncIngredientsCatalog(
  accessToken: string,
  options?: { bypassConditional?: boolean }
): Promise<{ ingredients: ApiIngredient[] | null; notModified: boolean }> {
  const storedEtag = options?.bypassConditional ? null : await getStoredIngredientsEtag();
  const result = await fetchIngredientsListApi(accessToken, storedEtag, options);
  if (result.status === 'not_modified') {
    if (result.etag?.trim()) {
      await AsyncStorage.setItem(STORAGE_KEYS.INGREDIENTS_LIST_ETAG, result.etag);
    }
    return { ingredients: null, notModified: true };
  }
  await persistIngredientsCatalogCache(result.etag, result.rawBodyText);
  return { ingredients: result.ingredients, notModified: false };
}
