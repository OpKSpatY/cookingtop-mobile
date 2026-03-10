import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Recipe } from '../data/mockData';
import { mockRecipes } from '../data/mockData';

interface FavoritesContextType {
  favorites: Recipe[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (recipe: Recipe) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([mockRecipes[0], mockRecipes[3]]);

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

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
