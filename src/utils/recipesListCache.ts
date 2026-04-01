import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import type { Recipe } from '../data/mockData';
import { mapRawRecipesJsonToRecipes } from '../services/recipesApi';

type StoredRecipesCache = {
  userId: string;
  rawBodyText: string;
};

export async function hydrateRecipesListFromDisk(userId: string): Promise<Recipe[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECIPES_LIST_CACHE);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as StoredRecipesCache;
    if (parsed.userId !== userId || !parsed.rawBodyText?.trim()) return null;
    const data = JSON.parse(parsed.rawBodyText) as unknown;
    return mapRawRecipesJsonToRecipes(data, userId);
  } catch {
    return null;
  }
}

export async function persistRecipesListCache(userId: string, rawBodyText: string): Promise<void> {
  const payload: StoredRecipesCache = { userId, rawBodyText };
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPES_LIST_CACHE, JSON.stringify(payload));
}

export async function clearRecipesListCache(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.RECIPES_LIST_CACHE);
}
