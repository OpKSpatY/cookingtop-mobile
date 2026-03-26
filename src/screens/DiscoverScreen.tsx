import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Search, ChefHat, ShoppingCart } from 'lucide-react-native';
import type { Recipe } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { useUserPantry } from '../contexts/UserPantryContext';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import { colors } from '../theme/colors';
import { STORAGE_KEYS } from '../config/storageKeys';
import {
  fetchRecipesPantryAvailabilityApi,
  mapPantryAvailabilityResponse,
} from '../services/recipesApi';

const categories = ['Todas', 'Pratos Principais', 'Sobremesas', 'Lanches'];

type AvailabilityTab = 'posso' | 'faltam';

function applySearchAndCategory(recipes: Recipe[], search: string, category: string): Recipe[] {
  let list = [...recipes];
  if (category !== 'Todas') {
    list = list.filter((r) => r.categoria === category);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        r.ingredientes.some((i) => i.nome.toLowerCase().includes(q)) ||
        r.categoria.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => b.rating - a.rating);
}

const DiscoverScreen = () => {
  const { accessToken, user } = useAuth();
  const { hasIngredientName, refresh: refreshPantry, items: pantryItems } = useUserPantry();
  const { recipes: apiRecipes, loading: recipesLoading } = useUserRecipes();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [availabilityTab, setAvailabilityTab] = useState<AvailabilityTab>('posso');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  /** Listas vindas do GET /recipes/pantry-availability (ou cache) */
  const [serverAvailability, setServerAvailability] = useState<{
    canMake: Recipe[];
    cannotMake: Recipe[];
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.PANTRY_AVAILABILITY_PAYLOAD);
        if (raw && !cancelled) {
          const data = JSON.parse(raw) as unknown;
          setServerAvailability(mapPantryAvailabilityResponse(data, user?.id ?? null));
        }
      } catch {
        /* ignore cache inválido */
      } finally {
        if (!cancelled) setCacheHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!accessToken) {
      setServerAvailability(null);
    }
  }, [accessToken]);

  const loadPantryAvailability = useCallback(async () => {
    if (!accessToken || !user) {
      setServerAvailability(null);
      return;
    }
    setAvailabilityLoading(true);
    try {
      const etag = await AsyncStorage.getItem(STORAGE_KEYS.PANTRY_AVAILABILITY_ETAG);
      const result = await fetchRecipesPantryAvailabilityApi(accessToken, user.id, etag);
      if (result.status === 'not_modified') {
        if (result.etag) {
          await AsyncStorage.setItem(STORAGE_KEYS.PANTRY_AVAILABILITY_ETAG, result.etag);
        }
        return;
      }
      setServerAvailability({
        canMake: result.canMake,
        cannotMake: result.cannotMake,
      });
      if (result.etag) {
        await AsyncStorage.setItem(STORAGE_KEYS.PANTRY_AVAILABILITY_ETAG, result.etag);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.PANTRY_AVAILABILITY_PAYLOAD, result.rawBodyText);
    } catch {
      /* mantém listas anteriores / cache */
    } finally {
      setAvailabilityLoading(false);
    }
  }, [accessToken, user]);

  useFocusEffect(
    useCallback(() => {
      void refreshPantry({ silent: true });
      void loadPantryAvailability();
    }, [refreshPantry, loadPantryAvailability])
  );

  const useServerLists = Boolean(accessToken && user && serverAvailability);

  const filtered = useMemo(() => {
    if (useServerLists && serverAvailability) {
      const can = applySearchAndCategory(serverAvailability.canMake, search, category);
      const cant = applySearchAndCategory(serverAvailability.cannotMake, search, category);
      return { canMakeList: can, cantMakeList: cant };
    }
    const base = applySearchAndCategory(apiRecipes, search, category);
    const canMakeList: Recipe[] = [];
    const cantMakeList: (Recipe & { owned: number; total: number })[] = [];
    for (const recipe of base) {
      const total = recipe.ingredientes.length;
      const owned = recipe.ingredientes.filter((ing) => hasIngredientName(ing.nome)).length;
      const canMake = owned === total;
      if (canMake) {
        canMakeList.push(recipe);
      } else {
        cantMakeList.push({ ...recipe, owned, total });
      }
    }
    cantMakeList.sort((a, b) => {
      const missingA = a.total - a.owned;
      const missingB = b.total - b.owned;
      if (missingA !== missingB) return missingA - missingB;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    return { canMakeList, cantMakeList };
  }, [
    useServerLists,
    serverAvailability,
    apiRecipes,
    search,
    category,
    hasIngredientName,
    pantryItems,
  ]);

  const { canMakeList, cantMakeList } = filtered;

  const canMakeRecipe = (recipe: Recipe): { canMake: boolean; owned: number; total: number } => {
    const total = recipe.ingredientes.length;
    const owned = recipe.ingredientes.filter((ing) => hasIngredientName(ing.nome)).length;
    return { canMake: owned === total, owned, total };
  };

  const showAvailabilitySpinner =
    accessToken &&
    user &&
    !serverAvailability &&
    (availabilityLoading || !cacheHydrated);

  const showRecipesSpinner = !accessToken && recipesLoading;

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  const activeList = availabilityTab === 'posso' ? canMakeList : cantMakeList;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Descubra</Text>
        <Text style={styles.subtitle}>Explore receitas da comunidade</Text>
        {(showAvailabilitySpinner || showRecipesSpinner) && (
          <View style={styles.syncRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.syncText}>
              {showAvailabilitySpinner ? 'Sincronizando disponibilidade…' : 'Carregando receitas…'}
            </Text>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar receitas, ingredientes..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.catBtn, category === cat && styles.catBtnActive]}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setAvailabilityTab('posso')}
            style={[styles.tab, availabilityTab === 'posso' && styles.tabActive]}
          >
            <ChefHat size={14} color={availabilityTab === 'posso' ? '#fff' : colors.secondaryForeground} />
            <Text style={[styles.tabText, availabilityTab === 'posso' && styles.tabTextActive]}>Posso fazer</Text>
            <View style={[styles.tabBadge, availabilityTab === 'posso' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, availabilityTab === 'posso' && styles.tabBadgeTextActive]}>
                {canMakeList.length}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAvailabilityTab('faltam')}
            style={[styles.tab, availabilityTab === 'faltam' && styles.tabActiveFaltam]}
          >
            <ShoppingCart size={14} color={availabilityTab === 'faltam' ? '#fff' : colors.secondaryForeground} />
            <Text style={[styles.tabText, availabilityTab === 'faltam' && styles.tabTextActive]}>Faltam</Text>
            <View style={[styles.tabBadge, availabilityTab === 'faltam' && styles.tabBadgeActiveFaltam]}>
              <Text style={[styles.tabBadgeText, availabilityTab === 'faltam' && styles.tabBadgeTextActive]}>
                {cantMakeList.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.results}>
        {activeList.length === 0 ? (
          <View style={styles.emptyState}>
            {availabilityTab === 'posso' ? (
              <>
                <ChefHat size={40} color={colors.mutedForeground + '66'} />
                <Text style={styles.emptyTitle}>Nenhuma receita disponível</Text>
                <Text style={styles.emptySubtitle}>Adicione mais ingredientes à sua despensa</Text>
              </>
            ) : (
              <>
                <ShoppingCart size={40} color={colors.mutedForeground + '66'} />
                <Text style={styles.emptyTitle}>Você tem tudo que precisa!</Text>
                <Text style={styles.emptySubtitle}>Todas as receitas podem ser feitas com sua despensa</Text>
              </>
            )}
          </View>
        ) : (
          activeList.map((recipe) => {
            const info = availabilityTab === 'faltam' ? canMakeRecipe(recipe) : null;
            return (
              <View key={recipe.id} style={styles.cardWrapper}>
                <RecipeCard recipe={recipe} variant="horizontal" onPress={() => setSelectedRecipe(recipe)} />
                {info && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>{info.owned}/{info.total}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  syncText: { fontSize: 12, color: colors.mutedForeground },
  searchContainer: { marginTop: 16, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingLeft: 40, paddingRight: 16, fontSize: 14, color: colors.foreground,
  },
  catScroll: { marginTop: 12 },
  catContainer: { gap: 8 },
  catBtn: { backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  catBtnActive: { backgroundColor: colors.primary },
  catText: { fontSize: 12, fontWeight: '600', color: colors.secondaryForeground },
  catTextActive: { color: colors.primaryForeground },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 12,
    padding: 4, marginTop: 12,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  tabActive: { backgroundColor: colors.success, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabActiveFaltam: { backgroundColor: colors.warning, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.secondaryForeground },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: colors.secondaryForeground + '1A', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tabBadgeActive: { backgroundColor: 'rgba(0,0,0,0.15)' },
  tabBadgeActiveFaltam: { backgroundColor: 'rgba(0,0,0,0.15)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondaryForeground },
  tabBadgeTextActive: { color: '#fff' },
  results: { paddingHorizontal: 16, marginTop: 16, gap: 12, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground },
  emptySubtitle: { fontSize: 12, color: colors.mutedForeground },
  cardWrapper: { position: 'relative' },
  infoBadge: {
    position: 'absolute', right: 12, top: 12,
    backgroundColor: colors.warningLight, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  infoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warningDark },
});

export default DiscoverScreen;
