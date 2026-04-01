import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Recipe } from '../data/mockData';
interface FavoritesContextType {
  favorites: Recipe[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (recipe: Recipe) => void;
  /** Remove dos favoritos quando a receita deixa de existir (ex.: exclusão). */
  removeFavoriteByRecipeId: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((recipe: Recipe) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === recipe.id)
        ? prev.filter((f) => f.id !== recipe.id)
        : [...prev, recipe]
    );
  }, []);

  const removeFavoriteByRecipeId = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, removeFavoriteByRecipeId }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
