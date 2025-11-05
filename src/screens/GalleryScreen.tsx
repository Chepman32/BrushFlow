import React, { useState, useEffect } from 'react';
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
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/types';
import { FileManager, HapticManager, IAPManager } from '../services';
import { ArtworkMetadata } from '../types';
import { colors, typography, spacing } from '../theme';
import { SideMenu, PremiumModal, TutorialCarousel } from '../components';
import Icon from 'react-native-vector-icons/Feather';
import { Canvas, FitBox, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

type NavigationProp = DrawerNavigationProp<DrawerParamList, 'Gallery'>;

// Separate component for artwork card to use hooks properly
const ArtworkCard: React.FC<{
  item: ArtworkMetadata;
  onPress: (id: string) => void;
  onMorePress: (item: ArtworkMetadata) => void;
}> = ({ item, onPress, onMorePress }) => {
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

  useEffect(() => {
    const checkThumbnail = async () => {
      if (item.thumbnailPath) {
        const exists = await RNFS.exists(item.thumbnailPath);
        setThumbnailExists(exists);
      }
    };
    checkThumbnail();
  }, [item.thumbnailPath]);

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
  }, [item.id]);

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
          source={{ uri: `file://${item.thumbnailPath}` }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.thumbnailPlaceholder}>
        <Icon name="image" size={48} color="rgba(255,255,255,0.3)" />
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
        <Icon name="more-horizontal" size={20} color="rgba(255,255,255,0.7)" />
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
  const [artworks, setArtworks] = useState<ArtworkMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkMetadata | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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
          options: ['Cancel', 'Rename', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            openRenameDialog(artwork);
          } else if (buttonIndex === 2) {
            confirmDeleteArtwork(artwork);
          }
        },
      );
      return;
    }

    Alert.alert(artwork.name, undefined, [
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
      label: 'My Gallery',
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
      label: 'Settings',
      icon: 'settings',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('Settings' as any);
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
      label: 'About',
      icon: 'info',
      onPress: () => {
        setMenuVisible(false);
      },
    },
  ];

  const renderArtworkCard = ({ item }: { item: ArtworkMetadata }) => (
    <ArtworkCard
      item={item}
      onPress={handleArtworkPress}
      onMorePress={handleMoreOptions}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Start Your Creative Journey</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to create your first masterpiece
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.iconButton}
        >
          <Icon name="menu" size={24} color={colors.text.light} />
        </TouchableOpacity>
        <Text style={styles.title}>BrushFlow</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color={colors.text.light} />
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
            tintColor={colors.primary.blue}
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={32} color={colors.text.light} />
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
              placeholderTextColor="rgba(255,255,255,0.4)"
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(26, 31, 58, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.light,
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
    backgroundColor: colors.surface.dark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  moreButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.surface.light,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardInfo: {
    padding: spacing.md,
  },
  artworkName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light,
    marginBottom: 4,
  },
  artworkMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
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
    color: colors.text.light,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  renameModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.surface.dark,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.light,
    marginBottom: spacing.md,
  },
  renameInput: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: colors.text.light,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  renameButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  renameButtonPrimary: {
    backgroundColor: colors.primary.blue,
  },
  renameButtonText: {
    color: colors.text.light,
    fontSize: 16,
    fontWeight: '500',
  },
  renameButtonPrimaryText: {
    color: '#ffffff',
  },
});
