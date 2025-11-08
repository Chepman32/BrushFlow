import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/Feather';
import { useSettings } from '../contexts/SettingsContext';
import type { LanguageCode } from '../contexts/SettingsContext';
import { useTranslation } from '../i18n';
import { themes, themeNames, type AppTheme, type ThemeName } from '../theme/themes';
import { AnimatedScreenContainer, RemoveWatermarkModal } from '../components';
import { IAPManager, SettingsManager, TrashCleanupService } from '../services';
import type { TrashRetentionDays } from '../types';

type SettingToggleProps = {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  accentColor: string;
  idleTrackColor: string;
};

const SettingToggleRow: React.FC<SettingToggleProps> = ({
  label,
  description,
  value,
  onChange,
  styles,
  accentColor,
  idleTrackColor,
}) => {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowTextContainer}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: idleTrackColor, true: accentColor }}
        thumbColor={
          Platform.OS === 'android' ? (value ? '#FFFFFF' : '#F3F4F6') : undefined
        }
        ios_backgroundColor={idleTrackColor}
      />
    </View>
  );
};

type NavigationProp = DrawerNavigationProp<DrawerParamList, 'Settings'>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    theme,
    themeName,
    setThemeName,
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    language,
    setLanguage,
  } = useSettings();
  const { locale, languageDisplayNames, supportedLanguages } = useTranslation();
  const strings = locale.settings;

  const styles = useMemo(() => createStyles(theme), [theme]);
  const [watermarkModalVisible, setWatermarkModalVisible] = useState(false);
  const [isProcessingWatermark, setIsProcessingWatermark] = useState(false);

  const [autoDeleteTrash, setAutoDeleteTrash] = useState(false);
  const [trashRetentionDays, setTrashRetentionDays] = useState<TrashRetentionDays>(30);
  const [trashStats, setTrashStats] = useState<{ itemCount: number; storageSize: number }>({
    itemCount: 0,
    storageSize: 0
  });

  const settingsManager = useMemo(() => SettingsManager.getInstance(), []);
  const trashCleanupService = useMemo(() => TrashCleanupService.getInstance(), []);

  useEffect(() => {
    const loadTrashSettings = async () => {
      const settings = settingsManager.getSettings();
      setAutoDeleteTrash(settings.storage.autoDeleteTrash);
      setTrashRetentionDays(settings.storage.trashRetentionDays);

      const stats = await trashCleanupService.getTrashStatus();
      setTrashStats({ itemCount: stats.itemCount, storageSize: stats.storageSize });
    };
    void loadTrashSettings();
  }, [settingsManager, trashCleanupService]);

  const handleThemeSelect = useCallback(
    (value: ThemeName) => {
      if (value !== themeName) {
        void setThemeName(value);
      }
    },
    [setThemeName, themeName],
  );

  const handleSoundToggle = useCallback(
    (value: boolean) => {
      void setSoundEnabled(value);
    },
    [setSoundEnabled],
  );

  const handleHapticsToggle = useCallback(
    (value: boolean) => {
      void setHapticsEnabled(value);
    },
    [setHapticsEnabled],
  );

  const handleLanguageSelect = useCallback(
    (code: LanguageCode) => {
      if (code !== language) {
        void setLanguage(code);
      }
    },
    [language, setLanguage],
  );

  const handleRemoveWatermarkPurchase = useCallback(
    async (plan: 'yearly' | 'weekly', _options?: { trialEnabled: boolean }) => {
      setIsProcessingWatermark(true);
      try {
        const iapManager = IAPManager.getInstance();
        const productId =
          plan === 'yearly'
            ? 'com.brushflow.remove_watermark.yearly'
            : 'com.brushflow.remove_watermark.weekly';
        await iapManager.purchaseProduct(productId);
        setWatermarkModalVisible(false);
      } catch (error) {
        console.error('Remove watermark purchase failed:', error);
        Alert.alert(
          'Purchase failed',
          'We were unable to complete your unlock. Please try again in a moment.',
        );
      } finally {
        setIsProcessingWatermark(false);
      }
    },
    [],
  );

  const handleRemoveWatermarkRestore = useCallback(async () => {
    try {
      const iapManager = IAPManager.getInstance();
      await iapManager.restorePurchases();
      Alert.alert('Restore complete', 'Your purchases have been restored.');
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Restore failed', 'Unable to restore purchases right now. Please try again.');
    }
  }, []);

  const handleAutoDeleteTrashToggle = useCallback(
    async (value: boolean) => {
      setAutoDeleteTrash(value);
      await settingsManager.updateStorageSettings({ autoDeleteTrash: value });
    },
    [settingsManager],
  );

  const handleRetentionDaysSelect = useCallback(
    async (days: TrashRetentionDays) => {
      if (days !== trashRetentionDays) {
        setTrashRetentionDays(days);
        await settingsManager.updateStorageSettings({ trashRetentionDays: days });
      }
    },
    [settingsManager, trashRetentionDays],
  );

  const handleEmptyTrash = useCallback(async () => {
    if (trashStats.itemCount === 0) {
      Alert.alert('Trash is Empty', 'There are no items in the trash.');
      return;
    }

    Alert.alert(
      'Empty Trash',
      `Permanently delete all ${trashStats.itemCount} items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await trashCleanupService.emptyTrash();
              setTrashStats({ itemCount: 0, storageSize: 0 });
              Alert.alert('Trash Emptied', 'All items have been permanently deleted.');
            } catch (error) {
              console.error('Failed to empty trash:', error);
              Alert.alert('Failed', 'Unable to empty trash. Please try again.');
            }
          },
        },
      ],
    );
  }, [trashStats.itemCount, trashCleanupService]);

  return (
    <SafeAreaView style={styles.safe}>
      <AnimatedScreenContainer style={styles.animatedContainer}>
        <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={22} color={theme.colors.primaryText} />
          </TouchableOpacity>
          <Text style={styles.title}>{strings.title}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.themeLabel}</Text>
          <Text style={styles.sectionDescription}>{strings.themeDescription}</Text>
          <View style={styles.cardList}>
            {themeNames.map(option => {
              const optionTheme = themes[option];
              const selected = option === themeName;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.85}
                  onPress={() => handleThemeSelect(option)}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: selected ? theme.colors.accent : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.surface
                        : theme.colors.background,
                    },
                    selected ? styles.themeCardSelected : null,
                  ]}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={styles.themeSwatch}>
                      <View
                        style={[
                          styles.swatchBlock,
                          { backgroundColor: optionTheme.colors.background },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatchBlock,
                          { backgroundColor: optionTheme.colors.card },
                        ]}
                      />
                    </View>
                    {selected ? (
                      <Icon name="check-circle" size={20} color={theme.colors.accent} />
                    ) : null}
                  </View>
                  <Text style={styles.optionLabel}>{strings.themeNames[option]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.soundLabel}</Text>
          <View style={styles.card}>
            <SettingToggleRow
              label={strings.soundLabel}
              description={strings.soundDescription}
              value={soundEnabled}
              onChange={handleSoundToggle}
              styles={styles}
              accentColor={theme.colors.accent}
              idleTrackColor={theme.colors.border}
            />
            <View style={styles.divider} />
            <SettingToggleRow
              label={strings.hapticsLabel}
              description={strings.hapticsDescription}
              value={hapticsEnabled}
              onChange={handleHapticsToggle}
              styles={styles}
              accentColor={theme.colors.accent}
              idleTrackColor={theme.colors.border}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.languageLabel}</Text>
          <Text style={styles.sectionDescription}>{strings.languageDescription}</Text>
          <View style={styles.languagesWrap}>
            {supportedLanguages.map(code => {
              const selected = code === language;
              return (
                <TouchableOpacity
                  key={code}
                  activeOpacity={0.85}
                  onPress={() => handleLanguageSelect(code)}
                  style={[
                    styles.languageChip,
                    {
                      borderColor: selected ? theme.colors.accent : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.surface
                        : theme.colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.languageText,
                      { color: selected ? theme.colors.accent : theme.colors.primaryText },
                    ]}
                  >
                    {languageDisplayNames[code]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watermark</Text>
          <Text style={styles.sectionDescription}>
            Free exports include a small BrushFlow watermark. Unlock clean exports anytime.
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.watermarkButton}
              activeOpacity={0.85}
              onPress={() => setWatermarkModalVisible(true)}
            >
              <View style={styles.watermarkCopy}>
                <Text style={styles.watermarkTitle}>Remove watermark</Text>
                <Text style={styles.watermarkSubtitle}>
                  One-time unlock for watermark-free sharing.
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trash & Storage</Text>
          <Text style={styles.sectionDescription}>
            Manage deleted artworks and automatic cleanup settings.
          </Text>
          <View style={styles.card}>
            <SettingToggleRow
              label="Auto-delete old items"
              description={`Automatically delete items older than ${trashRetentionDays} days`}
              value={autoDeleteTrash}
              onChange={handleAutoDeleteTrashToggle}
              styles={styles}
              accentColor={theme.colors.accent}
              idleTrackColor={theme.colors.border}
            />
          </View>

          {autoDeleteTrash && (
            <>
              <Text style={[styles.sectionDescription, { marginTop: 16 }]}>
                Items will be permanently deleted after:
              </Text>
              <View style={styles.retentionDaysWrap}>
                {([7, 30, 60, 90] as TrashRetentionDays[]).map(days => {
                  const selected = days === trashRetentionDays;
                  return (
                    <TouchableOpacity
                      key={days}
                      activeOpacity={0.85}
                      onPress={() => handleRetentionDaysSelect(days)}
                      style={[
                        styles.retentionChip,
                        {
                          borderColor: selected ? theme.colors.accent : theme.colors.border,
                          backgroundColor: selected
                            ? theme.colors.surface
                            : theme.colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.retentionText,
                          { color: selected ? theme.colors.accent : theme.colors.primaryText },
                        ]}
                      >
                        {days} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.trashStatsRow}>
              <View style={styles.trashStatItem}>
                <Text style={styles.trashStatValue}>{trashStats.itemCount}</Text>
                <Text style={styles.trashStatLabel}>
                  {trashStats.itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <View style={styles.trashStatDivider} />
              <View style={styles.trashStatItem}>
                <Text style={styles.trashStatValue}>
                  {trashCleanupService.formatStorageSize(trashStats.storageSize)}
                </Text>
                <Text style={styles.trashStatLabel}>storage used</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.emptyTrashButton}
              activeOpacity={0.85}
              onPress={handleEmptyTrash}
              disabled={trashStats.itemCount === 0}
            >
              <Icon
                name="trash-2"
                size={18}
                color={trashStats.itemCount === 0 ? theme.colors.mutedText : theme.colors.error}
              />
              <Text
                style={[
                  styles.emptyTrashText,
                  { color: trashStats.itemCount === 0 ? theme.colors.mutedText : theme.colors.error }
                ]}
              >
                Empty Trash Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </AnimatedScreenContainer>
      <RemoveWatermarkModal
        visible={watermarkModalVisible}
        onClose={() => setWatermarkModalVisible(false)}
        onPurchase={handleRemoveWatermarkPurchase}
        onRestore={handleRemoveWatermarkRestore}
        isProcessing={isProcessingWatermark}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    animatedContainer: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    header: {
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      backgroundColor: withOpacity(theme.colors.primaryText, theme.isDark ? 0.12 : 0.08),
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    section: {
      marginTop: 28,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors.mutedText,
      marginTop: 4,
    },
    cardList: {
      marginTop: 16,
    },
    card: {
      marginTop: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.4 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    watermarkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    watermarkCopy: {
      flex: 1,
      paddingRight: 12,
    },
    watermarkTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    watermarkSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.mutedText,
    },
    themeCard: {
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
    },
    themeCardSelected: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.isDark ? 0.45 : 0.12,
      shadowRadius: 14,
      elevation: 6,
    },
    themeCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    themeSwatch: {
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    swatchBlock: {
      width: 36,
      height: 28,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowTextContainer: {
      flex: 1,
      paddingRight: 12,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    rowDescription: {
      marginTop: 2,
      fontSize: 13,
      color: theme.colors.mutedText,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    languagesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
    },
    languageChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      marginRight: 12,
      marginBottom: 12,
    },
    languageText: {
      fontSize: 15,
      fontWeight: '600',
    },
    retentionDaysWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
    },
    retentionChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      marginRight: 12,
      marginBottom: 12,
    },
    retentionText: {
      fontSize: 15,
      fontWeight: '600',
    },
    trashStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },
    trashStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    trashStatValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    trashStatLabel: {
      fontSize: 13,
      color: theme.colors.mutedText,
      marginTop: 4,
    },
    trashStatDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
    },
    emptyTrashButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    emptyTrashText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

const withOpacity = (color: string, alpha: number) => {
  const normalized = Math.min(1, Math.max(0, alpha));

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(char => char + char)
        .join('');
    }
    const value = parseInt(hex, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${normalized})`;
  }

  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(part => part.trim());
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    return `rgba(${r}, ${g}, ${b}, ${normalized})`;
  }

  return color;
};
