import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import RecipeCard from './RecipeCard';
import type { Recipe } from '../data/mockData';
import { colors } from '../theme/colors';

interface RecipeCarouselProps {
  title: string;
  recipes: Recipe[];
  onRecipePress: (recipe: Recipe) => void;
}

const RecipeCarousel = ({ title, recipes, onRecipePress }: RecipeCarouselProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => onRecipePress(recipe)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
});

export default RecipeCarousel;
