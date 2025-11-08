import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
import {
  FileManager,
  HapticManager,
  IAPManager,
  ExportManager,
  ProjectManager,
} from '../services';
import {
  Artwork,
  ArtworkMetadata,
  Project,
  ProjectDeletionStrategy,
} from '../types';
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
type ProjectFilter = 'all' | 'unfiled' | string;

// Separate component for artwork card to use hooks properly
const ArtworkCard: React.FC<{
  item: ArtworkMetadata;
  onPress: (id: string) => void;
  onMorePress: (item: ArtworkMetadata) => void;
  onSelectToggle: (id: string) => void;
  onLongPressSelect: (id: string) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}> = ({
  item,
  onPress,
  onMorePress,
  onSelectToggle,
  onLongPressSelect,
  isSelectionMode,
  isSelected,
  theme,
  styles,
}) => {
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

  const handlePress = () => {
    if (isSelectionMode) {
      onSelectToggle(item.id);
    } else {
      onPress(item.id);
    }
  };

  const handleLongPress = () => {
    onLongPressSelect(item.id);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={220}
      activeOpacity={0.8}
    >
      {isSelectionMode && (
        <View
          style={[
            styles.selectionIndicator,
            isSelected && styles.selectionIndicatorActive,
          ]}
        >
          {isSelected && (
            <Icon name="check" size={16} color={theme.isDark ? '#0E0E0E' : '#FFFFFF'} />
          )}
        </View>
      )}
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => onMorePress(item)}
        disabled={isSelectionMode}
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
  const styles = useMemo(
    () => createStyles(theme, insets.top, insets.bottom),
    [theme, insets.top, insets.bottom],
  );
  const palette = theme.colors;
  const [artworks, setArtworks] = useState<ArtworkMetadata[]>([]);
  const [allArtworks, setAllArtworks] = useState<ArtworkMetadata[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [activeProjectFilter, setActiveProjectFilter] = useState<ProjectFilter>('all');
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [transferState, setTransferState] = useState<{
    mode: 'move' | 'copy';
    artworkIds: string[];
  } | null>(null);
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);
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
  const [projectEditorState, setProjectEditorState] = useState<{
    mode: 'create' | 'rename';
    project?: Project;
  } | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [createOptionsVisible, setCreateOptionsVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const hapticManager = HapticManager.getInstance();
  const iapManager = IAPManager.getInstance();
  const projectManager = ProjectManager.getInstance();

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

  useEffect(() => {
    let isMounted = true;
    const syncProjects = async () => {
      try {
        await projectManager.initialize();
        const projectList = await projectManager.getProjects();
        if (isMounted) {
          setProjects(projectList);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };

    syncProjects();
    const unsubscribe = projectManager.subscribe(projectList => {
      if (isMounted) {
        setProjects(projectList);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectManager]);

  useEffect(() => {
    if (
      activeProjectFilter !== 'all' &&
      activeProjectFilter !== 'unfiled' &&
      !projects.some(project => project.id === activeProjectFilter)
    ) {
      setActiveProjectFilter('all');
    }
  }, [projects, activeProjectFilter]);

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
    const targetProjectId =
      activeProjectFilter !== 'all' && activeProjectFilter !== 'unfiled'
        ? activeProjectFilter
        : undefined;
    navigation.navigate('Canvas' as any, {
      artworkId: undefined,
      projectId: targetProjectId,
    });
    hapticManager.buttonPress();
  };
  const openCreateOptions = () => {
    setCreateOptionsVisible(true);
    hapticManager.trigger('light');
  };

  const closeCreateOptions = () => {
    setCreateOptionsVisible(false);
  };

  const handleCreateArtworkOption = () => {
    closeCreateOptions();
    handleCreateNew();
  };

  const handleCreateProjectOption = () => {
    closeCreateOptions();
    setProjectEditorState({ mode: 'create' });
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

  const getThumbnailFallbackPath = async (
    artwork: ArtworkMetadata,
  ): Promise<string | null> => {
    if (!artwork.thumbnailPath) {
      return null;
    }
    try {
      const exists = await RNFS.exists(artwork.thumbnailPath);
      return exists ? artwork.thumbnailPath : null;
    } catch (error) {
      console.warn('Failed to check thumbnail for fallback sharing:', error);
      return null;
    }
  };

  const prepareShareableArtwork = async (
    artwork: ArtworkMetadata,
  ): Promise<string | null> => {
    try {
      const fileManager = FileManager.getInstance();
      const exportManager = ExportManager.getInstance();
      const fullArtwork = await fileManager.loadArtwork(artwork.id);
      const safeWidth = Math.max(
        1,
        fullArtwork.width ?? artwork.width ?? 1080,
      );
      const safeHeight = Math.max(
        1,
        fullArtwork.height ??
          artwork.height ??
          Math.round((safeWidth * 4) / 3),
      );
      const sanitizedArtwork: Artwork = {
        ...fullArtwork,
        width: safeWidth,
        height: safeHeight,
        viewportWidth: fullArtwork.viewportWidth ?? safeWidth,
        viewportHeight: fullArtwork.viewportHeight ?? safeHeight,
        layers: Array.isArray(fullArtwork.layers) ? fullArtwork.layers : [],
      };

      const exportPath = await exportManager.exportArtwork(sanitizedArtwork, {
        format: 'png',
        filename: `${artwork.id}-share-${Date.now()}`,
        width: safeWidth,
        height: safeHeight,
        preserveTransparency: true,
      });

      return exportPath;
    } catch (error) {
      console.error('Failed to prepare artwork for sharing:', error);
      const fallbackPath = await getThumbnailFallbackPath(artwork);
      if (fallbackPath) {
        console.warn('Falling back to cached thumbnail for sharing.', fallbackPath);
        return fallbackPath;
      }
      Alert.alert(
        'Share unavailable',
        'Unable to render this artwork for sharing right now. Please open it once and try again.',
      );
      return null;
    }
  };

  const handleShareArtwork = async (artwork: ArtworkMetadata) => {
    try {
      const exportManager = ExportManager.getInstance();
      const shareablePath = await prepareShareableArtwork(artwork);
      if (!shareablePath) {
        return;
      }

      await exportManager.shareArtwork(shareablePath, artwork.name);
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to share artwork:', error);
      Alert.alert('Share failed', 'Unable to share the artwork right now. Please try again.');
    }
  };

  const performDeleteArtwork = async (artwork: ArtworkMetadata) => {
    try {
      const fileManager = FileManager.getInstance();
      await fileManager.moveToTrash(artwork.id);
      await loadArtworks();
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to move artwork to trash:', error);
      Alert.alert('Failed', 'Unable to move the artwork to trash. Please try again.');
    }
  };

  const confirmDeleteArtwork = (artwork: ArtworkMetadata) => {
    Alert.alert(
      'Move to Trash',
      `Move "${artwork.name}" to trash? You can restore it later from the Trash screen.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: () => performDeleteArtwork(artwork),
        },
      ],
    );
  };

  const handleMoveArtworkRequest = (artwork: ArtworkMetadata) => {
    openTransferModal('move', [artwork.id]);
  };

  const handleCopyArtworkRequest = (artwork: ArtworkMetadata) => {
    openTransferModal('copy', [artwork.id]);
  };

  const handleMoreOptions = (artwork: ArtworkMetadata) => {
    hapticManager.buttonPress();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: artwork.name,
          options: [
            'Cancel',
            'Share',
            'Rename',
            'Move to Project',
            'Copy to Project',
            'Move to Trash',
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 5,
          userInterfaceStyle: 'dark',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            void handleShareArtwork(artwork);
          } else if (buttonIndex === 2) {
            openRenameDialog(artwork);
          } else if (buttonIndex === 3) {
            handleMoveArtworkRequest(artwork);
          } else if (buttonIndex === 4) {
            handleCopyArtworkRequest(artwork);
          } else if (buttonIndex === 5) {
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
        text: 'Move to Project',
        onPress: () => handleMoveArtworkRequest(artwork),
      },
      {
        text: 'Copy to Project',
        onPress: () => handleCopyArtworkRequest(artwork),
      },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: () => confirmDeleteArtwork(artwork),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleArtworkSelection = (artworkId: string) => {
    setSelectedArtworkIds(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId],
    );
  };

  const handleArtworkLongPressSelect = (artworkId: string) => {
    if (isSelectionMode) {
      toggleArtworkSelection(artworkId);
      return;
    }
    setSelectedArtworkIds([artworkId]);
    hapticManager.trigger('selection');
  };

  const clearSelection = () => {
    setSelectedArtworkIds([]);
  };

  useEffect(() => {
    clearSelection();
  }, [activeProjectFilter]);

  const isSelectionMode = selectedArtworkIds.length > 0;
  const selectedArtworkSet = useMemo(
    () => new Set(selectedArtworkIds),
    [selectedArtworkIds],
  );

  const projectArtworkCounts = useMemo(
    () =>
      allArtworks.reduce<Record<string, number>>((acc, artwork) => {
        const key = artwork.projectId ?? 'unfiled';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [allArtworks],
  );

  const projectMenuItems = useMemo(
    () => {
      const baseItems = [
        {
          id: 'all',
          label: 'All Artworks',
          count: allArtworks.length,
          isDefault: true,
        },
        {
          id: 'unfiled',
          label: 'Unfiled',
          count: projectArtworkCounts['unfiled'] || 0,
          isDefault: true,
        },
      ];

      const userProjects = projects.map(project => ({
        id: project.id,
        label: project.name,
        count: projectArtworkCounts[project.id] || 0,
        isDefault: false,
      }));

      return [...baseItems, ...userProjects];
    },
    [allArtworks.length, projectArtworkCounts, projects],
  );

  const currentProjectLabel = useMemo(() => {
    if (activeProjectFilter === 'all') {
      return 'All Artworks';
    }
    if (activeProjectFilter === 'unfiled') {
      return 'Unfiled Artworks';
    }
    const project = projects.find(entry => entry.id === activeProjectFilter);
    return project ? project.name : 'All Artworks';
  }, [activeProjectFilter, projects]);

  const currentProjectCountLabel = useMemo(() => {
    const count = artworks.length;
    const unit = count === 1 ? 'artwork' : 'artworks';
    return `${count} ${unit}`;
  }, [artworks.length]);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectFilter(projectId as ProjectFilter);
    setMenuVisible(false);
  };

  const handleToggleProjectsSection = () => {
    setProjectsExpanded(prev => !prev);
  };

  const handleCreateProjectShortcut = () => {
    setProjectEditorState({ mode: 'create' });
    setMenuVisible(false);
  };

  const handleProjectOptions = (projectId: string) => {
    const project = projects.find(entry => entry.id === projectId);
    if (project) {
      setProjectEditorState({ mode: 'rename', project });
      setMenuVisible(false);
    }
  };

  const closeProjectEditor = () => {
    setProjectEditorState(null);
    setProjectNameInput('');
  };

  const handleSubmitProjectEditor = async () => {
    if (!projectEditorState) {
      return;
    }
    const trimmed = projectNameInput.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a project name.');
      return;
    }

    try {
      if (projectEditorState.mode === 'create') {
        const project = await projectManager.createProject(trimmed);
        setActiveProjectFilter(project.id);
        hapticManager.trigger('success');
      } else if (projectEditorState.project) {
        await projectManager.renameProject(projectEditorState.project.id, trimmed);
        hapticManager.trigger('success');
      }
      closeProjectEditor();
    } catch (error) {
      console.error('Failed to save project:', error);
      Alert.alert(
        'Unable to save',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const handleDeleteProject = async (
    project: Project,
    strategy: ProjectDeletionStrategy,
  ) => {
    try {
      await projectManager.deleteProject(project.id, strategy);
      if (activeProjectFilter === project.id) {
        setActiveProjectFilter('all');
      }
      await loadArtworks();
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to delete project:', error);
      Alert.alert('Delete failed', 'Unable to remove this project. Please try again.');
    }
  };

  const confirmDeleteProject = (project: Project) => {
    Alert.alert(
      `Delete "${project.name}"?`,
      'Choose what to do with the artworks inside this project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Unfiled',
          onPress: () => handleDeleteProject(project, 'move-to-unfiled'),
        },
        {
          text: 'Delete Project & Artworks',
          style: 'destructive',
          onPress: () => handleDeleteProject(project, 'delete-artworks'),
        },
      ],
    );
  };

  const handleProjectDeletionRequest = () => {
    if (projectEditorState?.project) {
      const target = projectEditorState.project;
      closeProjectEditor();
      confirmDeleteProject(target);
    }
  };

  const openTransferModal = (mode: 'move' | 'copy', artworkIds: string[]) => {
    if (!artworkIds.length) {
      Alert.alert('Select artworks', 'Choose at least one artwork first.');
      return;
    }
    setTransferState({
      mode,
      artworkIds: Array.from(new Set(artworkIds)),
    });
    setMenuVisible(false);
  };

  const closeTransferModal = () => {
    setTransferState(null);
  };

  const projectTransferTargets = useMemo(
    () => [
      {
        id: 'unfiled',
        label: 'Unfiled',
        count: projectArtworkCounts['unfiled'] || 0,
      },
      ...projects.map(project => ({
        id: project.id,
        label: project.name,
        count: projectArtworkCounts[project.id] || 0,
      })),
    ],
    [projects, projectArtworkCounts],
  );

  const handlePerformTransfer = async (targetId: string | null) => {
    if (!transferState) {
      return;
    }
    setIsProcessingTransfer(true);
    try {
      if (transferState.mode === 'move') {
        for (const artworkId of transferState.artworkIds) {
          await projectManager.assignArtworkToProject(artworkId, targetId);
        }
      } else {
        for (const artworkId of transferState.artworkIds) {
          await projectManager.copyArtworkToProject(artworkId, targetId);
        }
      }
      await loadArtworks();
      clearSelection();
      setTransferState(null);
      hapticManager.trigger('success');
    } catch (error) {
      console.error('Failed to update project assignment:', error);
      Alert.alert(
        'Action failed',
        'Unable to complete that action right now. Please try again.',
      );
    } finally {
      setIsProcessingTransfer(false);
    }
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
      onSelectToggle={toggleArtworkSelection}
      onLongPressSelect={handleArtworkLongPressSelect}
      isSelectionMode={isSelectionMode}
      isSelected={selectedArtworkSet.has(item.id)}
      theme={theme}
      styles={styles}
    />
  );

  useEffect(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let filtered = allArtworks;

    if (activeProjectFilter === 'unfiled') {
      filtered = filtered.filter(entry => !entry.projectId);
    } else if (activeProjectFilter !== 'all') {
      filtered = filtered.filter(entry => entry.projectId === activeProjectFilter);
    }

    if (normalizedQuery) {
      filtered = filtered.filter(entry =>
        entry.name.toLowerCase().includes(normalizedQuery),
      );
    }

    setArtworks(filtered);
  }, [searchQuery, allArtworks, activeProjectFilter]);

  useEffect(() => {
    setSelectedArtworkIds(prev =>
      prev.filter(id => allArtworks.some(artwork => artwork.id === id)),
    );
  }, [allArtworks]);


  useEffect(() => {
    if (!projectEditorState) {
      setProjectNameInput('');
      return;
    }
    if (projectEditorState.mode === 'rename' && projectEditorState.project) {
      setProjectNameInput(projectEditorState.project.name);
    } else {
      setProjectNameInput('');
    }
  }, [projectEditorState]);

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

  const renderEmptyState = () => {
    const showingProject = activeProjectFilter !== 'all' && !hasSearchQuery;
    const title = hasSearchQuery
      ? 'No artworks found'
      : showingProject
      ? 'This project is empty'
      : 'Start Your Creative Journey';
    const subtitle = hasSearchQuery
      ? 'Try a different name or clear the search.'
      : showingProject
      ? 'Move or copy artworks here to start organizing this project.'
      : 'Tap the + button to create your first masterpiece';

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
      </View>
    );
  };

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

      <View style={styles.projectContext}>
        <View>
          <Text style={styles.projectContextLabel}>Project</Text>
          <Text style={styles.projectContextName} numberOfLines={1}>
            {currentProjectLabel}
          </Text>
        </View>
        <Text style={styles.projectContextCount}>{currentProjectCountLabel}</Text>
      </View>

      {/* Artwork Grid */}
      <FlatList
        data={artworks}
        renderItem={renderArtworkCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.grid,
          isSelectionMode && styles.gridWithSelection,
        ]}
        extraData={selectedArtworkIds}
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

      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => openTransferModal('move', selectedArtworkIds)}
            >
              <Icon name="folder" size={18} color="#FFFFFF" />
              <Text style={styles.selectionButtonText}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectionButton, styles.selectionButtonSpacing]}
              onPress={() => openTransferModal('copy', selectedArtworkIds)}
            >
              <Icon name="copy" size={18} color="#FFFFFF" />
              <Text style={styles.selectionButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                styles.selectionButtonSecondary,
                styles.selectionButtonSpacing,
              ]}
              onPress={clearSelection}
            >
              <Icon name="x-circle" size={18} color={palette.primaryText} />
              <Text style={[styles.selectionButtonText, styles.selectionButtonSecondaryText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating Action Button */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openCreateOptions}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Side Menu */}
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isPremiumUser={isPremiumUser}
        menuItems={menuItems}
        projectsSection={{
          items: projectMenuItems,
          selectedId: activeProjectFilter,
          expanded: projectsExpanded,
          onToggle: handleToggleProjectsSection,
          onSelect: handleSelectProject,
          onAddProject: handleCreateProjectShortcut,
          onItemOptions: handleProjectOptions,
        }}
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
        visible={createOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateOptions}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createOptionsCard}>
            <Text style={styles.createOptionsTitle}>Create</Text>
            <Text style={styles.createOptionsSubtitle}>Choose what you want to begin with.</Text>
            <TouchableOpacity
              style={styles.createOptionButton}
              onPress={handleCreateArtworkOption}
              activeOpacity={0.85}
            >
              <Icon name="edit-3" size={20} color={palette.accent} />
              <View style={styles.createOptionTextContainer}>
                <Text style={styles.createOptionTitle}>Artwork</Text>
                <Text style={styles.createOptionDescription}>Start a blank canvas</Text>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={withOpacity(palette.primaryText, theme.isDark ? 0.6 : 0.5)}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createOptionButton}
              onPress={handleCreateProjectOption}
              activeOpacity={0.85}
            >
              <Icon name="folder-plus" size={20} color={palette.accent} />
              <View style={styles.createOptionTextContainer}>
                <Text style={styles.createOptionTitle}>Project</Text>
                <Text style={styles.createOptionDescription}>Organize artworks into a folder</Text>
              </View>
              <Icon
                name="chevron-right"
                size={18}
                color={withOpacity(palette.primaryText, theme.isDark ? 0.6 : 0.5)}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectionButton, styles.selectionButtonSecondary, { marginTop: spacing.md }]}
              onPress={closeCreateOptions}
            >
              <Text style={[styles.selectionButtonText, styles.selectionButtonSecondaryText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(transferState)}
        transparent
        animationType="fade"
        onRequestClose={closeTransferModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.transferModal}>
            <Text style={styles.transferTitle}>
              {transferState?.mode === 'move' ? 'Move to Project' : 'Copy to Project'}
            </Text>
            <Text style={styles.transferSubtitle}>
              Select a destination for{' '}
              {transferState?.artworkIds.length ?? 0}{' '}
              {transferState && transferState.artworkIds.length === 1 ? 'artwork' : 'artworks'}.
            </Text>
            <ScrollView style={styles.transferList}>
              {projectTransferTargets.map(target => (
                <TouchableOpacity
                  key={target.id}
                  style={styles.transferOption}
                  disabled={isProcessingTransfer}
                  onPress={() =>
                    handlePerformTransfer(target.id === 'unfiled' ? null : target.id)
                  }
                >
                  <View>
                    <Text style={styles.transferOptionLabel}>{target.label}</Text>
                    <Text style={styles.transferOptionMeta}>
                      {target.count} {target.count === 1 ? 'artwork' : 'artworks'}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={withOpacity(palette.primaryText, theme.isDark ? 0.6 : 0.5)}
                  />
                </TouchableOpacity>
              ))}
              {projectTransferTargets.length === 1 && (
                <Text style={styles.transferEmptyText}>
                  Create a project first to start organizing artworks.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.createProjectShortcut}
              onPress={() => {
                closeTransferModal();
                handleCreateProjectShortcut();
              }}
            >
              <Icon name="plus-circle" size={18} color={palette.accent} />
              <Text style={styles.createProjectShortcutText}>Create new project</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                styles.selectionButtonSecondary,
                { alignSelf: 'center', marginTop: spacing.md },
              ]}
              onPress={closeTransferModal}
              disabled={isProcessingTransfer}
            >
              <Text style={[styles.selectionButtonText, styles.selectionButtonSecondaryText]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(projectEditorState)}
        transparent
        animationType="fade"
        onRequestClose={closeProjectEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>
              {projectEditorState?.mode === 'create' ? 'New Project' : 'Edit Project'}
            </Text>
            <TextInput
              value={projectNameInput}
              onChangeText={setProjectNameInput}
              placeholder="Project name"
              placeholderTextColor={withOpacity(
                palette.mutedText,
                theme.isDark ? 0.6 : 0.5,
              )}
              style={styles.renameInput}
              autoFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[styles.renameButton, { marginRight: spacing.sm }]}
                onPress={closeProjectEditor}
              >
                <Text style={styles.renameButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameButton, styles.renameButtonPrimary]}
                onPress={handleSubmitProjectEditor}
              >
                <Text style={[styles.renameButtonText, styles.renameButtonPrimaryText]}>
                  {projectEditorState?.mode === 'create' ? 'Create' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
            {projectEditorState?.mode === 'rename' && (
              <TouchableOpacity
                style={styles.deleteProjectButton}
                onPress={handleProjectDeletionRequest}
              >
                <Text style={styles.deleteProjectButtonText}>Delete project</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

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

const createStyles = (theme: AppTheme, topInset: number, bottomInset: number) => {
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
    projectContext: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    projectContextLabel: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: palette.mutedText,
      marginBottom: 2,
    },
    projectContextName: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.primaryText,
      maxWidth: width * 0.6,
    },
    projectContextCount: {
      fontSize: 14,
      color: palette.mutedText,
    },
    grid: {
      padding: spacing.lg,
    },
    gridWithSelection: {
      paddingBottom: spacing.xxxl + 72,
    },
    selectionBar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: bottomInset + spacing.xxxl,
      borderRadius: 20,
      padding: spacing.md,
      backgroundColor: palette.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: palette.shadow,
      shadowOpacity: theme.isDark ? 0.35 : 0.15,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 10,
    },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    selectionButtonSpacing: {
      marginLeft: spacing.sm,
    },
    selectionButtonSecondary: {
      backgroundColor: withOpacity(palette.primaryText, theme.isDark ? 0.2 : 0.1),
    },
    selectionButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    selectionButtonSecondaryText: {
      color: palette.primaryText,
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
    selectionIndicator: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      zIndex: 3,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: withOpacity(palette.primaryText, theme.isDark ? 0.4 : 0.2),
      backgroundColor: withOpacity(palette.surface, theme.isDark ? 0.6 : 0.8),
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectionIndicatorActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
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
      bottom: bottomInset + spacing.lg,
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
    transferModal: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '80%',
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: palette.surface,
    },
    renameTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.primaryText,
      marginBottom: spacing.md,
    },
    transferTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: palette.primaryText,
      marginBottom: spacing.xs,
    },
    transferSubtitle: {
      fontSize: 14,
      color: palette.mutedText,
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
    transferList: {
      maxHeight: 300,
      marginBottom: spacing.md,
    },
    transferOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    transferOptionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.primaryText,
    },
    transferOptionMeta: {
      fontSize: 12,
      color: palette.mutedText,
      marginTop: 2,
    },
    createProjectShortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    createProjectShortcutText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.accent,
      marginLeft: spacing.xs,
    },
    transferEmptyText: {
      fontSize: 13,
      color: palette.mutedText,
      marginTop: spacing.md,
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
    deleteProjectButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    deleteProjectButtonText: {
      color: palette.danger ?? '#FF5A5F',
      fontWeight: '600',
    },
    createOptionsCard: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      padding: spacing.lg,
      backgroundColor: palette.surface,
    },
    createOptionsTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.primaryText,
      marginBottom: spacing.xs,
    },
    createOptionsSubtitle: {
      fontSize: 14,
      color: palette.mutedText,
      marginBottom: spacing.md,
    },
    createOptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      gap: spacing.sm,
    },
    createOptionTextContainer: {
      flex: 1,
    },
    createOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.primaryText,
    },
    createOptionDescription: {
      fontSize: 13,
      color: palette.mutedText,
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
