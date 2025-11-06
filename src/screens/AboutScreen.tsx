import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../i18n';
import type { AppTheme } from '../theme/themes';
import appMeta from '../../package.json';

export const AboutScreen: React.FC = () => {
  const { theme } = useSettings();
  const { locale } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{locale.navigation.about}</Text>
        <Text style={styles.description}>{locale.screens.about.description}</Text>
        <View style={styles.versionBlock}>
          <Text style={styles.versionLabel}>{locale.screens.about.versionLabel}</Text>
          <Text style={styles.versionValue}>{appMeta.version}</Text>
        </View>
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
    versionBlock: {
      marginTop: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    versionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.mutedText,
    },
    versionValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
  });
