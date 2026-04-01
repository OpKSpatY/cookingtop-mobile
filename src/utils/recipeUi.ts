import type { ImageSourcePropType } from 'react-native';
import type { Recipe } from '../data/mockData';

export const DEFAULT_RECIPE_IMAGE = require('../assets/hero-food.jpg');

const DIFFICULTY_LABELS: Record<string, string> = {
  FACIL: 'Fácil',
  EASY: 'Fácil',
  MEDIO: 'Médio',
  MEDIUM: 'Médio',
  DIFICIL: 'Difícil',
  HARD: 'Difícil',
};

export function difficultyToLabel(code: string | undefined): string {
  if (!code?.trim()) return '';
  const u = code.toUpperCase();
  return DIFFICULTY_LABELS[u] ?? DIFFICULTY_LABELS[code] ?? code;
}

export function formatPrepTimeMinutes(minutes: number): string {
  if (!minutes || minutes < 1) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function formatAmountForDisplay(n: number): string {
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(n);
}

function normalizeIngredientRows(
  raw: unknown
): {
  nome: string;
  quantidade: string;
  ingredientId?: string;
  amount?: number;
  note?: string | null;
}[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const ing = (o.ingredient ?? o.ingrediente) as Record<string, unknown> | undefined;
      const ingredientId = str(
        o.ingredientId ?? o.ingredient_id ?? ing?.id ?? ''
      ).trim();
      const nome = str(
        o.nome ?? o.name ?? ing?.name ?? ing?.nome ?? o.ingredientName ?? ''
      ).trim();
      const amountNum = Number(o.amount);
      const hasAmount = typeof o.amount === 'number' && Number.isFinite(amountNum);
      const noteRaw = o.note;
      const note =
        noteRaw === null || noteRaw === undefined
          ? null
          : String(noteRaw).trim() === ''
            ? null
            : String(noteRaw).trim();

      let quantidade = '';
      if (hasAmount) {
        quantidade = formatAmountForDisplay(amountNum);
        if (note) quantidade = `${quantidade} (${note})`;
      } else {
        quantidade = str(o.quantidade ?? o.quantity ?? '').trim();
      }
      if (!nome && !ingredientId) return null;
      const base = {
        nome: nome || 'Ingrediente',
        quantidade: quantidade || '—',
        ...(hasAmount ? { amount: amountNum, note: note ?? null } : {}),
      };
      return ingredientId ? { ...base, ingredientId } : base;
    })
    .filter(
      (
        x
      ): x is {
        nome: string;
        quantidade: string;
        ingredientId?: string;
        amount?: number;
        note?: string | null;
      } => x !== null
    );
}

/**
 * Alguns endpoints enviam a receita completa dentro de `recipe`;
 * sem isso, campos como `image_url` ficam só no aninhado e o mapper não os vê.
 */
function flattenRecipeApiObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const nest = o.recipe;
  if (nest && typeof nest === 'object' && !Array.isArray(nest)) {
    return { ...o, ...(nest as Record<string, unknown>) };
  }
  return o;
}

function extractCoverImageUrl(o: Record<string, unknown>): string | null {
  const keyCandidates = [
    'imageUrl',
    'image_url',
    'coverImageUrl',
    'cover_image_url',
    'photoUrl',
    'photo_url',
    'thumbnailUrl',
    'thumbnail_url',
    'pictureUrl',
    'picture_url',
    'bannerUrl',
    'banner_url',
  ];
  for (const k of keyCandidates) {
    const v = o[k];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) return t;
    }
  }
  const singleImage = o.image;
  if (typeof singleImage === 'string') {
    const t = singleImage.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
  }
  const arr = o.images ?? o.image_urls ?? o.imageUrls;
  if (Array.isArray(arr)) {
    for (const x of arr) {
      if (typeof x === 'string' && x.trim().startsWith('http')) {
        return x.trim();
      }
    }
  }
  const cover = o.cover;
  if (cover && typeof cover === 'object' && !Array.isArray(cover)) {
    const c = cover as Record<string, unknown>;
    const u = c.url ?? c.uri ?? c.src ?? c.href;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return null;
}

function normalizeSteps(o: Record<string, unknown>): string[] {
  const arr = o.recipeSteps ?? o.steps;
  if (!Array.isArray(arr)) return [];
  type Row = { order: number; desc: string };
  const rows: Row[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const desc = str(s.description ?? s.text ?? '').trim();
    if (!desc) continue;
    const stepNum = Number(s.stepNumber ?? s.step_number);
    const order = Number.isFinite(stepNum) && stepNum > 0 ? stepNum : i + 1;
    rows.push({ order, desc });
  }
  rows.sort((a, b) => a.order - b.order);
  return rows.map((r) => r.desc);
}

