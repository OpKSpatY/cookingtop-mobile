import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import type { Recipe } from '../data/mockData';
import type { CreateRecipeRequest, PatchRecipeRequest } from '../types/recipes';
import {
  fetchRecipesListWithRaw,
  getRecipeByIdApi,
  createRecipeApi,
  createRecipeWithImageApi,
  patchRecipeApi,
  deleteRecipeApi,
} from '../services/recipesApi';
import { AuthApiError } from '../services/authApi';
import { ensureRecipeIsOwn } from '../utils/recipeUi';
import { hydrateRecipesListFromDisk, persistRecipesListCache } from '../utils/recipesListCache';

interface UserRecipesContextType {
  recipes: Recipe[];
  myRecipes: Recipe[];
  loading: boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  fetchRecipeById: (id: string) => Promise<Recipe>;
  createRecipe: (
    body: CreateRecipeRequest,
    options?: {
      localImage?: { uri: string; mimeType: string; name: string };
    }
  ) => Promise<Recipe>;
  updateRecipe: (id: string, body: PatchRecipeRequest) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
}

const UserRecipesContext = createContext<UserRecipesContextType | undefined>(undefined);

export const UserRecipesProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, user } = useAuth();
  const { showError } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!accessToken || !user) {
        setRecipes([]);
        return;
      }
      try {
        const { recipes: list, rawBodyText } = await fetchRecipesListWithRaw(accessToken, user.id);
        setRecipes(list);
        await persistRecipesListCache(user.id, rawBodyText);
      } catch (e) {
        if (!silent) {
          const msg =
            e instanceof AuthApiError ? e.message : 'Não foi possível carregar as receitas.';
          showError(msg, 'Receitas');
        }
      }
    },
    [accessToken, user, showError]
  );

  useEffect(() => {
    if (!accessToken || !user) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    const userId = user.id;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const cached = await hydrateRecipesListFromDisk(userId);
      if (cancelled) return;
      if (cached?.length) {
        setRecipes(cached);
        setLoading(false);
      }
      try {
        const { recipes: list, rawBodyText } = await fetchRecipesListWithRaw(accessToken, userId);
        if (cancelled) return;
        setRecipes(list);
        await persistRecipesListCache(userId, rawBodyText);
      } catch (e) {
        if (!cached?.length) {
          const msg =
            e instanceof AuthApiError ? e.message : 'Não foi possível carregar as receitas.';
          showError(msg, 'Receitas');
          setRecipes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id, showError]);

  const fetchRecipeById = useCallback(
    async (id: string) => {
      if (!accessToken || !user) {
        throw new AuthApiError('Faça login para ver a receita.');
      }
      return getRecipeByIdApi(accessToken, id, user.id);
    },
    [accessToken, user]
  );

  const createRecipe = useCallback(
    async (
      body: CreateRecipeRequest,
      options?: { localImage?: { uri: string; mimeType: string; name: string } }
    ) => {
      if (!accessToken || !user) {
        throw new AuthApiError('Faça login para criar receitas.');
      }
      const img = options?.localImage;
      const recipe =
        img != null
          ? await createRecipeWithImageApi(accessToken, body, img, user.id)
          : await createRecipeApi(accessToken, body, user.id);
      const created = ensureRecipeIsOwn(recipe, user);
      setRecipes((prev) => {
        const without = prev.filter((r) => r.id !== created.id);
        return [created, ...without];
      });
      void refresh({ silent: true });
      return created;
    },
    [accessToken, user, refresh]
  );

  const updateRecipe = useCallback(
    async (id: string, body: PatchRecipeRequest) => {
      if (!accessToken || !user) {
        throw new AuthApiError('Faça login para editar receitas.');
      }
      const updated = ensureRecipeIsOwn(
        await patchRecipeApi(accessToken, id, body, user.id),
        user
      );
      setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      void refresh({ silent: true });
      return updated;
    },
    [accessToken, user, refresh]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      if (!accessToken || !user) {
        throw new AuthApiError('Faça login para excluir receitas.');
      }
      await deleteRecipeApi(accessToken, id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    },
    [accessToken, user]
  );

  const myRecipes = useMemo(() => recipes.filter((r) => r.isOwn), [recipes]);

  const value = useMemo(
    () => ({
      recipes,
      myRecipes,
      loading,
      refresh,
      fetchRecipeById,
      createRecipe,
      updateRecipe,
      deleteRecipe,
    }),
    [recipes, myRecipes, loading, refresh, fetchRecipeById, createRecipe, updateRecipe, deleteRecipe]
  );

  return <UserRecipesContext.Provider value={value}>{children}</UserRecipesContext.Provider>;
};

export const useUserRecipes = () => {
  const ctx = useContext(UserRecipesContext);
  if (!ctx) throw new Error('useUserRecipes must be used within UserRecipesProvider');
  return ctx;
};
