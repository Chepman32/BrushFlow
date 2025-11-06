import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Keyboard,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/types';
import { FileManager, HapticManager, IAPManager, ExportManager } from '../services';
import { ArtworkMetadata } from '../types';
import { spacing } from '../theme';
import {
  SideMenu,
  PremiumModal,
  TutorialCarousel,
  AnimatedScreenContainer,
} from '../components';
import Icon from 'react-native-vector-icons/Feather';
import { Canvas, FitBox, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

type NavigationProp = DrawerNavigationProp<DrawerParamList, 'Gallery'>;

// Separate component for artwork card to use hooks properly
const ArtworkCard: React.FC<{
  item: ArtworkMetadata;
  onPress: (id: string) => void;
  onMorePress: (item: ArtworkMetadata) => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}> = ({ item, onPress, onMorePress, theme, styles }) => {
  const [thumbnailExists, setThumbnailExists] = useState(false);
  const [previewData, setPreviewData] = useState<{
    width: number;
    height: number;
    backgroundColor: string;
    layers: {
      id: string;
      opacity: number;
      visible: boolean;
      strokes: {
        id: string;
        path: SkPath;
        color: string;
        strokeWidth: number;
        opacity: number;
      }[];
    }[];
  } | null>(null);
  const lastModified = useMemo(() => item.modifiedAt.getTime(), [item.modifiedAt]);

  useEffect(() => {
    const checkThumbnail = async () => {
      if (item.thumbnailPath) {
        const exists = await RNFS.exists(item.thumbnailPath);
        setThumbnailExists(exists);
      }
    };
    checkThumbnail();
  }, [item.thumbnailPath, lastModified]);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      try {
        const fileManager = FileManager.getInstance();
        const artwork = await fileManager.loadArtwork(item.id);

        if (!isMounted) {
          return;
        }

        const preparedLayers = artwork.layers.map(layer => ({
          id: layer.id,
          opacity: layer.opacity,
          visible: layer.visible,
          strokes: (layer.strokes || [])
            .map(stroke => {
              if (!stroke.svgPath) {
                return null;
              }
              const path = Skia.Path.MakeFromSVGString(stroke.svgPath);
              if (!path) {
                return null;
              }
              return {
                id: stroke.id,
                path,
                color: stroke.color,
                strokeWidth: stroke.strokeWidth,
                opacity: stroke.opacity,
              };
            })
            .filter(Boolean) as {
            id: string;
            path: SkPath;
            color: string;
            strokeWidth: number;
            opacity: number;
          }[],
        }));

        setPreviewData({
          width: artwork.width,
          height: artwork.height,
          backgroundColor: artwork.backgroundColor || '#FFFFFF',
          layers: preparedLayers,
        });
      } catch (error) {
        console.error('Failed to load artwork preview:', error);
        if (isMounted) {
          setPreviewData(null);
        }
      }
    };

    setPreviewData(null);
    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [item.id, lastModified]);

  const thumbnailUri = useMemo(() => {
    if (!item.thumbnailPath) {
      return '';
    }
    return `file://${item.thumbnailPath}?t=${lastModified}`;
  }, [item.thumbnailPath, lastModified]);

  const renderPreview = () => {
    if (previewData) {
      const srcRect = Skia.XYWHRect(0, 0, previewData.width, previewData.height);
      const dstRect = Skia.XYWHRect(0, 0, CARD_WIDTH, CARD_WIDTH);

      return (
        <Canvas style={styles.thumbnailCanvas}>
          <FitBox src={srcRect} dst={dstRect} fit="contain">
            <Group>
              <Rect
                x={0}
                y={0}
                width={previewData.width}
                height={previewData.height}
                color={previewData.backgroundColor}
              />
              {previewData.layers.map(layer => {
                if (!layer.visible) {
                  return null;
                }
                return layer.strokes.map(stroke => (
                  <Path
                    key={`${layer.id}-${stroke.id}`}
                    path={stroke.path}
                    color={stroke.color}
                    style="stroke"
                    strokeWidth={stroke.strokeWidth}
                    opacity={layer.opacity * stroke.opacity}
                  />
                ));
              })}
            </Group>
          </FitBox>
        </Canvas>
      );
    }

    if (item.thumbnailPath && thumbnailExists) {
      return (
        <Image
          key={lastModified}
          source={{ uri: thumbnailUri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.thumbnailPlaceholder}>
        <Icon
          name="image"
          size={48}
          color={withOpacity(theme.colors.primaryText, theme.isDark ? 0.25 : 0.3)}
        />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => onMorePress(item)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon
          name="more-horizontal"
          size={20}
          color={withOpacity(theme.colors.primaryText, theme.isDark ? 0.7 : 0.6)}
        />
      </TouchableOpacity>
      <View style={styles.thumbnail}>{renderPreview()}</View>
      <View style={styles.cardInfo}>
        <Text style={styles.artworkName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.artworkMeta}>
          {item.width}×{item.height} • {item.layerCount} layers
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const GalleryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useSettings();
  const { locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);
  const palette = theme.colors;
  const [artworks, setArtworks] = useState<ArtworkMetadata[]>([]);
  const [allArtworks, setAllArtworks] = useState<ArtworkMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkMetadata | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const hapticManager = HapticManager.getInstance();
  const iapManager = IAPManager.getInstance();

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize FileManager to create directories
      const fileManager = FileManager.getInstance();
      await fileManager.initialize();

      // Then load artworks
      await loadArtworks();
      await checkPremiumStatus();
      await checkFirstLaunch();
    };

    initializeApp();
  }, []);

  // Reload artworks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadArtworks();
    }, [])
  );

  const checkFirstLaunch = async () => {
    // Check if this is first launch and show tutorial
    // In a real app, this would check AsyncStorage
    const isFirstLaunch = false; // Replace with actual check
    if (isFirstLaunch) {
      setTutorialVisible(true);
    }
  };

  const checkPremiumStatus = async () => {
    const status = await iapManager.isPremium();
    setIsPremiumUser(status);
  };

  const loadArtworks = async () => {
    try {
      const fileManager = FileManager.getInstance();
      const artworkList = await fileManager.listArtworks();
      setAllArtworks(artworkList);
      setArtworks(artworkList);
    } catch (error) {
      console.error('Failed to load artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArtworks();
    setRefreshing(false);
    hapticManager.trigger('success');
  };

  const handleCreateNew = () => {
    navigation.navigate('Canvas' as any, { artworkId: undefined });
    hapticManager.buttonPress();
  };

  const handleArtworkPress = (artworkId: string) => {
    navigation.navigate('Canvas' as any, { artworkId });
    hapticManager.buttonPress();
  };

  const handlePurchase = async () => {
    try {
      await iapManager.purchaseProduct('com.brushflow.premium.lifetime');
      setIsPremiumUser(true);
      setPremiumModalVisible(false);
      hapticManager.purchaseComplete();
    } catch (error) {
      console.error('Purchase failed:', error);
      hapticManager.purchaseFailed();
    }
  };

  const handleRestore = async () => {
    try {
      await iapManager.restorePurchases();
      const status = await iapManager.isPremium();
      setIsPremiumUser(status);
      if (status) {
        setPremiumModalVisible(false);
        hapticManager.purchaseComplete();
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const openRenameDialog = (artwork: ArtworkMetadata) => {
    setSelectedArtwork(artwork);
    setRenameValue(artwork.name);
    setRenameModalVisible(true);
  };

  const closeRenameDialog = () => {
    setRenameModalVisible(false);
    setRenameValue('');
    setSelectedArtwork(null);
  };

  const handleRenameSubmit = async () => {
    if (!selectedArtwork) {
      return;
    }

    const trimmed = renameValue.trim();
    if (trimmed.length === 0) {
      Alert.alert('Name required', 'Please enter a name for your artwork.');
      return;
    }

    if (trimmed === selectedArtwork.name) {
      closeRenameDialog();
      return;
    }

    try {
      const fileManager = FileManager.getInstance();
      await fileManager.renameArtwork(selectedArtwork.id, trimmed);
      closeRenameDialog();
      await loadArtworks();
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to rename artwork:', error);
      Alert.alert('Rename failed', 'Something went wrong while renaming. Please try again.');
    }
  };

  const handleShareArtwork = async (artwork: ArtworkMetadata) => {
    try {
      const exportManager = ExportManager.getInstance();
      if (!artwork.thumbnailPath) {
        Alert.alert(
          'Share unavailable',
          'Open the artwork once to generate a preview before sharing.',
        );
        return;
      }

      const exists = await RNFS.exists(artwork.thumbnailPath);
      if (!exists) {
        Alert.alert(
          'Share unavailable',
          'Preview not found. Open the artwork to regenerate it and try again.',
        );
        return;
      }

      await exportManager.shareArtwork(artwork.thumbnailPath, artwork.name);
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to share artwork:', error);
      Alert.alert('Share failed', 'Unable to share the artwork right now. Please try again.');
    }
  };

  const performDeleteArtwork = async (artwork: ArtworkMetadata) => {
    try {
      const fileManager = FileManager.getInstance();
      await fileManager.deleteArtwork(artwork.id);
      await loadArtworks();
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to delete artwork:', error);
      Alert.alert('Delete failed', 'Unable to delete the artwork. Please try again.');
    }
  };

  const confirmDeleteArtwork = (artwork: ArtworkMetadata) => {
    Alert.alert(
      'Delete Artwork',
      `Are you sure you want to delete "${artwork.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteArtwork(artwork),
        },
      ],
    );
  };

  const handleMoreOptions = (artwork: ArtworkMetadata) => {
    hapticManager.buttonPress();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: artwork.name,
          options: ['Cancel', 'Share', 'Rename', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
          userInterfaceStyle: 'dark',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            void handleShareArtwork(artwork);
          } else if (buttonIndex === 2) {
            openRenameDialog(artwork);
          } else if (buttonIndex === 3) {
            confirmDeleteArtwork(artwork);
          }
        },
      );
      return;
    }

    Alert.alert(artwork.name, undefined, [
      {
        text: 'Share',
        onPress: () => {
          void handleShareArtwork(artwork);
        },
      },
      {
        text: 'Rename',
        onPress: () => openRenameDialog(artwork),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteArtwork(artwork),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const menuItems = [
    {
      id: 'gallery',
      label: locale.navigation.gallery,
      icon: 'grid',
      onPress: () => {
        setMenuVisible(false);
      },
    },
    {
      id: 'create',
      label: 'Create New',
      icon: 'plus-circle',
      onPress: () => {
        setMenuVisible(false);
        handleCreateNew();
      },
    },
    {
      id: 'premium',
      label: 'Premium Features',
      icon: 'star',
      isPremium: true,
      onPress: () => {
        setMenuVisible(false);
        setPremiumModalVisible(true);
      },
    },
    {
      id: 'tutorials',
      label: 'Tutorials',
      icon: 'book-open',
      badge: '3 New',
      onPress: () => {
        setMenuVisible(false);
        setTutorialVisible(true);
      },
    },
    {
      id: 'settings',
      label: locale.navigation.settings,
      icon: 'settings',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('Settings');
      },
    },
    {
      id: 'trash',
      label: locale.navigation.trash,
      icon: 'trash-2',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('Trash');
      },
    },
    {
      id: 'premium-screen',
      label: locale.navigation.premium,
      icon: 'zap',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('Premium');
      },
    },
    {
      id: 'export',
      label: 'Export & Share',
      icon: 'share-2',
      onPress: () => {
        setMenuVisible(false);
      },
    },
    {
      id: 'about',
      label: locale.navigation.about,
      icon: 'info',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('About');
      },
    },
  ];

  const renderArtworkCard = ({ item }: { item: ArtworkMetadata }) => (
    <ArtworkCard
      item={item}
      onPress={handleArtworkPress}
      onMorePress={handleMoreOptions}
      theme={theme}
      styles={styles}
    />
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setArtworks(allArtworks);
      return;
    }
    const normalized = searchQuery.toLowerCase();
    setArtworks(
      allArtworks.filter(entry =>
        entry.name.toLowerCase().includes(normalized),
      ),
    );
  }, [searchQuery, allArtworks]);

  useEffect(() => {
    if (isSearchVisible) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timeout);
    } else {
      setSearchQuery('');
      Keyboard.dismiss();
    }
  }, [isSearchVisible]);

  const hasSearchQuery = searchQuery.trim().length > 0;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {hasSearchQuery ? 'No artworks found' : 'Start Your Creative Journey'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasSearchQuery
          ? 'Try a different name or clear the search.'
          : 'Tap the + button to create your first masterpiece'}
      </Text>
    </View>
  );

  return (
    <AnimatedScreenContainer style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.iconButton}
        >
          <Icon name="menu" size={24} color={palette.primaryText} />
        </TouchableOpacity>
        {isSearchVisible ? (
          <View style={styles.searchRow}>
            <Icon
              name="search"
              size={18}
              color={withOpacity(palette.primaryText, theme.isDark ? 0.6 : 0.5)}
            />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search artworks"
              placeholderTextColor={withOpacity(
                palette.primaryText,
                theme.isDark ? 0.5 : 0.4,
              )}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {hasSearchQuery ? (
              <TouchableOpacity
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery('')}
                style={styles.searchClearButton}
              >
                <Icon name="x" size={16} color={palette.primaryText} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Text style={styles.title}>BrushFlow</Text>
        )}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSearchVisible(prev => !prev)}
        >
          <Icon
            name={isSearchVisible ? 'x' : 'search'}
            size={24}
            color={palette.primaryText}
          />
        </TouchableOpacity>
      </View>

      {/* Artwork Grid */}
      <FlatList
        data={artworks}
        renderItem={renderArtworkCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Side Menu */}
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isPremiumUser={isPremiumUser}
        menuItems={menuItems}
      />

      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onPurchase={handlePurchase}
        onRestore={handleRestore}
      />

      {/* Tutorial Carousel */}
      {tutorialVisible && (
        <TutorialCarousel
          visible={tutorialVisible}
          onComplete={() => setTutorialVisible(false)}
          onSkip={() => setTutorialVisible(false)}
        />
      )}

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRenameDialog}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>Rename Artwork</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Artwork name"
              placeholderTextColor={withOpacity(palette.mutedText, theme.isDark ? 0.6 : 0.5)}
              style={styles.renameInput}
              autoFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[styles.renameButton, { marginRight: spacing.sm }]}
                onPress={closeRenameDialog}
              >
                <Text style={styles.renameButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameButton, styles.renameButtonPrimary]}
                onPress={handleRenameSubmit}
              >
                <Text style={[styles.renameButtonText, styles.renameButtonPrimaryText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedScreenContainer>
  );
};

const createStyles = (theme: AppTheme, topInset: number) => {
  const palette = theme.colors;
  const cardShadowOpacity = theme.isDark ? 0.35 : 0.12;
  const fabShadowOpacity = theme.isDark ? 0.35 : 0.25;
  const subtleOverlay = withOpacity(palette.primaryText, theme.isDark ? 0.12 : 0.08);
  const strongOverlay = withOpacity(palette.primaryText, theme.isDark ? 0.24 : 0.14);
  const barBackground = withOpacity(palette.surface, theme.isDark ? 0.94 : 0.88);
  const modalBackground = theme.isDark
    ? withOpacity(palette.background, 0.82)
    : withOpacity(palette.background, 0.62);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: topInset + spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: barBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    searchRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.md,
      marginRight: spacing.md,
      backgroundColor: subtleOverlay,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    searchInput: {
      flex: 1,
      color: palette.primaryText,
      fontSize: 16,
      marginLeft: 8,
      paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    },
    searchClearButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: strongOverlay,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: palette.primaryText,
      textAlign: 'center',
    },
    grid: {
      padding: spacing.lg,
    },
    row: {
      justifyContent: 'space-between',
    },
    card: {
      width: CARD_WIDTH,
      marginBottom: spacing.md,
      borderRadius: 16,
      backgroundColor: palette.surface,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: cardShadowOpacity,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.isDark ? 'transparent' : withOpacity(palette.border, 0.2),
    },
    moreButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: strongOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbnail: {
      width: '100%',
      height: CARD_WIDTH,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: palette.card,
      overflow: 'hidden',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    thumbnailCanvas: {
      width: '100%',
      height: '100%',
    },
    thumbnailPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: subtleOverlay,
    },
    cardInfo: {
      padding: spacing.md,
    },
    artworkName: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.primaryText,
      marginBottom: 4,
    },
    artworkMeta: {
      fontSize: 12,
      color: palette.mutedText,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: palette.primaryText,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      color: palette.mutedText,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: palette.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: fabShadowOpacity,
      shadowRadius: 24,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: modalBackground,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    renameModal: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: palette.surface,
      shadowColor: palette.shadow,
      shadowOpacity: theme.isDark ? 0.35 : 0.12,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 10,
    },
    renameTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.primaryText,
      marginBottom: spacing.md,
    },
    renameInput: {
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: subtleOverlay,
      color: palette.primaryText,
      fontSize: 16,
      marginBottom: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: withOpacity(palette.border, 0.6),
    },
    renameActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    renameButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: subtleOverlay,
    },
    renameButtonPrimary: {
      backgroundColor: palette.accent,
    },
    renameButtonText: {
      color: palette.primaryText,
      fontSize: 16,
      fontWeight: '500',
    },
    renameButtonPrimaryText: {
      color: theme.isDark ? palette.background : '#FFFFFF',
    },
  });
};

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
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
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
