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
  listRecipesApi,
  getRecipeByIdApi,
  createRecipeApi,
  patchRecipeApi,
  deleteRecipeApi,
} from '../services/recipesApi';
import { AuthApiError } from '../services/authApi';
import { ensureRecipeIsOwn } from '../utils/recipeUi';

interface UserRecipesContextType {
  /** Todas as receitas retornadas por GET /recipes */
  recipes: Recipe[];
  /** Apenas receitas criadas pelo usuário atual */
  myRecipes: Recipe[];
  loading: boolean;
  refresh: () => Promise<void>;
  fetchRecipeById: (id: string) => Promise<Recipe>;
  createRecipe: (body: CreateRecipeRequest) => Promise<Recipe>;
  updateRecipe: (id: string, body: PatchRecipeRequest) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
}

const UserRecipesContext = createContext<UserRecipesContextType | undefined>(undefined);

export const UserRecipesProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, user } = useAuth();
  const { showError } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !user) {
      setRecipes([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listRecipesApi(accessToken, user.id);
      setRecipes(list);
    } catch (e) {
      const msg =
        e instanceof AuthApiError ? e.message : 'Não foi possível carregar as receitas.';
      showError(msg, 'Receitas');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    async (body: CreateRecipeRequest) => {
      if (!accessToken || !user) {
        throw new AuthApiError('Faça login para criar receitas.');
      }
      const created = ensureRecipeIsOwn(
        await createRecipeApi(accessToken, body, user.id),
        user
      );
      setRecipes((prev) => {
        const without = prev.filter((r) => r.id !== created.id);
        return [created, ...without];
      });
      return created;
    },
    [accessToken, user]
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
      return updated;
    },
    [accessToken, user]
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
