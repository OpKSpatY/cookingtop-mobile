import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus,
  X,
  BookOpen,
  Heart,
  Globe,
  Lock,
  GripVertical,
  Trash2,
  ImageIcon,
} from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { Recipe } from '../data/mockData';
import type { RecipeDifficultyApi, PatchRecipeRequest, RecipeIngredientInput } from '../types/recipes';
import RecipeIngredientsEditor, {
  type RecipeFormIngredientRow,
} from '../components/RecipeIngredientsEditor';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useToast } from '../contexts/ToastContext';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import { DEFAULT_RECIPE_IMAGE } from '../utils/recipeUi';
import { AuthApiError } from '../services/authApi';
import { colors } from '../theme/colors';

const MAX_RECIPES = 50;
const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DIFFICULTIES: { value: RecipeDifficultyApi; label: string }[] = [
  { value: 'FACIL', label: 'Fácil' },
  { value: 'MEDIO', label: 'Médio' },
  { value: 'DIFICIL', label: 'Difícil' },
];

type Tab = 'minhas' | 'favoritas';

type RecipePrepStepForm = { id: string; text: string };

function genStepId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Tenta extrair um número inicial de textos legados (ex.: listas antigas só com string). */
function tryParseAmountFromDisplay(q: string): string {
  const m = q.trim().match(/^-?\d+([.,]\d+)?/);
  return m ? m[0].replace(',', '.') : '';
}

