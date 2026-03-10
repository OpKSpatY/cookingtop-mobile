export interface NutritionalInfo {
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  sodio: number;
  porcaoRef: string;
}

export const nutritionalDatabase: Record<string, NutritionalInfo> = {
  ovos: { kcal: 143, proteinas: 13.0, carboidratos: 1.6, gorduras: 9.5, fibras: 0, sodio: 140, porcaoRef: '1 unidade (50g)' },
  'farinha de trigo': { kcal: 360, proteinas: 9.8, carboidratos: 75.1, gorduras: 1.4, fibras: 2.3, sodio: 2, porcaoRef: '1 xícara (120g)' },
  leite: { kcal: 61, proteinas: 3.3, carboidratos: 4.7, gorduras: 3.3, fibras: 0, sodio: 52, porcaoRef: '1 copo (200ml)' },
  arroz: { kcal: 128, proteinas: 2.5, carboidratos: 28.1, gorduras: 0.2, fibras: 1.6, sodio: 1, porcaoRef: '1 xícara (160g)' },
  'feijão preto': { kcal: 77, proteinas: 4.5, carboidratos: 14.0, gorduras: 0.5, fibras: 8.4, sodio: 2, porcaoRef: '1 concha (86g)' },
  cebola: { kcal: 39, proteinas: 1.7, carboidratos: 8.9, gorduras: 0.1, fibras: 2.2, sodio: 2, porcaoRef: '1 unidade (110g)' },
  alho: { kcal: 113, proteinas: 7.0, carboidratos: 23.9, gorduras: 0.2, fibras: 4.3, sodio: 4, porcaoRef: '2 dentes (6g)' },
  azeite: { kcal: 884, proteinas: 0, carboidratos: 0, gorduras: 100, fibras: 0, sodio: 0, porcaoRef: '1 colher (13ml)' },
  açúcar: { kcal: 387, proteinas: 0, carboidratos: 99.5, gorduras: 0, fibras: 0, sodio: 1, porcaoRef: '1 colher (10g)' },
  'chocolate em pó': { kcal: 378, proteinas: 5.0, carboidratos: 78.0, gorduras: 5.0, fibras: 3.0, sodio: 50, porcaoRef: '1 colher (10g)' },
  'polvilho azedo': { kcal: 351, proteinas: 0.4, carboidratos: 87.2, gorduras: 0.1, fibras: 0.4, sodio: 1, porcaoRef: '1 xícara (120g)' },
  salmão: { kcal: 170, proteinas: 19.3, carboidratos: 0, gorduras: 10.0, fibras: 0, sodio: 56, porcaoRef: '1 filé (100g)' },
  banana: { kcal: 92, proteinas: 1.4, carboidratos: 23.8, gorduras: 0.1, fibras: 2.0, sodio: 1, porcaoRef: '1 unidade (100g)' },
  granola: { kcal: 421, proteinas: 10.2, carboidratos: 63.9, gorduras: 15.6, fibras: 5.6, sodio: 18, porcaoRef: '1/4 xícara (30g)' },
  mel: { kcal: 309, proteinas: 0.3, carboidratos: 84.0, gorduras: 0, fibras: 0, sodio: 7, porcaoRef: '1 colher (21g)' },
  queijo: { kcal: 330, proteinas: 22.5, carboidratos: 1.6, gorduras: 26.0, fibras: 0, sodio: 580, porcaoRef: '1 fatia (30g)' },
  'creme de leite': { kcal: 199, proteinas: 2.5, carboidratos: 3.6, gorduras: 20.0, fibras: 0, sodio: 40, porcaoRef: '1 caixa (200g)' },
  'molho de tomate': { kcal: 31, proteinas: 1.5, carboidratos: 5.5, gorduras: 0.5, fibras: 1.5, sodio: 380, porcaoRef: '2 colheres (50g)' },
  frango: { kcal: 163, proteinas: 31.5, carboidratos: 0, gorduras: 3.2, fibras: 0, sodio: 75, porcaoRef: '1 filé (100g)' },
  'polpa de açaí': { kcal: 58, proteinas: 0.8, carboidratos: 6.2, gorduras: 3.9, fibras: 2.6, sodio: 5, porcaoRef: '1 polpa (100g)' },
  abacate: { kcal: 96, proteinas: 1.2, carboidratos: 6.0, gorduras: 8.4, fibras: 6.3, sodio: 2, porcaoRef: '2 colheres (60g)' },
  edamame: { kcal: 121, proteinas: 11.0, carboidratos: 8.9, gorduras: 5.2, fibras: 5.0, sodio: 6, porcaoRef: '1/2 xícara (80g)' },
  'arroz japonês': { kcal: 130, proteinas: 2.4, carboidratos: 28.7, gorduras: 0.2, fibras: 0.4, sodio: 1, porcaoRef: '1 xícara (160g)' },
};

export function getNutritionalInfo(nome: string): NutritionalInfo | null {
  const key = nome.toLowerCase().trim();
  if (nutritionalDatabase[key]) return nutritionalDatabase[key];
  const found = Object.entries(nutritionalDatabase).find(
    ([k]) => key.includes(k) || k.includes(key)
  );
  return found ? found[1] : null;
}

function parseQuantity(quantidade: string): number {
  const lower = quantidade.toLowerCase();
  const num = parseFloat(lower.replace(/[^\d.,]/g, '').replace(',', '.')) || 1;
  if (lower.includes('kg')) return num * 1000;
  if (lower.includes('litro') || lower.includes('l')) return num * 1000;
  if (lower.includes('ml')) return num;
  if (lower.includes('xícara') || lower.includes('xicara')) return num * 120;
  if (lower.includes('colher')) return num * 15;
  if (lower.includes('unidade') || lower.includes('un')) return num * 80;
  if (lower.includes('g')) return num;
  return num * 100;
}

export function estimateRecipeKcal(ingredientes: { nome: string; quantidade: string }[]): number {
  let total = 0;
  for (const ing of ingredientes) {
    const info = getNutritionalInfo(ing.nome);
    if (!info) continue;
    const qty = parseQuantity(ing.quantidade);
    total += Math.round((info.kcal * qty) / 100);
  }
  return total;
}
