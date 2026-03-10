import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Plus, X, BookOpen, Heart, Globe, Lock } from 'lucide-react-native';
import type { Recipe } from '../data/mockData';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import { useFavorites } from '../contexts/FavoritesContext';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import { colors } from '../theme/colors';

const MAX_RECIPES = 10;
type Tab = 'minhas' | 'favoritas';

const MyRecipesScreen = () => {
  const { recipes, addRecipe } = useUserRecipes();
  const { favorites, toggleFavorite } = useFavorites();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('minhas');
  const [form, setForm] = useState({
    nome: '',
    tempoPreparo: '',
    categoria: 'Pratos Principais',
    ingredientes: [{ nome: '', quantidade: '' }],
    modoPreparo: [''],
    publica: true,
  });

  const addIngredient = () => {
    setForm({ ...form, ingredientes: [...form.ingredientes, { nome: '', quantidade: '' }] });
  };

  const addStep = () => {
    setForm({ ...form, modoPreparo: [...form.modoPreparo, ''] });
  };

  const handleSave = () => {
    if (!form.nome.trim()) {
      Alert.alert('Erro', 'Informe o nome da receita');
      return;
    }
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      nome: form.nome,
      imagem: require('../assets/recipe-strogonoff.jpg'),
      rating: 0,
      totalRatings: 0,
      tempoPreparo: form.tempoPreparo || '30 min',
      categoria: form.categoria,
      autor: 'Você',
      porcoes: 4,
      ingredientes: form.ingredientes.filter((i) => i.nome.trim()),
      modoPreparo: form.modoPreparo.filter((s) => s.trim()),
      publica: form.publica,
      isOwn: true,
    };
    addRecipe(newRecipe);
    setForm({ nome: '', tempoPreparo: '', categoria: 'Pratos Principais', ingredientes: [{ nome: '', quantidade: '' }], modoPreparo: [''], publica: true });
    setShowForm(false);
  };

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  if (showForm) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Nova Receita</Text>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <X size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          <View>
            <Text style={styles.label}>Nome da receita</Text>
            <TextInput
              value={form.nome}
              onChangeText={(t) => setForm({ ...form, nome: t })}
              style={styles.input}
              placeholder="Ex: Bolo de cenoura"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tempo de preparo</Text>
              <TextInput
                value={form.tempoPreparo}
                onChangeText={(t) => setForm({ ...form, tempoPreparo: t })}
                style={styles.input}
                placeholder="Ex: 45 min"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Ingredientes</Text>
            {form.ingredientes.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <TextInput
                  value={ing.nome}
                  onChangeText={(t) => {
                    const updated = [...form.ingredientes];
                    updated[i] = { ...updated[i], nome: t };
                    setForm({ ...form, ingredientes: updated });
                  }}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ingrediente"
                  placeholderTextColor={colors.mutedForeground}
                />
                <TextInput
                  value={ing.quantidade}
                  onChangeText={(t) => {
                    const updated = [...form.ingredientes];
                    updated[i] = { ...updated[i], quantidade: t };
                    setForm({ ...form, ingredientes: updated });
                  }}
                  style={[styles.input, { width: 96 }]}
                  placeholder="Qtd."
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <TouchableOpacity onPress={addIngredient}>
              <Text style={styles.addLink}>+ Adicionar ingrediente</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={styles.label}>Modo de preparo</Text>
            {form.modoPreparo.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <TextInput
                  value={step}
                  onChangeText={(t) => {
                    const updated = [...form.modoPreparo];
                    updated[i] = t;
                    setForm({ ...form, modoPreparo: updated });
                  }}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Descreva o passo..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
              </View>
            ))}
            <TouchableOpacity onPress={addStep}>
              <Text style={styles.addLink}>+ Adicionar passo</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={styles.label}>Visibilidade</Text>
            <View style={styles.visRow}>
              <TouchableOpacity
                onPress={() => setForm({ ...form, publica: true })}
                style={[styles.visBtn, form.publica && styles.visBtnActive]}
              >
                <Globe size={16} color={form.publica ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.visBtnText, form.publica && styles.visBtnTextActive]}>Pública</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm({ ...form, publica: false })}
                style={[styles.visBtn, !form.publica && styles.visBtnActive]}
              >
                <Lock size={16} color={!form.publica ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.visBtnText, !form.publica && styles.visBtnTextActive]}>Privada</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Receita</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Minhas Receitas</Text>
        <Text style={styles.subtitle}>Suas criações e favoritas</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('minhas')}
          style={[styles.tab, activeTab === 'minhas' && styles.tabActive]}
        >
          <BookOpen size={14} color={activeTab === 'minhas' ? '#fff' : colors.secondaryForeground} />
          <Text style={[styles.tabText, activeTab === 'minhas' && styles.tabTextActive]}>Criadas</Text>
          <View style={[styles.tabBadge, activeTab === 'minhas' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'minhas' && styles.tabBadgeTextActive]}>
              {recipes.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('favoritas')}
          style={[styles.tab, activeTab === 'favoritas' && styles.tabActive]}
        >
          <Heart size={14} color={activeTab === 'favoritas' ? '#fff' : colors.secondaryForeground} />
          <Text style={[styles.tabText, activeTab === 'favoritas' && styles.tabTextActive]}>Favoritas</Text>
          <View style={[styles.tabBadge, activeTab === 'favoritas' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'favoritas' && styles.tabBadgeTextActive]}>
              {favorites.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'minhas' ? (
        <View style={styles.content}>
          {recipes.length < MAX_RECIPES && (
            <View style={styles.addRow}>
              <Text style={styles.countText}>{recipes.length}/{MAX_RECIPES} receitas</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addBtnText}>Nova</Text>
              </TouchableOpacity>
            </View>
          )}
          {recipes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <BookOpen size={28} color={colors.secondaryForeground} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma receita ainda</Text>
              <Text style={styles.emptySubtitle}>Crie sua primeira receita e comece a organizar seus pratos favoritos</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.createBtnText}>Criar Receita</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recipeList}>
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} variant="horizontal" onPress={() => setSelectedRecipe(recipe)} />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {favorites.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Heart size={28} color={colors.secondaryForeground} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma receita favorita</Text>
              <Text style={styles.emptySubtitle}>Favorite receitas na aba Descubra para encontrá-las aqui</Text>
            </View>
          ) : (
            <View style={styles.recipeList}>
              {favorites.map((recipe) => (
                <View key={recipe.id} style={{ position: 'relative' }}>
                  <RecipeCard recipe={recipe} variant="horizontal" onPress={() => setSelectedRecipe(recipe)} />
                  <TouchableOpacity
                    onPress={() => toggleFavorite(recipe)}
                    style={styles.removeFav}
                  >
                    <Heart size={14} color={colors.destructive} fill={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSection: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.secondary, borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  tabActive: { backgroundColor: colors.primary, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.secondaryForeground },
  tabTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: colors.secondaryForeground + '1A', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondaryForeground },
  tabBadgeTextActive: { color: '#fff' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  countText: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 },
  createBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  recipeList: { gap: 12 },
  removeFav: {
    position: 'absolute', right: 12, top: 12,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  formBody: { paddingHorizontal: 16, marginTop: 16, gap: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.foreground,
  },
  ingredientRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  stepCircle: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  stepNum: { fontSize: 10, fontWeight: '700', color: '#fff' },
  addLink: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 4 },
  rowGap: { flexDirection: 'row', gap: 12 },
  visRow: { flexDirection: 'row', gap: 8 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 10,
  },
  visBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  visBtnText: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground },
  visBtnTextActive: { color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default MyRecipesScreen;
