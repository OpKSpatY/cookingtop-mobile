import React, { useState, useMemo } from 'react';
import {
  View, Text, Image, TextInput, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { mockRecipes } from '../data/mockData';
import type { Recipe } from '../data/mockData';
import RecipeCarousel from '../components/RecipeCarousel';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import UserMenu from '../components/UserMenu';
import ProfileScreen from './ProfileScreen';
import SettingsScreen from './SettingsScreen';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type View_ =
  | { type: 'home' }
  | { type: 'recipe'; recipe: Recipe }
  | { type: 'profile' }
  | { type: 'settings' };

const DashboardScreen = () => {
  const [view, setView] = useState<View_>({ type: 'home' });
  const [search, setSearch] = useState('');
  const selectedRecipe = view.type === 'recipe' ? view.recipe : null;

  const popular = [...mockRecipes].sort((a, b) => b.totalRatings - a.totalRatings);
  const quick = [...mockRecipes].sort((a, b) => parseInt(a.tempoPreparo) - parseInt(b.tempoPreparo));
  const topRated = [...mockRecipes].sort((a, b) => b.rating - a.rating);

  const isSearching = search.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase();
    return mockRecipes.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        r.ingredientes.some((i) => i.nome.toLowerCase().includes(q)) ||
        r.categoria.toLowerCase().includes(q) ||
        r.autor.toLowerCase().includes(q)
    );
  }, [search, isSearching]);

  const setSelectedRecipe = (recipe: Recipe | null) => {
    if (recipe) setView({ type: 'recipe', recipe });
    else setView({ type: 'home' });
  };

  if (view.type === 'profile') {
    return <ProfileScreen onBack={() => setView({ type: 'home' })} />;
  }
  if (view.type === 'settings') {
    return <SettingsScreen onBack={() => setView({ type: 'home' })} />;
  }
  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <UserMenu
          onRecipeClick={(recipe) => setView({ type: 'recipe', recipe })}
          onProfileClick={() => setView({ type: 'profile' })}
          onSettingsClick={() => setView({ type: 'settings' })}
        />
      </View>

      <View style={styles.heroBanner}>
        <Image source={require('../assets/hero-food.jpg')} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroText}>O que vamos{'\n'}cozinhar hoje?</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar receitas por nome, ingrediente..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {isSearching ? (
        <View style={styles.searchResults}>
          <Text style={styles.resultCount}>
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{search}"
          </Text>
          {searchResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={40} color={colors.mutedForeground + '66'} />
              <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
            </View>
          ) : (
            searchResults.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                variant="horizontal"
                onPress={() => setSelectedRecipe(recipe)}
              />
            ))
          )}
        </View>
      ) : (
        <>
          <RecipeCarousel title="🔥 Mais Procuradas" recipes={popular} onRecipePress={setSelectedRecipe} />
          <RecipeCarousel title="⭐ Melhor Avaliadas" recipes={topRated} onRecipePress={setSelectedRecipe} />
          <RecipeCarousel title="⚡ Receitas Rápidas" recipes={quick} onRecipePress={setSelectedRecipe} />
          <View style={{ height: 24 }} />
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  logo: { height: 120, width: 300 },
  heroBanner: { marginHorizontal: 16, marginTop: -4, borderRadius: 16, overflow: 'hidden', height: 176 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroTextContainer: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroText: { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 28 },
  searchContainer: { marginHorizontal: 16, marginTop: 16, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingLeft: 40, paddingRight: 16, fontSize: 14, color: colors.foreground,
  },
  searchResults: { paddingHorizontal: 16, marginTop: 16, gap: 12 },
  resultCount: { fontSize: 14, color: colors.mutedForeground },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground },
});

export default DashboardScreen;
