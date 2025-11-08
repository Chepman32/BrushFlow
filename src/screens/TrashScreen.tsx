import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FileManager, HapticManager, TrashCleanupService } from '../services';
import { TrashedArtwork } from '../types';
import { spacing } from '../theme';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../i18n';
import type { AppTheme } from '../theme/themes';
import Icon from 'react-native-vector-icons/Feather';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

// Artwork Card Component for Trash
const TrashedArtworkCard: React.FC<{
  item: TrashedArtwork;
  onPress: (item: TrashedArtwork) => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}> = ({ item, onPress, theme, styles }) => {
  const [thumbnailExists, setThumbnailExists] = useState(false);

  useEffect(() => {
    const checkThumbnail = async () => {
      if (item.thumbnailPath) {
        const exists = await RNFS.exists(item.thumbnailPath);
        setThumbnailExists(exists);
      }
    };
    checkThumbnail();
  }, [item.thumbnailPath]);

  const thumbnailUri = useMemo(() => {
    if (!item.thumbnailPath) {
      return '';
    }
    return `file://${item.thumbnailPath}`;
  }, [item.thumbnailPath]);

  const daysAgo = useMemo(() => {
    const days = Math.floor(
      (Date.now() - item.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }, [item.deletedAt]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnailPath && thumbnailExists ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Icon name="image" size={32} color={theme.colors.secondaryText} />
          </View>
        )}
        <View style={styles.overlayBadge}>
          <Icon name="trash-2" size={12} color="#FFF" />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.artworkName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.deletionTime}>
          {daysAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const TrashScreen: React.FC = () => {
  const { theme } = useSettings();
  const { locale } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [trashedArtworks, setTrashedArtworks] = useState<TrashedArtwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trashStats, setTrashStats] = useState<{
    itemCount: number;
    storageSize: number;
  }>({ itemCount: 0, storageSize: 0 });

  const fileManager = FileManager.getInstance();
  const hapticManager = HapticManager.getInstance();
  const trashCleanupService = TrashCleanupService.getInstance();

  const loadTrashedArtworks = async () => {
    try {
      const trashed = await fileManager.listTrashedArtworks();
      const stats = await trashCleanupService.getTrashStatus();

      setTrashedArtworks(trashed);
      setTrashStats({
        itemCount: stats.itemCount,
        storageSize: stats.storageSize,
      });
    } catch (error) {
      console.error('Failed to load trashed artworks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadTrashedArtworks();
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTrashedArtworks();
  };

  const handleRestoreArtwork = async (artwork: TrashedArtwork) => {
    try {
      await fileManager.restoreFromTrash(artwork.id);
      await loadTrashedArtworks();
      hapticManager.trigger('success');
      Alert.alert('Restored', `"${artwork.name}" has been restored to your gallery.`);
    } catch (error) {
      console.error('Failed to restore artwork:', error);
      Alert.alert('Restore failed', 'Unable to restore the artwork. Please try again.');
    }
  };

  const handlePermanentlyDelete = async (artwork: TrashedArtwork) => {
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently delete "${artwork.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileManager.permanentlyDeleteFromTrash(artwork.id);
              await loadTrashedArtworks();
              hapticManager.trigger('success');
            } catch (error) {
              console.error('Failed to permanently delete artwork:', error);
              Alert.alert('Delete failed', 'Unable to delete the artwork. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleArtworkPress = (artwork: TrashedArtwork) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: artwork.name,
          options: ['Cancel', 'Restore', 'Delete Permanently'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleRestoreArtwork(artwork);
          } else if (buttonIndex === 2) {
            handlePermanentlyDelete(artwork);
          }
        }
      );
    } else {
      Alert.alert(
        artwork.name,
        'What would you like to do?',
        [
          {
            text: 'Restore',
            onPress: () => handleRestoreArtwork(artwork),
          },
          {
            text: 'Delete Permanently',
            onPress: () => handlePermanentlyDelete(artwork),
            style: 'destructive',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleEmptyTrash = () => {
    if (trashedArtworks.length === 0) {
      return;
    }

    Alert.alert(
      'Empty Trash',
      `Permanently delete all ${trashedArtworks.length} items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileManager.emptyTrash();
              await loadTrashedArtworks();
              hapticManager.trigger('success');
              Alert.alert('Trash Emptied', 'All items have been permanently deleted.');
            } catch (error) {
              console.error('Failed to empty trash:', error);
              Alert.alert('Failed', 'Unable to empty trash. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>{locale.navigation.trash}</Text>
        {trashedArtworks.length > 0 && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleEmptyTrash}
            activeOpacity={0.7}
          >
            <Icon name="trash-2" size={18} color={theme.colors.error} />
            <Text style={styles.emptyButtonText}>Empty Trash</Text>
          </TouchableOpacity>
        )}
      </View>
      {trashedArtworks.length > 0 && (
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {trashStats.itemCount} {trashStats.itemCount === 1 ? 'item' : 'items'} •{' '}
            {trashCleanupService.formatStorageSize(trashStats.storageSize)}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="trash-2" size={64} color={theme.colors.secondaryText} />
      </View>
      <Text style={styles.emptyTitle}>Trash is Empty</Text>
      <Text style={styles.emptyDescription}>
        Deleted artworks will appear here.{'\n'}
        You can restore them or delete them permanently.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={trashedArtworks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrashedArtworkCard
            item={item}
            onPress={handleArtworkPress}
            theme={theme}
            styles={styles}
          />
        )}
        numColumns={2}
        columnWrapperStyle={trashedArtworks.length > 0 ? styles.row : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primaryText}
          />
        }
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
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    header: {
      paddingVertical: spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: theme.isDark
        ? 'rgba(255, 59, 48, 0.15)'
        : 'rgba(255, 59, 48, 0.1)',
      gap: spacing.xs,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.error,
    },
    stats: {
      marginTop: spacing.xs,
    },
    statsText: {
      fontSize: 14,
      color: theme.colors.secondaryText,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    card: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.35 : 0.12,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.isDark ? 'transparent' : 'rgba(0,0,0,0.1)',
    },
    thumbnailContainer: {
      width: CARD_WIDTH,
      height: CARD_WIDTH,
      position: 'relative',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    placeholderThumbnail: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      padding: spacing.xs,
    },
    cardInfo: {
      padding: spacing.md,
    },
    artworkName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 4,
    },
    deletionTime: {
      fontSize: 13,
      color: theme.colors.secondaryText,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 3,
      paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
  });
