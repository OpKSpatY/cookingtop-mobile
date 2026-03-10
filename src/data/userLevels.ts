export interface UserLevel {
  level: number;
  title: string;
  icon: string;
  minXp: number;
  description: string;
}

export const userLevels: UserLevel[] = [
  { level: 1, title: 'Pinche', icon: '🥄', minXp: 0, description: 'Começando na cozinha' },
  { level: 2, title: 'Ajudante de Cozinha', icon: '🍳', minXp: 100, description: 'Já sabe o básico' },
  { level: 3, title: 'Cozinheiro Iniciante', icon: '🥘', minXp: 300, description: 'Ganhando confiança' },
  { level: 4, title: 'Cozinheiro', icon: '👨‍🍳', minXp: 600, description: 'Domina receitas do dia a dia' },
  { level: 5, title: 'Chef de Partie', icon: '🔪', minXp: 1000, description: 'Especialista em sua estação' },
  { level: 6, title: 'Sous Chef', icon: '⭐', minXp: 1500, description: 'Braço direito da cozinha' },
  { level: 7, title: 'Chef de Cozinha', icon: '🏅', minXp: 2500, description: 'Comanda a cozinha' },
  { level: 8, title: 'Mestre Cuca', icon: '👑', minXp: 4000, description: 'Lenda da gastronomia' },
];

export function getUserLevel(xp: number): UserLevel {
  let current = userLevels[0];
  for (const lvl of userLevels) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(xp: number): UserLevel | null {
  const current = getUserLevel(xp);
  const next = userLevels.find((l) => l.level === current.level + 1);
  return next ?? null;
}

export function getLevelProgress(xp: number): number {
  const current = getUserLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  const range = next.minXp - current.minXp;
  const progress = xp - current.minXp;
  return Math.min(Math.round((progress / range) * 100), 100);
}