/**
 * Converte resposta da API em `Recipe` usado nas telas.
 */
export function mapApiRecipeToRecipe(raw: unknown, currentUserId: string | null): Recipe {
  const o = flattenRecipeApiObject(raw);
  const id = str(o.id ?? o._id);
  const title = str(o.title ?? o.name ?? o.nome ?? 'Receita');
  const description =
    o.description === null || o.description === undefined
      ? undefined
      : typeof o.description === 'string'
        ? o.description
        : undefined;

  const imageUrl = extractCoverImageUrl(o);

  /** Resposta da API: `owner` + `owner_id` (snake_case) */
  const userObj = (o.owner ?? o.user ?? o.author ?? o.createdBy) as Record<string, unknown> | undefined;
  const authorName = str(
    userObj?.name ?? userObj?.nome ?? o.authorName ?? o.autor ?? 'Comunidade'
  );
  const ownerId = str(
    userObj?.id ??
      o.owner_id ??
      o.ownerId ??
      o.userId ??
      o.user_id ??
      o.createdByUserId ??
      o.created_by_user_id ??
      o.creatorId
  );
  const isOwnFlag = o.isOwn === true || o.isMine === true || o.isOwner === true;
  const isOwn =
    isOwnFlag || (!!currentUserId && !!ownerId && ownerId === currentUserId);

  const prepTime = Number(o.prepTime ?? o.prep_time ?? 0);
  const prep = Number.isFinite(prepTime) && prepTime > 0 ? prepTime : 30;
  const servings = Number(o.servings ?? o.porcoes ?? 1);
  const porcoes = Number.isFinite(servings) && servings > 0 ? Math.round(servings) : 1;

  const difficulty = str(o.difficulty ?? '');
  const difficultyLabel = difficultyToLabel(difficulty) || undefined;

  const rating = Number(o.rating ?? o.averageRating ?? o.score ?? 0);
  const totalRatings = Number(o.totalRatings ?? o.ratingsCount ?? o.reviewsCount ?? 0);

  const ingredientsRaw = o.ingredients ?? o.recipeIngredients ?? o.ingredientes;
  const ingredientes = normalizeIngredientRows(ingredientsRaw);

  const modoPreparo = normalizeSteps(o as Record<string, unknown>);

  const imagem: ImageSourcePropType = imageUrl ? { uri: imageUrl } : DEFAULT_RECIPE_IMAGE;

  const categoria = str(o.category ?? o.categoria ?? 'Geral') || 'Geral';

  /** Request: isPrivate (camelCase) · Response: is_private (snake_case) */
  const isPrivate = Boolean(o.is_private ?? o.isPrivate);

  const recipe: Recipe = {
    id,
    nome: title,
    imagem,
    imageUrl,
    rating: Number.isFinite(rating) ? rating : 0,
    totalRatings: Number.isFinite(totalRatings) ? totalRatings : 0,
    tempoPreparo: formatPrepTimeMinutes(prep),
    prepTimeMinutes: prep,
    categoria,
    autor: authorName,
    ingredientes,
    modoPreparo,
    porcoes,
    observacoes: description ?? undefined,
    description: description ?? null,
    publica: !isPrivate,
    isOwn,
    difficulty: difficulty || undefined,
    difficultyLabel,
  };
  if (ownerId) recipe.ownerId = ownerId;
  return recipe;
}

/** Garante que receita recém-criada/atualizada pelo usuário atual apareça em "Minhas receitas". */
export function ensureRecipeIsOwn(
  recipe: Recipe,
  user: { id: string; name: string }
): Recipe {
  return {
    ...recipe,
    isOwn: true,
    autor: recipe.autor?.trim() ? recipe.autor : user.name,
  };
}

export function getRecipeImageSource(recipe: Recipe): ImageSourcePropType {
  const fromField = recipe.imageUrl?.trim();
  if (fromField) {
    return { uri: fromField };
  }
  const im = recipe.imagem;
  if (im && typeof im === 'object' && im !== null && 'uri' in im) {
    const uri = String((im as { uri?: string }).uri ?? '').trim();
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return { uri };
    }
  }
  return recipe.imagem ?? DEFAULT_RECIPE_IMAGE;
}
