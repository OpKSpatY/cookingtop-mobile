import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  totalRatings?: number;
}

const StarRating = ({ rating, size = 14, showValue = false, totalRatings }: StarRatingProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= Math.round(rating) ? colors.star : colors.starEmpty}
            fill={star <= Math.round(rating) ? colors.star : colors.starEmpty}
          />
        ))}
      </View>
      {showValue && (
        <Text style={[styles.value, { fontSize: size - 2 }]}>{rating.toFixed(1)}</Text>
      )}
      {totalRatings !== undefined && (
        <Text style={[styles.total, { fontSize: size - 2 }]}>({totalRatings})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  value: { fontWeight: '700', color: colors.foreground },
  total: { color: colors.mutedForeground },
});

export default StarRating;
