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
import type { ApiUserIngredient } from '../types/userIngredients';
import {
  listUserIngredientsApi,
  createUserIngredientApi,
  patchUserIngredientApi,
  deleteUserIngredientApi,
} from '../services/userIngredientsApi';
import { AuthApiError } from '../services/authApi';

interface UserPantryContextType {
  items: ApiUserIngredient[];
  loading: boolean;
  /** silent: não altera `loading` (útil para pull-to-refresh sem tela cheia) */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  addToPantry: (ingredientId: string, quantity: string) => Promise<void>;
  updatePantryQuantity: (rowId: string, quantity: string) => Promise<void>;
  removeFromPantry: (rowId: string) => Promise<void>;
  clearPantry: () => Promise<void>;
  /** Verifica se o usuário tem o ingrediente pelo nome (comparação case-insensitive) */
  hasIngredientName: (name: string) => boolean;
  /** Quantidade na despensa para um nome de ingrediente, se existir */
  getQuantityForName: (name: string) => string | undefined;
}

const UserPantryContext = createContext<UserPantryContextType | undefined>(undefined);

export const UserPantryProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const { showError } = useToast();
  const [items, setItems] = useState<ApiUserIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const list = await listUserIngredientsApi(accessToken);
      setItems(list);
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível carregar sua despensa.';
      showError(msg, 'Despensa');
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, showError]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      void refresh();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, refresh]);

  const addToPantry = useCallback(
    async (ingredientId: string, quantity: string) => {
      if (!accessToken) return;
      const q = quantity.trim();
      if (!q || q.length > 100) {
        showError('Informe uma quantidade (até 100 caracteres).', 'Validação');
        return;
      }
      try {
        const created = await createUserIngredientApi(accessToken, { ingredientId, quantity: q });
        setItems((prev) => [created, ...prev]);
      } catch (e) {
        const msg =
          e instanceof AuthApiError ? e.message : 'Não foi possível adicionar à despensa.';
        showError(msg, 'Erro');
        throw e;
      }
    },
    [accessToken, showError]
  );

  const updatePantryQuantity = useCallback(
    async (rowId: string, quantity: string) => {
      if (!accessToken) return;
      const q = quantity.trim();
      if (!q || q.length > 100) {
        showError('Informe uma quantidade (até 100 caracteres).', 'Validação');
        return;
      }
      try {
        const updated = await patchUserIngredientApi(accessToken, rowId, { quantity: q });
        setItems((prev) => prev.map((i) => (i.id === rowId ? updated : i)));
      } catch (e) {
        const msg =
          e instanceof AuthApiError ? e.message : 'Não foi possível atualizar.';
        showError(msg, 'Erro');
        throw e;
      }
    },
    [accessToken, showError]
  );

  const removeFromPantry = useCallback(
    async (rowId: string) => {
      if (!accessToken) return;
      try {
        await deleteUserIngredientApi(accessToken, rowId);
        setItems((prev) => prev.filter((i) => i.id !== rowId));
      } catch (e) {
        const msg =
          e instanceof AuthApiError ? e.message : 'Não foi possível remover.';
        showError(msg, 'Erro');
        throw e;
      }
    },
    [accessToken, showError]
  );

  const clearPantry = useCallback(async () => {
    if (!accessToken || items.length === 0) return;
    const ids = [...items];
    for (const row of ids) {
      try {
        await deleteUserIngredientApi(accessToken, row.id);
      } catch (e) {
        const msg =
          e instanceof AuthApiError ? e.message : 'Erro ao limpar despensa.';
        showError(msg, 'Erro');
        await refresh();
        return;
      }
    }
    setItems([]);
  }, [accessToken, items, refresh, showError]);

  const hasIngredientName = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase();
      return items.some((i) => i.nome.toLowerCase() === n);
    },
    [items]
  );

  const getQuantityForName = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase();
      const found = items.find((i) => i.nome.toLowerCase() === n);
      return found?.quantity;
    },
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      refresh,
      addToPantry,
      updatePantryQuantity,
      removeFromPantry,
      clearPantry,
      hasIngredientName,
      getQuantityForName,
    }),
    [
      items,
      loading,
      refresh,
      addToPantry,
      updatePantryQuantity,
      removeFromPantry,
      clearPantry,
      hasIngredientName,
      getQuantityForName,
    ]
  );

  return <UserPantryContext.Provider value={value}>{children}</UserPantryContext.Provider>;
};

export const useUserPantry = () => {
  const ctx = useContext(UserPantryContext);
  if (!ctx) throw new Error('useUserPantry must be used within UserPantryProvider');
  return ctx;
};
