import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import StarRating from './StarRating';
import type { Recipe } from '../data/mockData';
import { colors } from '../theme/colors';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'horizontal' | 'vertical';
  onPress?: () => void;
}

const RecipeCard = ({ recipe, variant = 'vertical', onPress }: RecipeCardProps) => {
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity style={styles.horizontal} onPress={onPress} activeOpacity={0.7}>
        <Image source={recipe.imagem} style={styles.hImage} />
        <View style={styles.hContent}>
          <View>
            <Text style={styles.hTitle} numberOfLines={1}>{recipe.nome}</Text>
            <Text style={styles.hAuthor}>{recipe.autor}</Text>
          </View>
          <View style={styles.hBottom}>
            <StarRating rating={recipe.rating} size={12} showValue />
            <View style={styles.timeRow}>
              <Clock size={12} color={colors.mutedForeground} />
              <Text style={styles.timeText}>{recipe.tempoPreparo}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.vertical} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.vImageContainer}>
        <Image source={recipe.imagem} style={styles.vImage} />
        <View style={styles.vOverlay}>
          <View style={styles.timeRow}>
            <Clock size={10} color="#fff" />
            <Text style={styles.vTime}>{recipe.tempoPreparo}</Text>
          </View>
        </View>
      </View>
      <View style={styles.vContent}>
        <Text style={styles.vTitle} numberOfLines={1}>{recipe.nome}</Text>
        <Text style={styles.vAuthor} numberOfLines={1}>{recipe.autor}</Text>
        <StarRating rating={recipe.rating} size={11} showValue />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  hImage: { width: 80, height: 80, borderRadius: 10 },
  hContent: { flex: 1, justifyContent: 'space-between' },
  hTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  hAuthor: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  hBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: colors.mutedForeground },
  vertical: { width: 160 },
  vImageContainer: { borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  vImage: { width: '100%', height: 128 },
  vOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4 },
  vTime: { fontSize: 10, color: '#fff', fontWeight: '500' },
  vContent: { marginTop: 8, paddingHorizontal: 2 },
  vTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  vAuthor: { fontSize: 11, color: colors.mutedForeground, marginTop: 1, marginBottom: 2 },
});

export default RecipeCard;
