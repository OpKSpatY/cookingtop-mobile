import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, Modal, StyleSheet, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Menu, User, Settings, LogOut, ChefHat, BookOpen, Star, X } from 'lucide-react-native';
import { getUserLevel, getNextLevel, getLevelProgress, userLevels } from '../data/userLevels';
import { useUserRecipes } from '../contexts/UserRecipesContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import StarRating from './StarRating';
import type { Recipe } from '../data/mockData';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const CLOSE_THRESHOLD = DRAWER_WIDTH * 0.3;

type ProfileTab = 'perfil' | 'receitinhas';

interface UserMenuProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const ProgressBar = ({ value }: { value: number }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const UserMenu = ({ onRecipeClick, onProfileClick, onSettingsClick }: UserMenuProps) => {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('perfil');
  const { recipes } = useUserRecipes();
  const { profile: user } = useUserProfile();
  const level = getUserLevel(user.xp);
  const nextLevel = getNextLevel(user.xp);
  const progress = getLevelProgress(user.xp);

  const translateX = useSharedValue(DRAWER_WIDTH);
  const backdropProgress = useSharedValue(0);

  const rankedRecipes = [...recipes].sort((a, b) => b.rating - a.rating || b.totalRatings - a.totalRatings);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 280 });
      backdropProgress.value = withTiming(1, { duration: 280 });
    }
  }, [visible]);

  const openDrawer = () => {
    translateX.value = DRAWER_WIDTH;
    backdropProgress.value = 0;
    setVisible(true);
  };

  const resetState = useCallback(() => {
    setVisible(false);
    setTab('perfil');
  }, []);

  const closeDrawer = useCallback(() => {
    translateX.value = withTiming(DRAWER_WIDTH, { duration: 280 }, (finished) => {
      if (finished) runOnJS(resetState)();
    });
    backdropProgress.value = withTiming(0, { duration: 280 });
  }, [resetState]);

  const closeAndNavigate = useCallback((action?: () => void) => {
    translateX.value = withTiming(DRAWER_WIDTH, { duration: 280 }, (finished) => {
      if (finished) {
        runOnJS(resetState)();
        if (action) runOnJS(action)();
      }
    });
    backdropProgress.value = withTiming(0, { duration: 280 });
  }, [resetState]);

  const panGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      const x = Math.max(0, e.translationX);
      translateX.value = x;
      backdropProgress.value = interpolate(x, [0, DRAWER_WIDTH], [1, 0]);
    })
    .onEnd((e) => {
      if (e.translationX > CLOSE_THRESHOLD || e.velocityX > 500) {
        translateX.value = withTiming(DRAWER_WIDTH, { duration: 250 }, (finished) => {
          if (finished) runOnJS(resetState)();
        });
        backdropProgress.value = withTiming(0, { duration: 250 });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
        backdropProgress.value = withTiming(1, { duration: 200 });
      }
    });

  const drawerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openDrawer}>
        <Menu size={20} color={colors.foreground} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, backdropAnimStyle]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.drawer, drawerAnimStyle]}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.profileHeader}>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeDrawer}>
                    <X size={18} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.profileRow}>
                    <Image source={user.avatar} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                      <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>

                  <View style={styles.levelBadge}>
                    <View style={styles.levelRow}>
                      <View style={styles.levelLeft}>
                        <Text style={styles.levelIcon}>{level.icon}</Text>
                        <View>
                          <Text style={styles.levelTitle}>{level.title}</Text>
                          <Text style={styles.levelSub}>Nível {level.level}</Text>
                        </View>
                      </View>
                      <Text style={styles.xpText}>{user.xp} XP</Text>
                    </View>
                    {nextLevel && (
                      <View style={styles.levelProgress}>
                        <View style={styles.levelLabels}>
                          <Text style={styles.levelLabel}>{level.title}</Text>
                          <Text style={styles.levelLabel}>{nextLevel.title}</Text>
                        </View>
                        <ProgressBar value={progress} />
                        <Text style={styles.xpRemaining}>Faltam {nextLevel.minXp - user.xp} XP</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.tabBar}>
                  <TouchableOpacity
                    onPress={() => setTab('perfil')}
                    style={[styles.tab, tab === 'perfil' && styles.tabActive]}
                  >
                    <User size={13} color={tab === 'perfil' ? '#fff' : colors.secondaryForeground} />
                    <Text style={[styles.tabText, tab === 'perfil' && styles.tabTextActive]}>Perfil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTab('receitinhas')}
                    style={[styles.tab, tab === 'receitinhas' && styles.tabActive]}
                  >
                    <BookOpen size={13} color={tab === 'receitinhas' ? '#fff' : colors.secondaryForeground} />
                    <Text style={[styles.tabText, tab === 'receitinhas' && styles.tabTextActive]}>Receitinhas</Text>
                    {recipes.length > 0 && (
                      <View style={[styles.tabBadge, tab === 'receitinhas' && styles.tabBadgeActive]}>
                        <Text style={[styles.tabBadgeText, tab === 'receitinhas' && styles.tabBadgeTextActive]}>
                          {recipes.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {tab === 'perfil' ? (
                  <View style={styles.menuSection}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate(onProfileClick)}>
                      <User size={18} color={colors.mutedForeground} />
                      <Text style={styles.menuItemText}>Meu Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate(onProfileClick)}>
                      <ChefHat size={18} color={colors.mutedForeground} />
                      <Text style={styles.menuItemText}>Níveis</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate(onSettingsClick)}>
                      <Settings size={18} color={colors.mutedForeground} />
                      <Text style={styles.menuItemText}>Configurações</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={closeDrawer}>
                      <LogOut size={18} color={colors.destructive} />
                      <Text style={[styles.menuItemText, { color: colors.destructive }]}>Sair</Text>
                    </TouchableOpacity>

                    <View style={styles.levelsSection}>
                      <Text style={styles.levelsTitle}>Todos os Níveis</Text>
                      {userLevels.map((lvl) => (
                        <View
                          key={lvl.level}
                          style={[
                            styles.levelItem,
                            lvl.level === level.level && styles.levelItemCurrent,
                            lvl.level !== level.level && { opacity: lvl.level < level.level ? 0.6 : 0.4 },
                          ]}
                        >
                          <Text style={styles.levelItemIcon}>{lvl.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.levelItemTitle, lvl.level === level.level && { color: colors.primary }]}>
                              {lvl.title}
                            </Text>
                            <Text style={styles.levelItemDesc}>{lvl.description}</Text>
                          </View>
                          <Text style={styles.levelItemXp}>{lvl.minXp} XP</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.menuSection}>
                    {rankedRecipes.length === 0 ? (
                      <View style={styles.emptyRecipes}>
                        <View style={styles.emptyIcon}>
                          <BookOpen size={24} color={colors.secondaryForeground} />
                        </View>
                        <Text style={styles.emptyTitle}>Nenhuma receitinha ainda</Text>
                        <Text style={styles.emptySubtitle}>
                          Crie receitas na aba "Receitas" e elas aparecerão aqui!
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {rankedRecipes.map((recipe, index) => (
                          <TouchableOpacity
                            key={recipe.id}
                            style={styles.recipeRow}
                            onPress={() => closeAndNavigate(() => onRecipeClick?.(recipe))}
                          >
                            <View style={[
                              styles.rankCircle,
                              index === 0 && { backgroundColor: colors.primary },
                              index === 1 && { backgroundColor: colors.secondary },
                              index > 1 && { backgroundColor: colors.secondary },
                            ]}>
                              <Text style={[
                                styles.rankText,
                                index === 0 && { color: '#fff' },
                              ]}>
                                {index + 1}
                              </Text>
                            </View>
                            <Image source={recipe.imagem} style={styles.recipeThumb} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.recipeName} numberOfLines={1}>{recipe.nome}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                <StarRating rating={recipe.rating} size={11} showValue />
                                <Text style={styles.ratingCount}>
                                  {recipe.totalRatings} {recipe.totalRatings === 1 ? 'avaliação' : 'avaliações'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    width: DRAWER_WIDTH, backgroundColor: colors.background,
    position: 'absolute', right: 0, top: 0, bottom: 0,
    shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  closeBtn: { position: 'absolute', right: 16, top: 16, zIndex: 1 },
  profileHeader: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 48 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  userName: { fontWeight: '700', color: '#fff', fontSize: 16 },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  levelBadge: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelIcon: { fontSize: 20 },
  levelTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  levelSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  xpText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  levelProgress: { marginTop: 10 },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  levelLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  xpRemaining: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 4 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 12, marginTop: 12,
    backgroundColor: colors.secondary, borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 8,
  },
  tabActive: { backgroundColor: colors.primary, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.secondaryForeground },
  tabTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: colors.secondaryForeground + '1A', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondaryForeground },
  tabBadgeTextActive: { color: '#fff' },
  menuSection: { paddingHorizontal: 12, paddingVertical: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  levelsSection: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8 },
  levelsTitle: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 },
  levelItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  levelItemCurrent: { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '4D' },
  levelItemIcon: { fontSize: 16 },
  levelItemTitle: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  levelItemDesc: { fontSize: 10, color: colors.mutedForeground },
  levelItemXp: { fontSize: 10, fontWeight: '500', color: colors.mutedForeground },
  emptyRecipes: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: colors.mutedForeground, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 },
  recipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  rankCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.secondaryForeground },
  recipeThumb: { width: 48, height: 48, borderRadius: 8 },
  recipeName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  ratingCount: { fontSize: 10, color: colors.mutedForeground },
});

export default UserMenu;