function parseAmountInput(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Monta o payload da API; retorna `'invalid'` se houver ingrediente selecionado sem quantidade numérica válida.
 */
function validateAndBuildIngredients(
  rows: RecipeFormIngredientRow[]
): RecipeIngredientInput[] | 'invalid' {
  const out: RecipeIngredientInput[] = [];
  for (const r of rows) {
    if (!r.ingredientId.trim()) continue;
    const n = parseAmountInput(r.amount);
    if (n === null) return 'invalid';
    const note = r.note.trim();
    out.push({
      ingredientId: r.ingredientId.trim(),
      amount: n,
      note: note ? note.slice(0, 500) : null,
    });
  }
  return out;
}

function mapRecipeToForm(r: Recipe) {
  const recipeIngredients: RecipeFormIngredientRow[] = (r.ingredientes ?? [])
    .map((ing) => ({
      ingredientId: ing.ingredientId ?? '',
      name: ing.nome,
      amount:
        ing.amount != null && Number.isFinite(ing.amount)
          ? String(ing.amount)
          : ing.quantidade === '—'
            ? ''
            : tryParseAmountFromDisplay(ing.quantidade),
      note: ing.note ?? '',
    }))
    .filter((row) => row.ingredientId || row.name);

  const prepSteps: RecipePrepStepForm[] =
    r.modoPreparo.length > 0
      ? r.modoPreparo.map((text) => ({ id: genStepId(), text }))
      : [{ id: genStepId(), text: '' }];

  return {
    nome: r.nome,
    description: (r.description ?? r.observacoes ?? '').trim(),
    prepTime: String(r.prepTimeMinutes ?? 30),
    servings: String(r.porcoes ?? 4),
    difficulty: (r.difficulty as RecipeDifficultyApi) || 'FACIL',
    prepSteps,
    publica: r.publica !== false,
    recipeIngredients,
  };
}

const MyRecipesScreen = () => {
  const {
    myRecipes,
    loading,
    createRecipe,
    updateRecipe,
    fetchRecipeById,
    refresh: refreshRecipes,
  } = useUserRecipes();

  const handleRecipeDeleted = useCallback(async () => {
    await refreshRecipes({ silent: true });
  }, [refreshRecipes]);
  const { favorites, toggleFavorite, removeFavoriteByRecipeId } = useFavorites();
  const { showSuccess, showError } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('minhas');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [coverRemoteUrl, setCoverRemoteUrl] = useState<string | null>(null);
  const [localCoverAsset, setLocalCoverAsset] = useState<{
    uri: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    nome: '',
    description: '',
    prepTime: '45',
    servings: '4',
    difficulty: 'FACIL' as RecipeDifficultyApi,
    prepSteps: [{ id: genStepId(), text: '' }] as RecipePrepStepForm[],
    publica: true,
    recipeIngredients: [] as RecipeFormIngredientRow[],
  });

  const isTabFocused = useIsFocused();
  const selectedRecipeRef = useRef(selectedRecipe);
  selectedRecipeRef.current = selectedRecipe;

  useFocusEffect(
    useCallback(() => {
      const id = selectedRecipeRef.current?.id;
      if (!id) return undefined;
      let cancelled = false;
      void (async () => {
        try {
          const fresh = await fetchRecipeById(id);
          if (cancelled) return;
          setSelectedRecipe((prev) => (prev?.id === id ? fresh : prev));
        } catch (e) {
          if (cancelled) return;
          if (e instanceof AuthApiError && e.statusCode === 404) {
            removeFavoriteByRecipeId(id);
            setSelectedRecipe((prev) => (prev?.id === id ? null : prev));
            void refreshRecipes({ silent: true });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [fetchRecipeById, refreshRecipes, removeFavoriteByRecipeId])
  );

  const resetForm = useCallback(() => {
    setForm({
      nome: '',
      description: '',
      prepTime: '45',
      servings: '4',
      difficulty: 'FACIL',
      prepSteps: [{ id: genStepId(), text: '' }],
      publica: true,
      recipeIngredients: [],
    });
    setEditingId(null);
    setCoverRemoteUrl(null);
    setLocalCoverAsset(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedRecipe) return false;
        if (showForm) {
          setShowForm(false);
          resetForm();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [showForm, selectedRecipe, resetForm])
  );

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = useCallback(
    async (r: Recipe) => {
      setEditingId(r.id);
      setShowForm(true);
      setLocalCoverAsset(null);
      setCoverRemoteUrl(r.imageUrl ?? null);
      try {
        const full = await fetchRecipeById(r.id);
        setForm(mapRecipeToForm(full));
        setCoverRemoteUrl(full.imageUrl ?? null);
      } catch {
        setForm(mapRecipeToForm(r));
      }
    },
    [fetchRecipeById]
  );

  const pickRecipeCover = async () => {
    if (editingId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showError('Precisamos de acesso à galeria para escolher a foto.', 'Permissão');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.88,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > MAX_COVER_IMAGE_BYTES) {
      showError('A imagem deve ter no máximo 5 MB.', 'Validação');
      return;
    }
    const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();
    if (!ALLOWED_COVER_MIME.has(mimeType)) {
      showError('Use uma imagem JPEG, PNG ou WebP.', 'Validação');
      return;
    }
    const ext =
      mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const name =
      asset.fileName?.trim() ||
      `receita.${ext}`;
    setLocalCoverAsset({ uri: asset.uri, mimeType, name });
  };

  const clearPickedCover = () => {
    setLocalCoverAsset(null);
  };

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refreshRecipes({ silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshRecipes]);

  const insertStepAfter = (index: number) => {
    setForm((f) => {
      const next = [...f.prepSteps];
      next.splice(index + 1, 0, { id: genStepId(), text: '' });
      return { ...f, prepSteps: next };
    });
  };

  const removeStep = (index: number) => {
    setForm((f) => {
      if (f.prepSteps.length <= 1) return f;
      const next = f.prepSteps.filter((_, i) => i !== index);
      return { ...f, prepSteps: next.length ? next : [{ id: genStepId(), text: '' }] };
    });
  };

  const updateStepText = (id: string, text: string) => {
    setForm((f) => ({
      ...f,
      prepSteps: f.prepSteps.map((s) => (s.id === id ? { ...s, text } : s)),
    }));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      showError('Informe o título da receita.', 'Validação');
      return;
    }
    const steps = form.prepSteps.map((s) => s.text.trim()).filter(Boolean);
    if (steps.length === 0) {
      showError('Adicione pelo menos um passo no modo de preparo.', 'Validação');
      return;
    }
    const prep = Math.max(1, parseInt(form.prepTime, 10) || 30);
    const serv = Math.max(1, parseInt(form.servings, 10) || 1);
    const ingredientsPayload = validateAndBuildIngredients(form.recipeIngredients);
    if (ingredientsPayload === 'invalid') {
      showError(
        'Para cada ingrediente adicionado, informe uma quantidade numérica válida (ex.: 200 ou 0,5).',
        'Validação'
      );
      return;
    }

    setSaving(true);
    try {
      const payloadSteps = steps.map((description) => ({ description }));

      if (editingId) {
        const patch: PatchRecipeRequest = {
          title: form.nome.trim(),
          description: form.description.trim() || null,
          difficulty: form.difficulty,
          prepTime: prep,
          servings: serv,
          isPrivate: !form.publica,
          steps: payloadSteps,
          ingredients: ingredientsPayload,
        };
        await updateRecipe(editingId, patch);
        showSuccess('Receita atualizada.');
      } else {
        const createBody = {
          title: form.nome.trim(),
          description: form.description.trim() || null,
          imageUrl: null as string | null,
          difficulty: form.difficulty,
          prepTime: prep,
          servings: serv,
          isPrivate: !form.publica,
          steps: payloadSteps,
          ...(ingredientsPayload.length > 0 ? { ingredients: ingredientsPayload } : {}),
        };
        await createRecipe(
          createBody,
          localCoverAsset ? { localImage: localCoverAsset } : undefined
        );
        showSuccess('Receita criada.');
      }
      setShowForm(false);
      resetForm();
    } catch (e) {
      const msg = e instanceof AuthApiError ? e.message : 'Não foi possível salvar a receita.';
      showError(msg, 'Erro');
    } finally {
      setSaving(false);
    }
  };

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        isTabFocused={isTabFocused}
        onBack={() => setSelectedRecipe(null)}
        onRecipeDeleted={handleRecipeDeleted}
        onEditRecipe={
          selectedRecipe.isOwn ? () => {
            const r = selectedRecipe;
            setSelectedRecipe(null);
            void openEditForm(r);
          } : undefined
        }
      />
    );
  }

  if (showForm) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          enableOnAndroid
          enableAutomaticScroll
          viewIsInsideTabBar
          extraScrollHeight={28}
          extraHeight={Platform.OS === 'android' ? 96 : 72}
          nestedScrollEnabled
        >
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{editingId ? 'Editar receita' : 'Nova receita'}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={saving}
            >
              <X size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.formBody}>
            <Text style={styles.label}>Foto da receita</Text>
            <View style={styles.imageRow}>
              <Image
                source={
                  localCoverAsset
                    ? { uri: localCoverAsset.uri }
                    : coverRemoteUrl
                      ? { uri: coverRemoteUrl }
                      : DEFAULT_RECIPE_IMAGE
                }
                style={styles.previewImg}
              />
              <View style={{ flex: 1, gap: 8 }}>
                {!editingId ? (
                  <>
                    <TouchableOpacity
                      style={styles.pickBtn}
                      onPress={pickRecipeCover}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel="Adicionar foto da receita"
                    >
                      <ImageIcon size={16} color={colors.primary} />
                      <Text style={styles.pickBtnText}>Escolher da galeria</Text>
                    </TouchableOpacity>
                    {localCoverAsset ? (
                      <TouchableOpacity onPress={clearPickedCover} disabled={saving}>
                        <Text style={styles.addLink}>Remover foto escolhida</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.hint}>
                    A troca da capa na edição ainda não está disponível; a pré-visualização mostra a imagem atual da
                    receita.
                  </Text>
                )}
              </View>
            </View>
            {!editingId ? (
              <Text style={styles.hint}>
                JPEG, PNG ou WebP, até 5 MB. Opcional — sem foto, a receita usa a imagem padrão até você publicar com
                capa.
              </Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 12 }]}>Título *</Text>
            <TextInput
              value={form.nome}
              onChangeText={(t) => setForm({ ...form, nome: t })}
              style={styles.input}
              placeholder="Ex: Bolo de cenoura"
              placeholderTextColor={colors.mutedForeground}
              editable={!saving}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Descrição (opcional)</Text>
            <TextInput
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
              placeholder="Resumo da receita"
              placeholderTextColor={colors.mutedForeground}
              multiline
              editable={!saving}
            />

            <RecipeIngredientsEditor
              rows={form.recipeIngredients}
              onChange={(recipeIngredients) =>
                setForm((f) => ({ ...f, recipeIngredients }))
              }
              disabled={saving}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Dificuldade *</Text>
            <View style={styles.diffRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.diffChip, form.difficulty === d.value && styles.diffChipActive]}
                  onPress={() => setForm({ ...form, difficulty: d.value })}
                  disabled={saving}
                >
                  <Text style={[styles.diffChipText, form.difficulty === d.value && styles.diffChipTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tempo de preparo (min) *</Text>
                <TextInput
                  value={form.prepTime}
                  onChangeText={(t) => setForm({ ...form, prepTime: t.replace(/[^0-9]/g, '') })}
                  style={styles.input}
                  placeholder="45"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Porções *</Text>
                <TextInput
                  value={form.servings}
                  onChangeText={(t) => setForm({ ...form, servings: t.replace(/[^0-9]/g, '') })}
                  style={styles.input}
                  placeholder="8"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Modo de preparo (ordem importa)</Text>
            <Text style={styles.hint}>
              Segure o ícone ⋮⋮ ao lado do passo e arraste para reordenar. Use os botões para inserir ou remover etapas. Ao
              salvar, a ordem atual é enviada à API em steps.
            </Text>
            <DraggableFlatList
              data={form.prepSteps}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              nestedScrollEnabled
              activationDistance={14}
              containerStyle={styles.draggableStepsList}
              onDragEnd={({ data }) => setForm((f) => ({ ...f, prepSteps: data }))}
              renderItem={({ item, getIndex, drag, isActive }) => {
                const i = getIndex() ?? 0;
                return (
                  <ScaleDecorator>
                    <View style={[styles.stepBlock, isActive && styles.stepBlockActive]}>
                      <View style={styles.stepToolbar}>
                        <TouchableOpacity
                          onLongPress={drag}
                          delayLongPress={120}
                          disabled={saving}
                          style={styles.dragHandle}
                          accessibilityLabel="Arrastar para reordenar passo"
                        >
                          <GripVertical size={22} color={colors.mutedForeground} />
                        </TouchableOpacity>
                        <Text style={styles.stepIndex}>Passo {i + 1}</Text>
                        <View style={styles.stepTools}>
                          <TouchableOpacity onPress={() => insertStepAfter(i)} disabled={saving}>
                            <Plus size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeStep(i)}
                            disabled={saving || form.prepSteps.length <= 1}
                          >
                            <Trash2
                              size={18}
                              color={form.prepSteps.length <= 1 ? colors.border : colors.destructive}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        value={item.text}
                        onChangeText={(t) => updateStepText(item.id, t)}
                        style={[styles.input, { minHeight: 64 }]}
                        placeholder="Descreva o passo..."
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        editable={!saving}
                      />
                      <TouchableOpacity onPress={() => insertStepAfter(i)} disabled={saving}>
                        <Text style={styles.addLink}>+ Inserir passo abaixo</Text>
                      </TouchableOpacity>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />
            <TouchableOpacity
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  prepSteps: [...f.prepSteps, { id: genStepId(), text: '' }],
                }))
              }
              disabled={saving}
            >
              <Text style={styles.addLink}>+ Adicionar passo ao final</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 16 }]}>Visibilidade</Text>
            <View style={styles.visRow}>
              <TouchableOpacity
                onPress={() => setForm({ ...form, publica: true })}
                style={[styles.visBtn, form.publica && styles.visBtnActive]}
                disabled={saving}
              >
                <Globe size={16} color={form.publica ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.visBtnText, form.publica && styles.visBtnTextActive]}>Pública</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm({ ...form, publica: false })}
                style={[styles.visBtn, !form.publica && styles.visBtnActive]}
                disabled={saving}
              >
                <Lock size={16} color={!form.publica ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.visBtnText, !form.publica && styles.visBtnTextActive]}>Privada</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (saving || loading) && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving || loading}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onPullRefresh}
            tintColor={colors.primary}
            colors={Platform.OS === 'android' ? [colors.primary] : undefined}
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Minhas Receitas</Text>
          <Text style={styles.subtitle}>Suas criações e favoritas</Text>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => { setActiveTab('minhas'); }}
            style={[styles.tab, activeTab === 'minhas' && styles.tabActive]}
          >
            <BookOpen size={14} color={activeTab === 'minhas' ? '#fff' : colors.secondaryForeground} />
            <Text style={[styles.tabText, activeTab === 'minhas' && styles.tabTextActive]}>Criadas</Text>
            <View style={[styles.tabBadge, activeTab === 'minhas' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'minhas' && styles.tabBadgeTextActive]}>
                {myRecipes.length}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setActiveTab('favoritas'); }}
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
            {loading && (
              <View style={styles.loadingBar}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Sincronizando receitas…</Text>
              </View>
            )}
            {myRecipes.length < MAX_RECIPES && (
              <View style={styles.addRow}>
                <Text style={styles.countText}>{myRecipes.length}/{MAX_RECIPES} receitas</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openCreateForm}>
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Nova</Text>
                </TouchableOpacity>
              </View>
            )}
            {myRecipes.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <BookOpen size={28} color={colors.secondaryForeground} />
                </View>
                <Text style={styles.emptyTitle}>Nenhuma receita ainda</Text>
                <Text style={styles.emptySubtitle}>
                  Crie sua primeira receita na API — com passos, dificuldade e foto opcional.
                </Text>
                <TouchableOpacity style={styles.createBtn} onPress={openCreateForm}>
                  <Text style={styles.createBtnText}>Criar receita</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recipeList}>
                {myRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    variant="horizontal"
                    onPress={() => setSelectedRecipe(recipe)}
                  />
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
                    <RecipeCard
                      recipe={recipe}
                      variant="horizontal"
                      onPress={() => setSelectedRecipe(recipe)}
                    />
                    <TouchableOpacity onPress={() => toggleFavorite(recipe)} style={styles.removeFav}>
                      <Heart size={14} color={colors.destructive} fill={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  /** Espaço extra no fim do scroll para o teclado não sobrepor descrição, ingredientes e passos */
  formScrollContent: { flexGrow: 1, paddingBottom: 48 },
  draggableStepsList: { width: '100%' },
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
  loadingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
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
  formBody: { paddingHorizontal: 16, marginTop: 16, gap: 8, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  hint: { fontSize: 11, color: colors.mutedForeground, lineHeight: 16, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.foreground,
  },
  imageRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  previewImg: { width: 120, height: 80, borderRadius: 10, backgroundColor: colors.secondary },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
  },
  pickBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  diffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diffChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  diffChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  diffChipText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  diffChipTextActive: { color: colors.primary },
  rowGap: { flexDirection: 'row', gap: 12 },
  stepBlock: { marginBottom: 8 },
  stepBlockActive: { opacity: 0.95 },
  stepToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  dragHandle: { paddingVertical: 4, paddingRight: 4 },
  stepIndex: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.mutedForeground },
  stepTools: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addLink: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 4 },
  visRow: { flexDirection: 'row', gap: 8 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 10,
  },
  visBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  visBtnText: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground },
  visBtnTextActive: { color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default MyRecipesScreen;
