import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, ChefHat, Star, BookOpen, Heart, Clock, Award, Pencil, Check, X } from 'lucide-react-native';
import { getUserLevel, getNextLevel, getLevelProgress, userLevels } from '../data/userLevels';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useUserProfile, AVATAR_OPTIONS } from '../contexts/UserProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { patchMeApi, AuthApiError } from '../services/authApi';
import StarRating from '../components/StarRating';
import RecipeDetail from '../components/RecipeDetail';
import type { Recipe } from '../data/mockData';
import { getRecipeImageSource } from '../utils/recipeUi';
import { colors } from '../theme/colors';

interface ProfileScreenProps {
  onBack: () => void;
}

const ProgressBar = ({ value }: { value: number }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const ProfileScreen = ({ onBack }: ProfileScreenProps) => {
  const { profile } = useUserProfile();
  const { accessToken, user, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const level = getUserLevel(profile.xp);
  const nextLevel = getNextLevel(profile.xp);
  const progress = getLevelProgress(profile.xp);
  const { myRecipes: userRecipes } = useUserRecipes();
  const { favorites } = useFavorites();

  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);

  /** Mantém o formulário alinhado quando o perfil é atualizado (ex.: após login com dados da API) */
  useEffect(() => {
    if (!editing) {
      setEditBio(profile.bio);
      setEditAvatar(profile.avatar);
    }
  }, [profile.bio, profile.avatar, profile.name, profile.email, profile.xp, editing]);

  const startEditing = () => { setEditBio(profile.bio); setEditAvatar(profile.avatar); setEditing(true); };
  const cancelEditing = () => setEditing(false);

  const saveEditing = async () => {
    const bio = editBio.trim();
    if (bio.length > 200) {
      showError('A descrição pode ter no máximo 200 caracteres.', 'Texto longo demais');
      return;
    }
    if (!accessToken || !user) {
      showError('Faça login novamente para salvar o perfil.', 'Sessão expirada');
      return;
    }

    const avatarIdx = AVATAR_OPTIONS.findIndex((src) => src === editAvatar);
    const avatarId = avatarIdx >= 0 ? avatarIdx + 1 : user.avatarId;

    setSaving(true);
    try {
      const nextUser = await patchMeApi(
        accessToken,
        { avatarId, profileDescription: bio },
        user
      );
      await updateUser(nextUser);
      setEditing(false);
      showSuccess('Perfil atualizado com sucesso.');
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível salvar. Verifique a conexão e tente novamente.';
      showError(msg, 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { icon: BookOpen, label: 'Receitas criadas', value: userRecipes.length },
    { icon: Heart, label: 'Favoritas', value: favorites.length },
    { icon: Clock, label: 'Cozinhadas', value: profile.totalCozinhadas },
    { icon: Star, label: 'XP Total', value: profile.xp },
  ];

  const topRecipes = [...userRecipes].sort((a, b) => b.rating - a.rating).slice(0, 3);

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]} edges={['top']}>
      <KeyboardAwareScrollView
        style={{ backgroundColor: colors.background, flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'android' ? 160 : 56}
        extraHeight={Platform.OS === 'android' ? 120 : 80}
        keyboardOpeningTime={Platform.OS === 'android' ? 0 : 250}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        /** Restaura a posição de rolagem de antes do teclado ao retrair (padrão da lib) */
        enableResetScrollToCoords
      >
        <View style={styles.headerBg}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={startEditing}>
                <Pencil size={14} color="#fff" />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
        </View>

        <View style={styles.avatarCard}>
          {editing ? (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.editLabel}>FOTO DE PERFIL</Text>
                <View style={styles.avatarPreviewRow}>
                  <Image source={editAvatar} style={styles.avatarPreview} />
                  <Text style={styles.avatarHint}>Escolha um avatar:</Text>
                </View>
                <View style={styles.avatarGrid}>
                  {AVATAR_OPTIONS.map((src, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setEditAvatar(src)}
                      style={[styles.avatarOption, editAvatar === src && styles.avatarOptionActive]}
                    >
                      <Image source={src} style={styles.avatarOptionImg} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyName}>{profile.name}</Text>
                <View style={styles.emailRow}>
                  <Mail size={12} color={colors.mutedForeground} />
                  <Text style={styles.readOnlyEmail}>{profile.email}</Text>
                </View>
                <Text style={styles.readOnlyHint}>Nome e email não podem ser alterados</Text>
              </View>

              <View>
                <View style={styles.bioHeader}>
                  <Text style={styles.editLabel}>BIO</Text>
                  <Text style={[styles.bioCount, editBio.length > 200 && { color: colors.destructive }]}>
                    {editBio.length}/200
                  </Text>
                </View>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  style={styles.bioInput}
                  placeholder="Escreva algo sobre você, seus pratos favoritos…"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={cancelEditing}
                  disabled={saving}
                >
                  <X size={16} color={colors.mutedForeground} />
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveEditing}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Check size={16} color="#fff" />
                  )}
                  <Text style={styles.saveBtnText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.profileInfoRow}>
                <Image source={profile.avatar} style={styles.profileAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
                  <View style={styles.emailRow}>
                    <Mail size={13} color={colors.mutedForeground} />
                    <Text style={styles.profileEmail} numberOfLines={1}>{profile.email}</Text>
                  </View>
                  <Text style={styles.memberSince}>Membro desde {profile.memberSince}</Text>
                </View>
              </View>
              {profile.bio?.trim() ? (
                <Text style={styles.bioText}>{profile.bio}</Text>
              ) : (
                <Text style={styles.bioPlaceholder}>
                  Você ainda não adicionou uma descrição ao seu perfil. Use &quot;Editar&quot; para contar um pouco sobre você.
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.levelCard}>
          <View style={styles.cardTitleRow}>
            <Award size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Nível de Cozinheiro</Text>
          </View>
          <View style={styles.levelDisplay}>
            <Text style={{ fontSize: 30 }}>{level.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelName}>{level.title}</Text>
              <Text style={styles.levelDesc}>{level.description}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.xpBold}>{profile.xp} XP</Text>
              <Text style={styles.levelNum}>Nível {level.level}</Text>
            </View>
          </View>
          {nextLevel && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>{level.title}</Text>
                <Text style={styles.progressLabel}>{nextLevel.title} — faltam {nextLevel.minXp - profile.xp} XP</Text>
              </View>
              <ProgressBar value={progress} />
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          {stats.map(({ icon: Icon, label, value }) => (
            <View key={label} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icon size={18} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {topRecipes.length > 0 && (
          <View style={styles.topCard}>
            <View style={styles.cardTitleRow}>
              <ChefHat size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Minhas Melhores Receitas</Text>
            </View>
            {topRecipes.map((recipe, i) => (
              <TouchableOpacity key={recipe.id} style={styles.topRecipeRow} onPress={() => setSelectedRecipe(recipe)}>
                <View style={[styles.topRank, i === 0 && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.topRankText, i === 0 && { color: '#fff' }]}>{i + 1}</Text>
                </View>
                <Image source={getRecipeImageSource(recipe)} style={styles.topRecipeImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.topRecipeName} numberOfLines={1}>{recipe.nome}</Text>
                  <StarRating rating={recipe.rating} size={11} showValue />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.allLevelsCard}>
          <View style={styles.cardTitleRow}>
            <Star size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Todos os Níveis</Text>
          </View>
          {userLevels.map((lvl) => (
            <View
              key={lvl.level}
              style={[
                styles.lvlRow,
                lvl.level === level.level && styles.lvlRowCurrent,
                lvl.level !== level.level && { opacity: lvl.level < level.level ? 0.6 : 0.4 },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{lvl.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lvlName, lvl.level === level.level && { color: colors.primary }]}>{lvl.title}</Text>
                <Text style={styles.lvlDesc}>{lvl.description}</Text>
              </View>
              <Text style={styles.lvlXp}>{lvl.minXp} XP</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 64, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, paddingHorizontal: 12, height: 36 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  headerTitle: { marginTop: 8, fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarCard: {
    marginHorizontal: 16, marginTop: -40, borderRadius: 16,
    backgroundColor: colors.card, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primary + '4D', backgroundColor: colors.secondary },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  profileEmail: { fontSize: 12, color: colors.mutedForeground },
  memberSince: { fontSize: 10, color: colors.mutedForeground, marginTop: 4 },
  bioText: { marginTop: 12, fontSize: 14, color: colors.foreground + 'CC', lineHeight: 20 },
  bioPlaceholder: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  editLabel: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 1, marginBottom: 8 },
  avatarPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarPreview: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary },
  avatarHint: { fontSize: 12, color: colors.mutedForeground },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  avatarOption: { borderRadius: 20, padding: 2, opacity: 0.7 },
  avatarOptionActive: { opacity: 1, borderWidth: 2, borderColor: colors.primary },
  avatarOptionImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary },
  readOnlyBox: { backgroundColor: colors.secondary + '66', borderRadius: 12, padding: 12 },
  readOnlyName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  readOnlyEmail: { fontSize: 12, color: colors.mutedForeground },
  readOnlyHint: { fontSize: 10, color: colors.mutedForeground + '99', fontStyle: 'italic', marginTop: 4 },
  bioHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioCount: { fontSize: 10, color: colors.mutedForeground },
  bioInput: {
    backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.foreground,
    textAlignVertical: 'top', minHeight: 72,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 10,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  levelCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    backgroundColor: colors.card, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  levelDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.secondary + '99', borderRadius: 12, padding: 12,
  },
  levelName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  levelDesc: { fontSize: 11, color: colors.mutedForeground },
  xpBold: { fontSize: 12, fontWeight: '700', color: colors.primary },
  levelNum: { fontSize: 10, color: colors.mutedForeground },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 10, color: colors.mutedForeground },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  statCard: {
    width: '47%', borderRadius: 16, backgroundColor: colors.card, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  statLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  topCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    backgroundColor: colors.card, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  topRecipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.secondary + '66', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  topRank: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  topRankText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  topRecipeImg: { width: 40, height: 40, borderRadius: 8 },
  topRecipeName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  allLevelsCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    backgroundColor: colors.card, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  lvlRowCurrent: { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '4D' },
  lvlName: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  lvlDesc: { fontSize: 10, color: colors.mutedForeground },
  lvlXp: { fontSize: 10, fontWeight: '500', color: colors.mutedForeground },
});

export default ProfileScreen;
