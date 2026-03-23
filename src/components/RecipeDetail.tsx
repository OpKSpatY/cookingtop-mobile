import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock,
  Check,
  X,
  Flame,
  Users,
  Minus,
  Plus,
  Heart,
  Flag,
  AlertTriangle,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import StarRating from './StarRating';
import type { Recipe } from '../data/mockData';
import { getNutritionalInfo, estimateRecipeKcal } from '../data/nutritionalData';
import { useFavorites } from '../contexts/FavoritesContext';
import { useUserPantry } from '../contexts/UserPantryContext';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import { useToast } from '../contexts/ToastContext';
import { AuthApiError } from '../services/authApi';
import { getRecipeImageSource, difficultyToLabel } from '../utils/recipeUi';
import { colors } from '../theme/colors';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  /** Se definido, exibe botão Editar (receitas próprias) */
  onEditRecipe?: (recipe: Recipe) => void;
}

function scaleQuantity(quantidade: string, factor: number): string {
  const match = quantidade.match(/^([\d.,/]+)\s*(.*)/);
  if (!match) return quantidade;
  let num: number;
  const raw = match[1];
  if (raw.includes('/')) {
    const [a, b] = raw.split('/').map(Number);
    num = a / b;
  } else {
    num = parseFloat(raw.replace(',', '.'));
  }
  if (isNaN(num)) return quantidade;
  const scaled = num * factor;
  const unit = match[2];
  const formatted = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1).replace('.', ',');
  return `${formatted} ${unit}`.trim();
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RecipeDetail = ({ recipe, onBack, onEditRecipe }: RecipeDetailProps) => {
  const insets = useSafeAreaInsets();
  const { getQuantityForName } = useUserPantry();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { fetchRecipeById, deleteRecipe } = useUserRecipes();
  const { showError } = useToast();
  const [detail, setDetail] = useState<Recipe>(recipe);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const favorited = isFavorite(detail.id);
  const [servings, setServings] = useState(detail.porcoes);
  const [showReportRecipe, setShowReportRecipe] = useState(false);
  const [reportRecipeReason, setReportRecipeReason] = useState('');
  const [reportRecipeSent, setReportRecipeSent] = useState(false);
  const scaleFactor = servings / detail.porcoes;

  useEffect(() => {
    setDetail(recipe);
    setServings(recipe.porcoes);
  }, [recipe]);

  useEffect(() => {
    let cancelled = false;
    setLoadingDetail(true);
    void (async () => {
      try {
        const full = await fetchRecipeById(recipe.id);
        if (!cancelled) {
          setDetail(full);
          setServings(full.porcoes);
        }
      } catch {
        /* mantém dados da lista */
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipe.id, fetchRecipeById]);

  const handleDeleteOwn = useCallback(() => {
    Alert.alert(
      'Excluir receita',
      `Remover "${detail.nome}" permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteRecipe(detail.id);
                onBack();
              } catch (e) {
                const msg =
                  e instanceof AuthApiError
                    ? e.message
                    : 'Não foi possível excluir a receita.';
                showError(msg, 'Erro');
              }
            })();
          },
        },
      ]
    );
  }, [detail.id, detail.nome, deleteRecipe, onBack, showError]);

  const ingredientStatus = detail.ingredientes.map((ing) => {
    const pantryQty = getQuantityForName(ing.nome);
    const status = {
      found: pantryQty != null && pantryQty !== '',
      pantryQuantidade: pantryQty,
    };
    const nutri = getNutritionalInfo(ing.nome);
    const scaledQuantidade = scaleQuantity(ing.quantidade, scaleFactor);
    return { ...ing, ...status, nutri, scaledQuantidade };
  });

  const totalIngredients = ingredientStatus.length;
  const ownedCount = ingredientStatus.filter((s) => s.found).length;
  const totalKcal = Math.round(estimateRecipeKcal(detail.ingredientes) * scaleFactor);

  const difficultyLabel =
    detail.difficultyLabel ?? difficultyToLabel(detail.difficulty ?? '');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <Image source={getRecipeImageSource(detail)} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 8 }]} onPress={onBack}>
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.heroActionsRight, { top: insets.top + 8 }]}>
            {detail.isOwn && onEditRecipe && (
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={() => onEditRecipe(detail)}
                accessibilityLabel="Editar receita"
              >
                <Pencil size={18} color={colors.foreground} />
              </TouchableOpacity>
            )}
            {detail.isOwn && (
              <TouchableOpacity
                style={styles.roundIconBtn}
                onPress={handleDeleteOwn}
                accessibilityLabel="Excluir receita"
              >
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.roundIconBtn} onPress={() => toggleFavorite(detail)}>
              <Heart
                size={20}
                color={favorited ? colors.destructive : colors.foreground}
                fill={favorited ? colors.destructive : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{detail.nome}</Text>
            <Text style={styles.heroAuthor}>por {detail.autor}</Text>
            {loadingDetail && (
              <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <StarRating rating={detail.rating} showValue totalRatings={detail.totalRatings} />
            <View style={styles.metaRight}>
              {!!difficultyLabel && (
                <View style={styles.diffBadge}>
                  <Text style={styles.diffBadgeText}>{difficultyLabel}</Text>
                </View>
              )}
              <View style={styles.timeRow}>
                <Clock size={15} color={colors.mutedForeground} />
                <Text style={styles.timeText}>{detail.tempoPreparo}</Text>
              </View>
            </View>
          </View>

          {detail.description?.trim() && (
            <View style={styles.descBox}>
              <Text style={styles.descText}>{detail.description.trim()}</Text>
            </View>
          )}

          <View style={styles.servingsBar}>
            <View style={styles.servingsRow}>
              <Users size={16} color={colors.secondaryForeground} />
              <TouchableOpacity style={styles.servBtn} onPress={() => setServings((s) => Math.max(1, s - 1))}>
                <Minus size={14} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.servCount}>{servings}</Text>
              <TouchableOpacity style={styles.servBtn} onPress={() => setServings((s) => s + 1)}>
                <Plus size={14} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.servLabel}>{servings === 1 ? 'porção' : 'porções'}</Text>
            </View>
            {totalKcal > 0 && (
              <View style={styles.kcalCol}>
                <View style={styles.kcalBadge}>
                  <Flame size={12} color={colors.primary} />
                  <Text style={styles.kcalText}>~{totalKcal} kcal</Text>
                </View>
                {servings > 0 && (
                  <View style={[styles.kcalBadge, { backgroundColor: colors.accent + '15' }]}>
                    <Flame size={12} color={colors.accent} />
                    <Text style={[styles.kcalText, { color: colors.accent }]}>
                      ~{Math.round(totalKcal / servings)} kcal/porção
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              {totalIngredients > 0 && (
                <View style={[styles.badge, { backgroundColor: ownedCount === totalIngredients ? colors.successLight : colors.warningLight }]}>
                  <Text style={[styles.badgeText, { color: ownedCount === totalIngredients ? colors.successDark : colors.warningDark }]}>
                    {ownedCount}/{totalIngredients} na despensa
                  </Text>
                </View>
              )}
            </View>
            {totalIngredients === 0 ? (
              <Text style={styles.emptyIngText}>
                Nenhum ingrediente listado para esta receita.
              </Text>
            ) : (
              ingredientStatus.map((ing, i) => (
                <View
                  key={i}
                  style={[
                    styles.ingredientRow,
                    {
                      backgroundColor: ing.found ? colors.successLight : colors.dangerLight,
                      borderColor: ing.found ? colors.successBorder : colors.dangerBorder,
                    },
                  ]}
                >
                  <View style={styles.ingredientLeft}>
                    <View style={[styles.checkCircle, { backgroundColor: ing.found ? colors.success : colors.destructive }]}>
                      {ing.found
                        ? <Check size={14} color="#fff" strokeWidth={3} />
                        : <X size={14} color="#fff" strokeWidth={3} />
                      }
                    </View>
                    <View>
                      <Text style={[styles.ingredientName, { color: ing.found ? colors.successDark : colors.dangerDark }]}>
                        {ing.nome}
                      </Text>
                      {ing.nutri && (
                        <Text style={styles.ingredientKcal}>{ing.nutri.kcal} kcal/100g</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.ingredientRight}>
                    <Text style={[styles.ingredientQty, { color: ing.found ? colors.successMuted : colors.destructive }]}>
                      {ing.scaledQuantidade}
                    </Text>
                    {!ing.found && (
                      <Text style={styles.missingText}>Falta: {ing.scaledQuantidade}</Text>
                    )}
                    {ing.found && (
                      <Text style={styles.ownedText}>Você tem: {ing.pantryQuantidade}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modo de Preparo</Text>
            {detail.modoPreparo.length === 0 && (
              <Text style={styles.emptyIngText}>Nenhum passo cadastrado.</Text>
            )}
            {detail.modoPreparo.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.obsBox}>
              <Text style={[styles.obsText, !recipe.observacoes && { fontStyle: 'italic', color: colors.mutedForeground }]}>
                {detail.observacoes || 'Nenhuma observação para esta receita.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.reportBtn} onPress={() => setShowReportRecipe(true)}>
            <Flag size={13} color={colors.mutedForeground} />
            <Text style={styles.reportBtnText}>Denunciar esta receita</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      <Modal visible={showReportRecipe} transparent animationType="fade">
        <TouchableOpacity
          style={styles.reportOverlay}
          activeOpacity={1}
          onPress={() => { if (!reportRecipeSent) { setShowReportRecipe(false); setReportRecipeReason(''); } }}
        >
          <View style={styles.reportModal} onStartShouldSetResponder={() => true}>
            {reportRecipeSent ? (
              <View style={styles.reportSentContent}>
                <View style={styles.reportSentIcon}>
                  <Flag size={24} color={colors.primary} />
                </View>
                <Text style={styles.reportSentTitle}>Denúncia enviada</Text>
                <Text style={styles.reportSentSubtitle}>Obrigado por nos ajudar a manter a comunidade segura.</Text>
              </View>
            ) : (
              <>
                <View style={styles.reportHeader}>
                  <AlertTriangle size={18} color={colors.destructive} />
                  <Text style={styles.reportTitle}>Denunciar receita</Text>
                </View>
                <Text style={styles.reportDesc}>
                  Descreva o motivo da denúncia contra a receita "{detail.nome}".
                </Text>
                <TextInput
                  value={reportRecipeReason}
                  onChangeText={setReportRecipeReason}
                  style={styles.reportInput}
                  placeholder="Ex: Conteúdo impróprio, informações falsas..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={styles.reportCancelBtn}
                    onPress={() => { setShowReportRecipe(false); setReportRecipeReason(''); }}
                  >
                    <Text style={styles.reportCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportSubmitBtn, !reportRecipeReason.trim() && { opacity: 0.5 }]}
                    disabled={!reportRecipeReason.trim()}
                    onPress={() => {
                      if (!reportRecipeReason.trim()) return;
                      setReportRecipeSent(true);
                      setTimeout(() => {
                        setShowReportRecipe(false);
                        setReportRecipeSent(false);
                        setReportRecipeReason('');
                      }, 2000);
                    }}
                  >
                    <Text style={styles.reportSubmitText}>Enviar denúncia</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroImage: { width: SCREEN_WIDTH, height: 224 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backButton: {
    position: 'absolute', left: 16, width: 36, height: 36,
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroActionsRight: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  heroAuthor: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  body: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  diffBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diffBadgeText: { fontSize: 12, fontWeight: '700', color: colors.foreground },
  descBox: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  descText: { fontSize: 14, color: colors.secondaryForeground, lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground },
  servingsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.secondary, borderRadius: 12, padding: 12,
  },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  servBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  servCount: { fontSize: 14, fontWeight: '700', color: colors.secondaryForeground, minWidth: 24, textAlign: 'center' },
  servLabel: { fontSize: 12, color: colors.mutedForeground },
  kcalCol: { alignItems: 'flex-end', gap: 4 },
  kcalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  kcalText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  emptyIngText: { fontSize: 14, color: colors.mutedForeground, fontStyle: 'italic' },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8,
  },
  ingredientLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ingredientName: { fontSize: 14, fontWeight: '500' },
  ingredientKcal: { fontSize: 10, color: colors.mutedForeground },
  ingredientRight: { alignItems: 'flex-end' },
  ingredientQty: { fontSize: 14, fontWeight: '600' },
  missingText: { fontSize: 11, fontWeight: '600', color: colors.dangerMuted, marginTop: 2 },
  ownedText: { fontSize: 11, color: colors.successMuted, marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNumber: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 20, paddingTop: 2 },
  obsBox: { backgroundColor: colors.secondary, borderRadius: 12, padding: 16 },
  obsText: { fontSize: 14, color: colors.secondaryForeground, lineHeight: 20 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 8 },
  reportBtnText: { fontSize: 12, color: colors.mutedForeground },
  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  reportModal: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  reportSentContent: { alignItems: 'center', paddingVertical: 16 },
  reportSentIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  reportSentTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 12 },
  reportSentSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  reportDesc: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
  reportInput: {
    backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.foreground,
    minHeight: 72, textAlignVertical: 'top',
  },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reportCancelBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  reportCancelText: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  reportSubmitBtn: { flex: 1, borderRadius: 8, backgroundColor: colors.destructive, paddingVertical: 10, alignItems: 'center' },
  reportSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default RecipeDetail;
