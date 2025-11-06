import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { DrawingEngine } from '../engine/DrawingEngine';
import { LayerManager } from '../engine/LayerManager';
import { spacing } from '../theme';
import {
  ToolPanel,
  ColorPickerModal,
  LayersPanel,
  ExportModal,
} from '../components';
import {
  UndoRedoManager,
  HapticManager,
  AutoSaveManager,
  ExportManager,
  FileManager,
} from '../services';
import { Tool, BrushSettings, Layer, Artwork, ExportOptions } from '../types';
import Icon from 'react-native-vector-icons/Feather';
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';

const { width, height } = Dimensions.get('window');

type DrawnStroke = {
  id: string;
  path: SkPath;
  color: string;
  strokeWidth: number;
  opacity: number;
  layerId: string;
  svgPath: string;
};

type CanvasLayer = Layer & {
  strokes: DrawnStroke[];
};

const createStrokeId = () =>
  `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createArtworkId = () =>
  `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type CanvasScreenRouteProp = RouteProp<RootStackParamList, 'Canvas'>;

export const CanvasScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CanvasScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const palette = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Core state
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    opacity: 1,
    color: '#000000',
  });
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: '1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      strokes: [],
      x: 0,
      y: 0,
      width,
      height,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState('1');
  const [currentStroke, setCurrentStroke] = useState<DrawnStroke | null>(null);
  const currentStrokeRef = useRef<DrawnStroke | null>(null);
  const [artworkName, setArtworkName] = useState('Untitled Artwork');
  const artworkIdRef = useRef(route.params?.artworkId || createArtworkId());
  const hasExistingFileRef = useRef<boolean>(Boolean(route.params?.artworkId));
  const [artworkCreatedAt, setArtworkCreatedAt] = useState(new Date());
  const hasSyncedInitialArtworkRef = useRef(false);

  const buildArtworkPayload = (latestLayers?: CanvasLayer[]): Artwork =>
    ({
      id: artworkIdRef.current,
      name: artworkName,
      width,
      height,
      layers: latestLayers ?? layers,
      createdAt: artworkCreatedAt,
      modifiedAt: new Date(),
      backgroundColor: '#FFFFFF' as any,
      thumbnailPath: '' as any,
    } as unknown as Artwork);

  // UI state
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [layersPanelVisible, setLayersPanelVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Managers
  const drawingEngine = useRef(new DrawingEngine()).current;
  const layerManager = useRef(new LayerManager()).current;
  const undoRedoManager = useRef(UndoRedoManager.getInstance()).current;
  const hapticManager = useRef(HapticManager.getInstance()).current;
  const autoSaveManager = useRef(AutoSaveManager.getInstance()).current;
  const exportManager = useRef(ExportManager.getInstance()).current;
  const fileManager = useRef(FileManager.getInstance()).current;

  // Premium status (would come from IAP in real app)
  const [isPremiumUser] = useState(false);

  // Load existing artwork if artworkId is provided
  useEffect(() => {
    const loadExistingArtwork = async () => {
      const artworkId = route.params?.artworkId;
      if (artworkId) {
        try {
          const loadedArtwork = await fileManager.loadArtwork(artworkId);
          setArtworkName(loadedArtwork.name);
          artworkIdRef.current = loadedArtwork.id;
          hasExistingFileRef.current = true;
          setArtworkCreatedAt(loadedArtwork.createdAt);

          // Reconstruct Skia paths from SVG strings
          const reconstructedLayers: CanvasLayer[] = loadedArtwork.layers.map(layer => ({
            ...layer,
            strokes: (layer.strokes || []).map(stroke => ({
              ...stroke,
              path: Skia.Path.MakeFromSVGString(stroke.svgPath) || Skia.Path.Make(),
            })),
          }));

          setLayers(reconstructedLayers);
          if (reconstructedLayers.length > 0) {
            setSelectedLayerId(reconstructedLayers[0].id);
          }
        } catch (error) {
          console.error('Failed to load artwork:', error);
        }
      }
      setIsLoading(false);
    };

    loadExistingArtwork();
  }, [route.params?.artworkId]);

  // Initialize auto-save
  useEffect(() => {
    if (!isLoading) {
      const artwork = buildArtworkPayload();

      autoSaveManager.start(
        artwork,
        success => {
        if (success) {
          console.log('✅ Auto-saved successfully:', artworkIdRef.current);
        } else {
          console.log('❌ Auto-save failed:', artworkIdRef.current);
        }
        },
        { hasExistingFile: hasExistingFileRef.current },
      );

      return () => {
        autoSaveManager.stop();
      };
    }
  }, [isLoading]);

  // Keep AutoSaveManager in sync with latest layers
  useEffect(() => {
    if (!isLoading) {
      const artwork = buildArtworkPayload();
      autoSaveManager.updateArtwork(artwork);

      if (hasSyncedInitialArtworkRef.current) {
        autoSaveManager.markAsModified();
      } else {
        hasSyncedInitialArtworkRef.current = true;
      }

      console.log('📝 Artwork updated in AutoSaveManager, layers:', layers.length);
    }
  }, [layers, artworkName, artworkCreatedAt, isLoading]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isFullscreen) {
          setIsFullscreen(false);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [isFullscreen]),
  );

  useEffect(() => {
    if (isFullscreen) {
      setColorPickerVisible(false);
      setLayersPanelVisible(false);
      setExportModalVisible(false);
    }
  }, [isFullscreen]);

  // Drawing gesture handlers
  const handleDrawStart = (x: number, y: number) => {
    if (selectedTool !== 'brush' && selectedTool !== 'pencil') {
      return;
    }

    const activeLayer = layers.find(layer => layer.id === selectedLayerId);
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      return;
    }

    drawingEngine.startStroke(
      { x, y },
      primaryColor,
      brushSettings.size,
      brushSettings.opacity,
    );

    const path = drawingEngine.getCurrentPath();
    if (path) {
      const strokeId = createStrokeId();
      const newStroke: DrawnStroke = {
        id: strokeId,
        path: path.copy(),
        color: primaryColor,
        strokeWidth: brushSettings.size,
        opacity: brushSettings.opacity,
        layerId: activeLayer.id,
        svgPath: path.toSVGString(),
      };
      currentStrokeRef.current = newStroke;
      setCurrentStroke(newStroke);
    }
  };

  const handleDrawUpdate = (x: number, y: number) => {
    if (!currentStrokeRef.current) {
      return;
    }

    drawingEngine.addStrokePoint({ x, y });
    const path = drawingEngine.getCurrentPath();

    if (path) {
      const updatedStroke: DrawnStroke = {
        ...currentStrokeRef.current,
        path: path.copy(),
        svgPath: path.toSVGString(),
      };
      currentStrokeRef.current = updatedStroke;
      setCurrentStroke(updatedStroke);
    }
  };

  const handleDrawEnd = () => {
    const baseStroke = currentStrokeRef.current;
    const path = drawingEngine.getCurrentPath();

    let completedStroke: DrawnStroke | null = null;
    if (baseStroke && path) {
      completedStroke = {
        ...baseStroke,
        path: path.copy(),
        svgPath: path.toSVGString(),
      };
    } else if (baseStroke) {
      completedStroke = {
        ...baseStroke,
        path: baseStroke.path.copy(),
        svgPath:
          baseStroke.svgPath ||
          (typeof baseStroke.path.toSVGString === 'function'
            ? baseStroke.path.toSVGString()
            : ''),
      };
    }

    drawingEngine.endStroke();

    if (completedStroke) {
      setLayers(prevLayers => {
        const updatedLayers = prevLayers.map(layer =>
          layer.id === completedStroke.layerId
            ? {
                ...layer,
                strokes: [...layer.strokes, completedStroke],
              }
            : layer,
        );
        undoRedoManager.saveState(updatedLayers);
        return updatedLayers;
      });
      autoSaveManager.markAsModified();
      hapticManager.strokeCommit();
    }

    currentStrokeRef.current = null;
    setCurrentStroke(null);
  };

  // Drawing gesture with runOnJS
  const panGesture = Gesture.Pan()
    .onStart(event => {
      runOnJS(handleDrawStart)(event.x, event.y);
    })
    .onUpdate(event => {
      runOnJS(handleDrawUpdate)(event.x, event.y);
    })
    .onEnd(() => {
      runOnJS(handleDrawEnd)();
    });

  // Three-finger gestures for undo/redo
  const threeFingerGesture = Gesture.Pan()
    .minPointers(3)
    .maxPointers(3)
    .onEnd(event => {
      if (event.translationY > 60) {
        handleUndo();
      } else if (event.translationY < -60) {
        handleRedo();
      }
    });

  const handleBack = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }

    if (autoSaveManager.hasUnsavedChanges()) {
      // Show save prompt
      autoSaveManager.forceSave().then(() => {
        navigation.goBack();
      });
    } else {
      navigation.goBack();
    }
  };

  const handleUndo = () => {
    const previousState = undoRedoManager.undo();
    if (previousState) {
      setLayers(previousState as CanvasLayer[]);
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      hapticManager.undoRedo();
    }
  };

  const handleRedo = () => {
    const nextState = undoRedoManager.redo();
    if (nextState) {
      setLayers(nextState as CanvasLayer[]);
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      hapticManager.undoRedo();
    }
  };

  const handleClearCanvas = () => {
    if (!hasArtworkContent) {
      return;
    }

    setLayers(prevLayers => {
      const clearedLayers = prevLayers.map(layer => ({
        ...layer,
        strokes: [],
      }));
      undoRedoManager.saveState(clearedLayers);
      return clearedLayers;
    });

    currentStrokeRef.current = null;
    setCurrentStroke(null);
    drawingEngine.endStroke();
    autoSaveManager.markAsModified();
    hapticManager.buttonPress();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    hapticManager.buttonPress();
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    hapticManager.toolSelection();
  };

  const handleBrushSettingsChange = (settings: Partial<BrushSettings>) => {
    setBrushSettings({ ...brushSettings, ...settings });
  };

  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
    hapticManager.colorSelection();
  };

  const handleColorSelect = (color: string) => {
    setPrimaryColor(color);
    setBrushSettings({ ...brushSettings, color });
    hapticManager.colorSelection();
  };

  // Layer management
  const handleAddLayer = () => {
    if (!isPremiumUser && layers.length >= 3) {
      // Show premium modal
      return;
    }

    const newLayer: CanvasLayer = {
      id: Date.now().toString(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      strokes: [],
      x: 0,
      y: 0,
      width,
      height,
    };

    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, newLayer];
      undoRedoManager.saveState(updatedLayers);
      return updatedLayers;
    });
    setSelectedLayerId(newLayer.id);
    hapticManager.buttonPress();
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length === 1) return; // Keep at least one layer

    const newLayers = layers.filter(l => l.id !== layerId);
    setLayers(newLayers);
    if (selectedLayerId === layerId && newLayers.length > 0) {
      setSelectedLayerId(newLayers[newLayers.length - 1].id);
    }
    undoRedoManager.saveState(newLayers);
    hapticManager.buttonPress();
  };

  const handleDuplicateLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const duplicatedLayer: CanvasLayer = {
      ...layer,
      id: Date.now().toString(),
      name: `${layer.name} Copy`,
      strokes: layer.strokes.map(stroke => ({
        ...stroke,
        id: createStrokeId(),
        path: stroke.path?.copy() || Skia.Path.Make(),
      })),
    };

    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, duplicatedLayer];
      undoRedoManager.saveState(updatedLayers);
      return updatedLayers;
    });
    setSelectedLayerId(duplicatedLayer.id);
    hapticManager.buttonPress();
  };

  const handleLayerReorder = (fromIndex: number, toIndex: number) => {
    const newLayers = [...layers];
    const [removed] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, removed);
    setLayers(newLayers);
    undoRedoManager.saveState(newLayers);
    hapticManager.layerReorder();
  };

  const handleLayerVisibilityToggle = (layerId: string) => {
    const newLayers = layers.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l,
    );
    setLayers(newLayers);
    hapticManager.toggleSwitch();
  };

  const handleLayerLockToggle = (layerId: string) => {
    const newLayers = layers.map(l =>
      l.id === layerId ? { ...l, locked: !l.locked } : l,
    );
    setLayers(newLayers);
    hapticManager.toggleSwitch();
  };

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    const newLayers = layers.map(l =>
      l.id === layerId ? { ...l, opacity } : l,
    );
    setLayers(newLayers);
  };

  const handleLayerBlendModeChange = (layerId: string, blendMode: any) => {
    const newLayers = layers.map(l =>
      l.id === layerId ? { ...l, blendMode } : l,
    );
    setLayers(newLayers);
  };

  // Export
  const handleExport = async (options: ExportOptions) => {
    const exportArtwork: Artwork = {
      ...buildArtworkPayload(),
      name: options.filename || artworkName,
      modifiedAt: new Date(),
    };

    try {
      const filePath = await exportManager.exportArtwork(exportArtwork, options);
      console.log('Exported to:', filePath);

      // Optionally share
      await exportManager.shareArtwork(filePath, options.filename || 'artwork');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const currentStrokeLayerOpacity =
    currentStroke
      ? layers.find(layer => layer.id === currentStroke.layerId)?.opacity ?? 1
      : 1;

  const hasArtworkContent = useMemo(
    () =>
      layers.some(layer => layer.strokes.length > 0) || Boolean(currentStroke),
    [layers, currentStroke],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden={isFullscreen} animated />
      {!isFullscreen ? (
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + spacing.md },
          ]}
        >
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <Icon name="arrow-left" size={24} color={palette.primaryText} />
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleUndo}
              style={styles.iconButton}
              disabled={!undoRedoManager.canUndo()}
            >
              <Icon
                name="rotate-ccw"
                size={24}
                color={
                  undoRedoManager.canUndo()
                    ? palette.primaryText
                    : withOpacity(palette.primaryText, theme.isDark ? 0.35 : 0.25)
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRedo}
              style={styles.iconButton}
              disabled={!undoRedoManager.canRedo()}
            >
              <Icon
                name="rotate-cw"
                size={24}
                color={
                  undoRedoManager.canRedo()
                    ? palette.primaryText
                    : withOpacity(palette.primaryText, theme.isDark ? 0.35 : 0.25)
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearCanvas}
              style={styles.iconButton}
              disabled={!hasArtworkContent}
              accessibilityLabel="Clear canvas"
            >
              <Icon
                name="trash-2"
                size={24}
                color={
                  hasArtworkContent
                    ? palette.primaryText
                    : withOpacity(palette.primaryText, theme.isDark ? 0.35 : 0.25)
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              style={styles.iconButton}
            >
              <Icon name="download" size={24} color={palette.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFullscreen}
              style={styles.iconButton}
              accessibilityLabel="Enter fullscreen"
            >
              <Icon name="maximize" size={24} color={palette.primaryText} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.fullscreenFloating,
            { top: insets.top + spacing.md },
          ]}
        >
          <TouchableOpacity
            onPress={toggleFullscreen}
            style={styles.fullscreenButton}
            accessibilityLabel="Exit fullscreen"
          >
            <Icon name="minimize" size={24} color={palette.primaryText} />
          </TouchableOpacity>
        </View>
      )}

      {/* Canvas */}
      <GestureDetector
        gesture={Gesture.Simultaneous(panGesture, threeFingerGesture)}
      >
        <View style={styles.canvasContainer}>
          <Canvas style={styles.canvas}>
            {/* Render all layers */}
            {layers.map(layer => {
              if (!layer.visible) {
                return null;
              }

              return layer.strokes.map(stroke => {
                if (!stroke.path) return null;
                return (
                  <Path
                    key={stroke.id}
                    path={stroke.path}
                    color={stroke.color}
                    style="stroke"
                    strokeWidth={stroke.strokeWidth}
                    opacity={layer.opacity * stroke.opacity}
                  />
                );
              });
            })}

            {/* Current stroke preview */}
            {currentStroke && (
              <Path
                path={currentStroke.path}
                color={currentStroke.color}
                style="stroke"
                strokeWidth={currentStroke.strokeWidth}
                opacity={currentStrokeLayerOpacity * currentStroke.opacity}
              />
            )}
          </Canvas>
        </View>
      </GestureDetector>

      {/* Tool Panel */}
      {!isFullscreen && (
        <ToolPanel
          selectedTool={selectedTool}
          brushSettings={brushSettings}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onToolSelect={handleToolSelect}
          onBrushSettingsChange={handleBrushSettingsChange}
          onColorPress={() => setColorPickerVisible(true)}
          onSwapColors={handleSwapColors}
          isPremiumUser={isPremiumUser}
        />
      )}

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={primaryColor}
        onColorSelect={handleColorSelect}
        onClose={() => setColorPickerVisible(false)}
      />

      {/* Layers Panel */}
      {layersPanelVisible && !isFullscreen && (
        <LayersPanel
          visible={layersPanelVisible}
          layers={layers}
          selectedLayerId={selectedLayerId}
          onClose={() => setLayersPanelVisible(false)}
          onLayerSelect={setSelectedLayerId}
          onLayerAdd={handleAddLayer}
          onLayerDelete={handleDeleteLayer}
          onLayerDuplicate={handleDuplicateLayer}
          onLayerReorder={handleLayerReorder}
          onLayerVisibilityToggle={handleLayerVisibilityToggle}
          onLayerLockToggle={handleLayerLockToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          onLayerBlendModeChange={handleLayerBlendModeChange}
          isPremiumUser={isPremiumUser}
          maxFreeLayers={3}
        />
      )}

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        isPremiumUser={isPremiumUser}
      />
    </GestureHandlerRootView>
  );
};

const createStyles = (theme: AppTheme) => {
  const palette = theme.colors;
  const topBarBackground = withOpacity(palette.surface, theme.isDark ? 0.9 : 0.94);

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
      paddingBottom: spacing.md,
      backgroundColor: topBarBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    fullscreenFloating: {
      position: 'absolute',
      right: spacing.lg,
      zIndex: 10,
    },
    fullscreenButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: withOpacity(palette.surface, theme.isDark ? 0.88 : 0.9),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: withOpacity(palette.border, theme.isDark ? 0.5 : 0.35),
    },
    canvasContainer: {
      flex: 1,
    },
    canvas: {
      flex: 1,
      backgroundColor: '#FFFFFF',
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
