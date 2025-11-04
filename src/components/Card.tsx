import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, shadows } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = true,
}) => {
  return (
    <View style={[styles.card, elevated && shadows.medium, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 16,
  },
});
