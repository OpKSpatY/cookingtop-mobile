import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Recipe } from '../data/mockData';

interface UserRecipesContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;
}

const UserRecipesContext = createContext<UserRecipesContextType | undefined>(undefined);

export const UserRecipesProvider = ({ children }: { children: ReactNode }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const addRecipe = (recipe: Recipe) => setRecipes((prev) => [...prev, recipe]);
  const removeRecipe = (id: string) => setRecipes((prev) => prev.filter((r) => r.id !== id));

  return (
    <UserRecipesContext.Provider value={{ recipes, addRecipe, removeRecipe }}>
      {children}
    </UserRecipesContext.Provider>
  );
};

export const useUserRecipes = () => {
  const ctx = useContext(UserRecipesContext);
  if (!ctx) throw new Error('useUserRecipes must be used within UserRecipesProvider');
  return ctx;
};
