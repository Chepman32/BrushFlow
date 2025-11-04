import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DrawingEngine } from '../engine/DrawingEngine';
import { LayerManager } from '../engine/LayerManager';
import { ToolController } from '../engine/ToolController';
import { colors, spacing } from '../theme';
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
} from '../services';
import { Tool, BrushSettings, Layer, Artwork, ExportOptions } from '../types';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

export const CanvasScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Core state
  const [paths, setPaths] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    opacity: 1,
    color: '#000000',
  });
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      strokes: [],
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState('1');

  // UI state
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [layersPanelVisible, setLayersPanelVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Managers
  const drawingEngine = useRef(new DrawingEngine()).current;
  const layerManager = useRef(new LayerManager()).current;
  const toolController = useRef(new ToolController()).current;
  const undoRedoManager = useRef(UndoRedoManager.getInstance()).current;
  const hapticManager = useRef(HapticManager.getInstance()).current;
  const autoSaveManager = useRef(AutoSaveManager.getInstance()).current;
  const exportManager = useRef(ExportManager.getInstance()).current;

  // Premium status (would come from IAP in real app)
  const [isPremiumUser] = useState(false);

  // Initialize auto-save
  useEffect(() => {
    const artwork: Artwork = {
      id: route.params?.artworkId || Date.now().toString(),
      name: 'Untitled Artwork',
      width: width,
      height: height,
      layers,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    autoSaveManager.start(artwork, success => {
      setIsAutoSaving(false);
      if (success) {
        console.log('Auto-saved successfully');
      }
    });

    return () => {
      autoSaveManager.stop();
    };
  }, []);

  // Drawing gesture handlers
  const handleDrawStart = (x: number, y: number) => {
    if (selectedTool === 'brush' || selectedTool === 'pencil') {
      drawingEngine.startStroke(
        { x, y },
        primaryColor,
        brushSettings.size,
        brushSettings.opacity,
      );
    }
  };

  const handleDrawUpdate = (x: number, y: number) => {
    if (selectedTool === 'brush' || selectedTool === 'pencil') {
      drawingEngine.addStrokePoint({ x, y });
      setPaths([...paths]);
    }
  };

  const handleDrawEnd = () => {
    if (selectedTool === 'brush' || selectedTool === 'pencil') {
      const stroke = drawingEngine.endStroke();
      if (stroke) {
        setPaths([...paths, drawingEngine.getCurrentPath()]);
        undoRedoManager.saveState(layers);
        autoSaveManager.markAsModified();
        hapticManager.strokeCommit();
      }
    }
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
      setLayers(previousState);
      hapticManager.undoRedo();
    }
  };

  const handleRedo = () => {
    const nextState = undoRedoManager.redo();
    if (nextState) {
      setLayers(nextState);
      hapticManager.undoRedo();
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    toolController.setActiveTool(tool);
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

    const newLayer: Layer = {
      id: Date.now().toString(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      strokes: [],
    };

    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
    undoRedoManager.saveState([...layers, newLayer]);
    hapticManager.buttonPress();
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length === 1) return; // Keep at least one layer

    const newLayers = layers.filter(l => l.id !== layerId);
    setLayers(newLayers);
    if (selectedLayerId === layerId) {
      setSelectedLayerId(newLayers[0].id);
    }
    undoRedoManager.saveState(newLayers);
    hapticManager.buttonPress();
  };

  const handleDuplicateLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const duplicatedLayer: Layer = {
      ...layer,
      id: Date.now().toString(),
      name: `${layer.name} Copy`,
    };

    setLayers([...layers, duplicatedLayer]);
    undoRedoManager.saveState([...layers, duplicatedLayer]);
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
    const artwork: Artwork = {
      id: route.params?.artworkId || Date.now().toString(),
      name: options.filename || 'Untitled Artwork',
      width: width,
      height: height,
      layers,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    try {
      const filePath = await exportManager.exportArtwork(artwork, options);
      console.log('Exported to:', filePath);

      // Optionally share
      await exportManager.shareArtwork(filePath, options.filename || 'artwork');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
          <Icon name="arrow-left" size={24} color={colors.text.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Untitled Artwork</Text>
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
                undoRedoManager.canUndo() ? colors.text.dark : 'rgba(0,0,0,0.3)'
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
                undoRedoManager.canRedo() ? colors.text.dark : 'rgba(0,0,0,0.3)'
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLayersPanelVisible(true)}
            style={styles.iconButton}
          >
            <Icon name="layers" size={24} color={colors.text.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExportModalVisible(true)}
            style={styles.iconButton}
          >
            <Icon name="download" size={24} color={colors.text.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Auto-save indicator */}
      {isAutoSaving && (
        <View style={styles.autoSaveIndicator}>
          <Text style={styles.autoSaveText}>Saving...</Text>
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
              if (!layer.visible) return null;

              return paths.map(
                (path, index) =>
                  path && (
                    <Path
                      key={`${layer.id}-${index}`}
                      path={path}
                      color={primaryColor}
                      style="stroke"
                      strokeWidth={brushSettings.size}
                      opacity={layer.opacity * brushSettings.opacity}
                    />
                  ),
              );
            })}

            {/* Current stroke preview */}
            {drawingEngine.getCurrentPath() && (
              <Path
                path={drawingEngine.getCurrentPath()!}
                color={primaryColor}
                style="stroke"
                strokeWidth={brushSettings.size}
                opacity={brushSettings.opacity * 0.7}
              />
            )}
          </Canvas>
        </View>
      </GestureDetector>

      {/* Tool Panel */}
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

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={primaryColor}
        onColorSelect={handleColorSelect}
        onClose={() => setColorPickerVisible(false)}
      />

      {/* Layers Panel */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
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
    color: colors.text.dark,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  autoSaveIndicator: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 100,
  },
  autoSaveText: {
    color: colors.text.light,
    fontSize: 12,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
