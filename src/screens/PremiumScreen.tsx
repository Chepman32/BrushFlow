import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../i18n';
import type { AppTheme } from '../theme/themes';

export const PremiumScreen: React.FC = () => {
  const { theme } = useSettings();
  const { locale } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{locale.navigation.premium}</Text>
        <Text style={styles.description}>{locale.screens.premium.description}</Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.secondaryText,
    },
  });
