import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  BackHandler,
  Alert,
  PanResponder,
} from 'react-native';
import { Canvas, Path, Skia, DashPathEffect, StrokeCap, StrokeJoin, Group } from '@shopify/react-native-skia';
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
  SelectionSnapshot,
} from '../services';
import {
  Tool,
  BrushSettings,
  BrushType,
  Layer,
  Artwork,
  ExportOptions,
} from '../types';
import Icon from 'react-native-vector-icons/Feather';
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';
import { BRUSH_TYPES, getNextBrushType } from '../constants/brushTypes';

const { width: viewportWidth, height: viewportHeight } = Dimensions.get('window');
const DEFAULT_ARTWORK_RESOLUTION = { width: 720, height: 1440 };

type DrawnStroke = {
  id: string;
  path: SkPath;
  color: string;
  strokeWidth: number;
  opacity: number;
  layerId: string;
  svgPath: string;
  brushType: BrushType;
  strokeCap: 'butt' | 'round' | 'square';
  strokeJoin: 'miter' | 'round' | 'bevel';
  isEraser?: boolean;
  blendMode?: 'clear' | 'normal';
  isFilled?: boolean;
  clipPath?: SkPath;
  clipPathSvg?: string;
};

type CanvasLayer = Layer & {
  strokes: DrawnStroke[];
};

const mapStrokeCapToEnum = (
  cap?: DrawnStroke['strokeCap'],
): StrokeCap | undefined => {
  switch (cap) {
    case 'butt':
      return StrokeCap.Butt;
    case 'round':
      return StrokeCap.Round;
    case 'square':
      return StrokeCap.Square;
    default:
      return undefined;
  }
};

const mapStrokeJoinToEnum = (
  join?: DrawnStroke['strokeJoin'],
): StrokeJoin | undefined => {
  switch (join) {
    case 'miter':
      return StrokeJoin.Miter;
    case 'round':
      return StrokeJoin.Round;
    case 'bevel':
      return StrokeJoin.Bevel;
    default:
      return undefined;
  }
};

const createStrokeId = () =>
  `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createArtworkId = () =>
  `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const findStrokeById = (
  layers: CanvasLayer[],
  strokeId: string,
): DrawnStroke | null => {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    for (let j = 0; j < layer.strokes.length; j++) {
      const stroke = layer.strokes[j];
      if (stroke.id === strokeId) {
        return stroke;
      }
    }
  }
  return null;
};

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
  const [artworkResolution, setArtworkResolution] = useState({
    width: DEFAULT_ARTWORK_RESOLUTION.width,
    height: DEFAULT_ARTWORK_RESOLUTION.height,
  });
  const [artworkViewport, setArtworkViewport] = useState({
    width: viewportWidth,
    height: viewportHeight,
  });
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    opacity: 1,
    color: '#000000',
    tool: 'brush',
    smoothing: 0,
    pressureSensitivity: true,
    brushType: 'pen',
  });
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const initialLayers: CanvasLayer[] = [
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
      width: DEFAULT_ARTWORK_RESOLUTION.width,
      height: DEFAULT_ARTWORK_RESOLUTION.height,
    },
  ];
  const [layers, setLayers] = useState<CanvasLayer[]>(initialLayers);
  const layersRef = useRef<CanvasLayer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState('1');
  const [currentStroke, setCurrentStroke] = useState<DrawnStroke | null>(null);
  const currentStrokeRef = useRef<DrawnStroke | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const selectionStartRef = useRef<{x: number; y: number} | null>(null);
  const [selectedStroke, setSelectedStroke] = useState<DrawnStroke | null>(null);
  const [artworkName, setArtworkName] = useState('Untitled Artwork');
  const [artworkProjectId, setArtworkProjectId] = useState<string | null>(
    route.params?.projectId ?? null,
  );
  const artworkIdRef = useRef(route.params?.artworkId || createArtworkId());
  const hasExistingFileRef = useRef<boolean>(Boolean(route.params?.artworkId));
  const [artworkCreatedAt, setArtworkCreatedAt] = useState(new Date());
  const hasSyncedInitialArtworkRef = useRef(false);
  const hasInitializedUndoRef = useRef(false);

  const buildArtworkPayload = (latestLayers?: CanvasLayer[]): Artwork =>
    ({
      id: artworkIdRef.current,
      name: artworkName,
      projectId: artworkProjectId,
      width: artworkResolution.width,
      height: artworkResolution.height,
      viewportWidth: artworkViewport.width,
      viewportHeight: artworkViewport.height,
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
  const currentBrushConfig = useMemo(
    () => BRUSH_TYPES[brushSettings.brushType],
    [brushSettings.brushType],
  );
  const getSelectionSnapshot = React.useCallback((): SelectionSnapshot => ({
    rect: selectionRect ? { ...selectionRect } : null,
    strokeId: selectedStroke?.id ?? null,
  }), [selectionRect, selectedStroke]);

  const applySelectionSnapshot = React.useCallback((
    snapshot?: SelectionSnapshot | null,
    sourceLayers?: CanvasLayer[],
  ) => {
    if (!snapshot) {
      setSelectionRect(null);
      setSelectedStroke(null);
      return;
    }

    setSelectionRect(snapshot.rect ? { ...snapshot.rect } : null);

    if (snapshot.strokeId && snapshot.rect) {
      const layersToUse = sourceLayers ?? layersRef.current;
      const stroke = findStrokeById(layersToUse, snapshot.strokeId);
      setSelectedStroke(stroke ?? null);
    } else {
      setSelectedStroke(null);
    }
  }, [layersRef]);

  const pushCanvasHistory = React.useCallback((updatedLayers: CanvasLayer[], snapshot?: SelectionSnapshot) => {
    undoRedoManager.saveState(updatedLayers, snapshot ?? getSelectionSnapshot());
  }, [getSelectionSnapshot, undoRedoManager]);
  const selectionMaskPath = useMemo(() => {
    if (!selectedStroke?.path) {
      return null;
    }

    const selectionPath = selectedStroke.path.copy();

    if (selectedStroke.isFilled) {
      selectionPath.simplify();
      return selectionPath;
    }

    const strokeWidth = Math.max(selectedStroke.strokeWidth ?? 1.5, 1.5);
    const cap = mapStrokeCapToEnum(selectedStroke.strokeCap);
    const join = mapStrokeJoinToEnum(selectedStroke.strokeJoin);

    const strokeOptions: { width: number; cap?: StrokeCap; join?: StrokeJoin } = {
      width: strokeWidth,
    };

    if (cap !== undefined) {
      strokeOptions.cap = cap;
    }
    if (join !== undefined) {
      strokeOptions.join = join;
    }

    const strokedPath = selectionPath.stroke(strokeOptions);
    if (strokedPath) {
      // Simplify merged contours so we only trace the outer perimeter
      strokedPath.simplify();
      return strokedPath;
    }

    return selectionPath;
  }, [selectedStroke]);

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
          setArtworkProjectId(loadedArtwork.projectId ?? null);
          artworkIdRef.current = loadedArtwork.id;
          hasExistingFileRef.current = true;
          setArtworkCreatedAt(loadedArtwork.createdAt);
          setArtworkResolution({
            width: loadedArtwork.width || DEFAULT_ARTWORK_RESOLUTION.width,
            height: loadedArtwork.height || DEFAULT_ARTWORK_RESOLUTION.height,
          });
          setArtworkViewport({
            width: loadedArtwork.viewportWidth ?? viewportWidth,
            height: loadedArtwork.viewportHeight ?? viewportHeight,
          });

          // Reconstruct Skia paths from SVG strings
          const reconstructedLayers: CanvasLayer[] = loadedArtwork.layers.map(layer => ({
            ...layer,
            strokes: (layer.strokes || []).map(stroke => {
              const brushType: BrushType = stroke.brushType ?? 'pen';
              const config = BRUSH_TYPES[brushType];
              const clipPath = stroke.clipPathSvg
                ? Skia.Path.MakeFromSVGString(stroke.clipPathSvg) || undefined
                : undefined;

              return {
                ...stroke,
                brushType,
                strokeCap: stroke.strokeCap ?? config.strokeCap,
                strokeJoin: stroke.strokeJoin ?? config.strokeJoin,
                path: Skia.Path.MakeFromSVGString(stroke.svgPath) || Skia.Path.Make(),
                clipPath,
              };
            }),
          }));

          setLayers(reconstructedLayers);
          if (reconstructedLayers.length > 0) {
            setSelectedLayerId(reconstructedLayers[0].id);
          }
          hasInitializedUndoRef.current = false;
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

  useEffect(() => {
    layersRef.current = layers;
    if (!hasInitializedUndoRef.current && layers.length > 0) {
      undoRedoManager.initialize(layers, getSelectionSnapshot());
      hasInitializedUndoRef.current = true;
    }
  }, [layers, undoRedoManager, getSelectionSnapshot]);

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

  // Helper function to check if point is within selection
  const isPointInSelection = React.useCallback((x: number, y: number): boolean => {
    if (!selectionRect || selectionRect.width === 0 || selectionRect.height === 0) {
      return true; // No selection means all points are valid
    }

    // If an object is selected, use its actual geometry as the mask
    if (selectionMaskPath) {
      return selectionMaskPath.contains(x, y);
    }

    // Fallback to bounding box checks for rectangular selections
    return (
      x >= selectionRect.x &&
      x <= selectionRect.x + selectionRect.width &&
      y >= selectionRect.y &&
      y <= selectionRect.y + selectionRect.height
    );
  }, [selectionRect, selectionMaskPath]);

  // Helper function to sample color from strokes at a point
  const sampleColorAtPoint = React.useCallback((x: number, y: number): string | null => {
    // Iterate through layers from top to bottom
    const visibleLayers = layersRef.current.filter(layer => layer.visible);

    for (let i = visibleLayers.length - 1; i >= 0; i--) {
      const layer = visibleLayers[i];
      // Check strokes from newest to oldest
      for (let j = layer.strokes.length - 1; j >= 0; j--) {
        const stroke = layer.strokes[j];

        // Skip eraser strokes
        if (stroke.isEraser) continue;

        // Check if the point is near the stroke path
        if (stroke.path) {
          const distance = 10; // Sample within 10 pixels of stroke
          const bounds = stroke.path.getBounds();

          // Quick bounds check first
          if (x >= bounds.x - distance && x <= bounds.x + bounds.width + distance &&
              y >= bounds.y - distance && y <= bounds.y + bounds.height + distance) {
            // Found a stroke near this point, return its color
            return stroke.color;
          }
        }
      }
    }

    // No stroke found, return canvas background color
    return '#FFFFFF';
  }, []);

  // Drawing gesture handlers
  const handleDrawStart = React.useCallback((x: number, y: number) => {
    console.log('🎨 Draw start:', x, y, 'tool:', selectedTool);

    // Handle tool-specific actions
    switch (selectedTool) {
      case 'eyedropper':
        // Check if point is within selection area
        if (!isPointInSelection(x, y)) {
          console.log('⚠️ Eyedropper point outside selection area');
          hapticManager.buttonPress();
          return;
        }

        // Sample color at the tapped point
        const sampledColor = sampleColorAtPoint(x, y);
        if (sampledColor) {
          console.log('🎨 Eyedropper sampled color:', sampledColor);
          setPrimaryColor(sampledColor);
          setBrushSettings(prev => ({ ...prev, color: sampledColor }));
          hapticManager.colorSelection();
        }
        return;

      case 'fill':
        // Check if point is within selection area
        if (!isPointInSelection(x, y)) {
          console.log('⚠️ Fill point outside selection area');
          hapticManager.buttonPress();
          return;
        }

        // Fill tool - find stroke at tapped point and change its color
        console.log('🎨 Fill tool selected at:', x, y);

        // Find the stroke to fill
        let foundStroke: DrawnStroke | null = null;
        let foundLayerId: string | null = null;

        // Search through visible layers from top to bottom
        const visibleLayers = layersRef.current.filter(layer => layer.visible);
        for (let i = visibleLayers.length - 1; i >= 0; i--) {
          const layer = visibleLayers[i];

          // Check strokes from newest to oldest
          for (let j = layer.strokes.length - 1; j >= 0; j--) {
            const stroke = layer.strokes[j];

            // Skip eraser strokes
            if (stroke.isEraser) continue;

            // Check if point is near the stroke
            if (stroke.path) {
              const distance = 15; // Sample within 15 pixels of stroke
              const bounds = stroke.path.getBounds();

              if (x >= bounds.x - distance && x <= bounds.x + bounds.width + distance &&
                  y >= bounds.y - distance && y <= bounds.y + bounds.height + distance) {
                foundStroke = stroke;
                foundLayerId = layer.id;
                break;
              }
            }
          }

          if (foundStroke) break;
        }

        if (foundStroke && foundLayerId) {
          console.log('🎨 Filling stroke:', foundStroke.id, 'with color:', primaryColor);

          // Update the stroke color
          setLayers(prevLayers => {
            const updatedLayers = prevLayers.map(layer =>
              layer.id === foundLayerId
                ? {
                    ...layer,
                    strokes: layer.strokes.map(stroke =>
                      stroke.id === foundStroke!.id
                        ? { ...stroke, color: primaryColor } as DrawnStroke
                        : stroke
                    ),
                  }
                : layer,
            );
            pushCanvasHistory(updatedLayers);
            return updatedLayers;
          });

          autoSaveManager.markAsModified();
          hapticManager.strokeCommit();
        } else {
          console.log('⚠️ No stroke found to fill at:', x, y);
          hapticManager.buttonPress();
        }
        return;

      case 'selection':
        // Start selection rectangle
        console.log('🎨 Selection tool started at:', x, y);
        selectionStartRef.current = { x, y };
        setSelectionRect({ x, y, width: 0, height: 0 });
        setSelectedStroke(null); // Clear previous object selection
        hapticManager.toolSelection();
        return;

      case 'smudge':
      case 'blur':
      case 'clone':
        // Premium tools not yet implemented
        console.log('⚠️ Premium tool not yet implemented:', selectedTool);
        return;

      case 'symmetry':
        // Symmetry affects brush drawing
        console.log('⚠️ Symmetry mode not yet implemented');
        return;

      case 'brush':
      case 'pencil':
      case 'eraser':
        // These tools use the path drawing system
        break;

      default:
        console.log('⚠️ Unknown tool:', selectedTool);
        return;
    }

    // Check if point is within selection area
    if (!isPointInSelection(x, y)) {
      console.log('⚠️ Point outside selection area');
      return;
    }

    // Check layer permissions for drawing tools
    const activeLayer = layersRef.current.find(layer => layer.id === selectedLayerId);
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      console.log('⚠️ Layer issue - locked/invisible/missing');
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      return;
    }

    const strokeWidth = Math.max(
      1,
      brushSettings.size * currentBrushConfig.sizeMultiplier,
    );
    const strokeOpacity = Math.min(
      1,
      brushSettings.opacity * currentBrushConfig.opacityMultiplier,
    );

    // For eraser, use background color or transparent color
    const strokeColor = selectedTool === 'eraser'
      ? 'rgba(255, 255, 255, 0)' // Transparent for eraser
      : primaryColor;

    drawingEngine.startStroke({ x, y }, strokeColor, strokeWidth, strokeOpacity);

    const path = drawingEngine.getCurrentPath();
    console.log('📍 Path created:', path ? 'YES' : 'NO');
    if (path) {
      const strokeId = createStrokeId();
      const basePath = path.copy();
      const newStroke: DrawnStroke = {
        id: strokeId,
        path: basePath,
        color: strokeColor,
        strokeWidth,
        opacity: selectedTool === 'eraser' ? 1.0 : strokeOpacity,
        layerId: activeLayer.id,
        svgPath: path.toSVGString(),
        brushType: brushSettings.brushType,
        strokeCap: currentBrushConfig.strokeCap,
        strokeJoin: currentBrushConfig.strokeJoin,
        isEraser: selectedTool === 'eraser',
        blendMode: selectedTool === 'eraser' ? 'clear' : undefined,
      };
      console.log('✅ Stroke created:', strokeId, 'width:', strokeWidth, 'color:', strokeColor);
      currentStrokeRef.current = newStroke;
      setCurrentStroke({
        ...newStroke,
        path: basePath.copy(),
        svgPath: basePath.toSVGString(),
      });
    }
  }, [selectedTool, selectedLayerId, brushSettings.size, brushSettings.opacity, brushSettings.brushType, currentBrushConfig, drawingEngine, primaryColor, hapticManager, sampleColorAtPoint, undoRedoManager, autoSaveManager, isPointInSelection]);

  const handleDrawUpdate = React.useCallback((x: number, y: number) => {
    // Handle selection tool drag
    if (selectedTool === 'selection' && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const width = x - start.x;
      const height = y - start.y;
      setSelectionRect({
        x: width < 0 ? x : start.x,
        y: height < 0 ? y : start.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
      return;
    }

    if (!currentStrokeRef.current) {
      return;
    }

    // Only add points that are within the selection area
    if (!isPointInSelection(x, y)) {
      return;
    }

    drawingEngine.addStrokePoint({ x, y });
    const path = drawingEngine.getCurrentPath();

    if (path) {
      const baseStroke = currentStrokeRef.current;
      if (!baseStroke) {
        return;
      }

      const rawPath = path.copy();
      const updatedStroke: DrawnStroke = {
        ...baseStroke,
        path: rawPath,
        svgPath: rawPath.toSVGString(),
      };
      currentStrokeRef.current = updatedStroke;
      setCurrentStroke({
        ...updatedStroke,
        path: rawPath.copy(),
        svgPath: rawPath.toSVGString(),
      });
    }
  }, [drawingEngine, selectedTool, isPointInSelection]);

  const handleDrawEnd = React.useCallback(() => {
    // Handle selection tool end
    if (selectedTool === 'selection' && selectionStartRef.current) {
      console.log('🎨 Selection completed:', selectionRect);
      let selectionHistoryRecorded = false;

      // If selection is too small (just a tap), try to select object at tap point
      if (selectionRect && selectionRect.width < 5 && selectionRect.height < 5) {
        console.log('🎨 Tap detected, searching for object to select');

        const tapX = selectionStartRef.current.x;
        const tapY = selectionStartRef.current.y;

        // Find stroke at tap point
        let foundStroke: DrawnStroke | null = null;
        const visibleLayers = layersRef.current.filter(layer => layer.visible);

        for (let i = visibleLayers.length - 1; i >= 0; i--) {
          const layer = visibleLayers[i];
          for (let j = layer.strokes.length - 1; j >= 0; j--) {
            const stroke = layer.strokes[j];
            if (stroke.isEraser) continue;

            if (stroke.path) {
              const distance = 15;
              const bounds = stroke.path.getBounds();

              if (tapX >= bounds.x - distance && tapX <= bounds.x + bounds.width + distance &&
                  tapY >= bounds.y - distance && tapY <= bounds.y + bounds.height + distance) {
                foundStroke = stroke;
                break;
              }
            }
          }
          if (foundStroke) break;
        }

        if (foundStroke && foundStroke.path) {
          // Select the object - store the entire stroke for rendering
          const bounds = foundStroke.path.computeTightBounds();
          const padding = Math.max(foundStroke.strokeWidth / 2, 5); // cover full painted area

          // Store the actual stroke for rendering with dashed border
          setSelectedStroke(foundStroke);

          const selectionBounds = {
            x: bounds.x - padding,
            y: bounds.y - padding,
            width: bounds.width + padding * 2,
            height: bounds.height + padding * 2,
          };

          setSelectionRect(selectionBounds);
          console.log('🎨 Selected object with bounds:', bounds);
          hapticManager.strokeCommit();

          const snapshot: SelectionSnapshot = {
            rect: selectionBounds,
            strokeId: foundStroke.id,
          };
          pushCanvasHistory(layersRef.current, snapshot);
          selectionHistoryRecorded = true;
        } else {
          // No object found, clear selection
          console.log('🎨 No object found, clearing selection');
          setSelectionRect(null);
          setSelectedStroke(null);
          hapticManager.buttonPress();
          pushCanvasHistory(layersRef.current, {
            rect: null,
            strokeId: null,
          });
          selectionHistoryRecorded = true;
        }
      }

      selectionStartRef.current = null;
      if (!selectionHistoryRecorded) {
        pushCanvasHistory(layersRef.current, getSelectionSnapshot());
      }
      // Keep the selection rect visible for now
      // In a full implementation, this would allow transforming the selected area
      return;
    }

    const baseStroke = currentStrokeRef.current;
    const path = drawingEngine.getCurrentPath();

    let completedStroke: DrawnStroke | null = null;
    if (baseStroke && path) {
      const rawPath = path.copy();
      completedStroke = {
        ...baseStroke,
        path: rawPath,
        svgPath: rawPath.toSVGString(),
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
      if (selectionMaskPath) {
        const clipPathSvg = selectionMaskPath.toSVGString();
        completedStroke = {
          ...completedStroke,
          clipPath: selectionMaskPath.copy(),
          clipPathSvg,
        };
      }

      const strokeToAdd = completedStroke; // Capture non-null value for closure
      setLayers(prevLayers => {
        const updatedLayers = prevLayers.map(layer =>
          layer.id === strokeToAdd.layerId
            ? {
                ...layer,
                strokes: [...layer.strokes, strokeToAdd],
              }
            : layer,
        );
        pushCanvasHistory(updatedLayers);
        return updatedLayers;
      });
      autoSaveManager.markAsModified();
      hapticManager.strokeCommit();
    }

    currentStrokeRef.current = null;
    setCurrentStroke(null);
  }, [drawingEngine, undoRedoManager, autoSaveManager, hapticManager, selectedTool, selectionRect, pushCanvasHistory, getSelectionSnapshot, selectionMaskPath]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: evt =>
          evt.nativeEvent.touches.length === 1,
        onMoveShouldSetPanResponder: evt =>
          evt.nativeEvent.touches.length === 1,
        onPanResponderGrant: evt => {
          const { locationX, locationY } = evt.nativeEvent;
          handleDrawStart(locationX, locationY);
        },
        onPanResponderMove: evt => {
          const { locationX, locationY } = evt.nativeEvent;
          handleDrawUpdate(locationX, locationY);
        },
        onPanResponderRelease: () => {
          handleDrawEnd();
        },
        onPanResponderTerminate: () => {
          handleDrawEnd();
        },
      }),
    [handleDrawStart, handleDrawUpdate, handleDrawEnd],
  );

  // Three-finger gestures for undo/redo
  const threeFingerGesture = Gesture.Pan()
    .minPointers(3)
    .maxPointers(3)
    .onEnd(event => {
      if (event.translationY > 60) {
        runOnJS(handleUndo)();
      } else if (event.translationY < -60) {
        runOnJS(handleRedo)();
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
      const restoredLayers = previousState.layers as CanvasLayer[];
      setLayers(restoredLayers);
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      applySelectionSnapshot(previousState.selection, restoredLayers);
      hapticManager.undoRedo();
    }
  };

  const handleRedo = () => {
    const nextState = undoRedoManager.redo();
    if (nextState) {
      const restoredLayers = nextState.layers as CanvasLayer[];
      setLayers(restoredLayers);
      currentStrokeRef.current = null;
      setCurrentStroke(null);
      applySelectionSnapshot(nextState.selection, restoredLayers);
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
      pushCanvasHistory(clearedLayers);
      return clearedLayers;
    });

    currentStrokeRef.current = null;
    setCurrentStroke(null);
    drawingEngine.endStroke();
    autoSaveManager.markAsModified();
    hapticManager.buttonPress();
  };

  const handleClearSelectionState = React.useCallback(() => {
    if (!selectionRect && !selectedStroke) {
      return;
    }
    setSelectionRect(null);
    setSelectedStroke(null);
    pushCanvasHistory(layersRef.current, { rect: null, strokeId: null });
    hapticManager.buttonPress();
  }, [selectionRect, selectedStroke, pushCanvasHistory, hapticManager, layersRef]);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    hapticManager.buttonPress();
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    // Keep selection when switching tools (don't clear it)
    // Selection will constrain other tools to work only within selected area
    hapticManager.toolSelection();
  };

  const handleBrushSettingsChange = (settings: Partial<BrushSettings>) => {
    setBrushSettings(prev => ({ ...prev, ...settings }));
  };

  const handleBrushTypeChange = (nextType?: BrushType) => {
    setBrushSettings(prev => ({
      ...prev,
      brushType: nextType ?? getNextBrushType(prev.brushType),
    }));
    hapticManager.toolSelection();
  };

  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
    hapticManager.colorSelection();
  };

  const handleColorSelect = (color: string) => {
    setPrimaryColor(color);
    setBrushSettings(prev => ({ ...prev, color }));
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
      width: artworkResolution.width,
      height: artworkResolution.height,
    };

    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, newLayer];
      pushCanvasHistory(updatedLayers);
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
    pushCanvasHistory(newLayers);
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
        clipPath: stroke.clipPath?.copy(),
        brushType: stroke.brushType || 'pen',
        strokeCap: stroke.strokeCap || 'round',
        strokeJoin: stroke.strokeJoin || 'round',
      })),
    };

    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, duplicatedLayer];
      pushCanvasHistory(updatedLayers);
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
    pushCanvasHistory(newLayers);
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

  const handleSaveToGallery = async (options: ExportOptions) => {
    const exportArtwork: Artwork = {
      ...buildArtworkPayload(),
      name: options.filename || artworkName,
      modifiedAt: new Date(),
    };

    try {
      const filePath = await exportManager.exportArtwork(exportArtwork, options);
      console.log('Exported to:', filePath);

      // Save to gallery
      await exportManager.saveToGallery(filePath);

      // Show success message
      Alert.alert('Success', 'Artwork saved to gallery successfully!');
      hapticManager.exportComplete();
    } catch (error) {
      console.error('Save to gallery failed:', error);
      Alert.alert('Error', 'Failed to save artwork to gallery. Please try again.');
      hapticManager.exportFailed();
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
  const hasSelection = Boolean(selectionRect || selectedStroke);

  return (
    <GestureDetector gesture={threeFingerGesture}>
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
              onPress={handleClearSelectionState}
              style={styles.iconButton}
              disabled={!hasSelection}
              accessibilityLabel="Clear selection"
            >
              {(() => {
                const selectionIconColor = hasSelection
                  ? palette.primaryText
                  : withOpacity(palette.primaryText, theme.isDark ? 0.35 : 0.25);
                return (
                  <View
                    style={[
                      styles.selectionClearIcon,
                      { borderColor: selectionIconColor },
                    ]}
                  >
                    <Icon
                      name="x"
                      size={14}
                      color={selectionIconColor}
                    />
                  </View>
                );
              })()}
            </TouchableOpacity>
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
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <Canvas style={styles.canvas}>
          {/* Render all layers */}
          {(() => {
            const allStrokes = layers.flatMap(layer => {
              if (!layer.visible) return [];
              return layer.strokes.map(stroke => ({ ...stroke, layerOpacity: layer.opacity }));
            });
            console.log('🖼️ Rendering strokes:', allStrokes.length);

            return allStrokes.map(stroke => {
              if (!stroke.path) {
                console.log('⚠️ Stroke missing path:', stroke.id);
                return null;
              }

              // Eraser strokes use clear blend mode
              const isEraserStroke = stroke.isEraser || stroke.blendMode === 'clear';
              const isFilled = stroke.isFilled;

              const pathElement = (
                <Path
                  path={stroke.path}
                  color={isEraserStroke ? '#FFFFFF' : stroke.color}
                  style={isFilled ? "fill" : "stroke"}
                  strokeWidth={isFilled ? undefined : stroke.strokeWidth}
                  opacity={stroke.layerOpacity * stroke.opacity}
                  strokeCap={isFilled ? undefined : (stroke.strokeCap || 'round')}
                  strokeJoin={isFilled ? undefined : (stroke.strokeJoin || 'round')}
                  blendMode={isEraserStroke ? 'clear' : undefined}
                />
              );

              if (stroke.clipPath) {
                return (
                  <Group key={`${stroke.id}-clip`} clip={stroke.clipPath}>
                    {pathElement}
                  </Group>
                );
              }

              return React.cloneElement(pathElement, { key: stroke.id });
            });
          })()}

          {/* Current stroke preview */}
          {currentStroke && (() => {
            const isCurrentEraser = currentStroke.isEraser || currentStroke.blendMode === 'clear';

            const strokeElement = (
              <Path
                path={currentStroke.path}
                color={isCurrentEraser ? '#FFFFFF' : currentStroke.color}
                style="stroke"
                strokeWidth={currentStroke.strokeWidth}
                opacity={currentStrokeLayerOpacity * currentStroke.opacity}
                strokeCap={currentStroke.strokeCap || 'round'}
                strokeJoin={currentStroke.strokeJoin || 'round'}
                blendMode={isCurrentEraser ? 'clear' : undefined}
              />
            );

            if (selectionMaskPath) {
              return (
                <Group clip={selectionMaskPath}>
                  {strokeElement}
                </Group>
              );
            }

            return strokeElement;
          })()}

          {/* Selection visualization */}
          {selectionRect && selectionRect.width > 0 && selectionRect.height > 0 && (() => {
            // If we have a selected stroke, render a dashed border around its perimeter
            if (selectedStroke && (selectionMaskPath || selectedStroke.path)) {
              const selectionPath = (selectionMaskPath ?? selectedStroke.path).copy();
              const borderWidth = selectedStroke.isFilled ? 1.5 : 2;

              return (
                <Path
                  path={selectionPath}
                  color="#4A90E2"
                  style="stroke"
                  strokeWidth={borderWidth}
                  opacity={1}
                  strokeCap="round"
                  strokeJoin="round"
                >
                  <DashPathEffect intervals={[8, 6]} />
                </Path>
              );
            }

            // Otherwise render rectangle selection (for drag selections)
            const selectionPath = Skia.Path.Make();
            selectionPath.addRect({
              x: selectionRect.x,
              y: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            });

            return (
              <>
                {/* Semi-transparent fill to show selected area */}
                <Path
                  path={selectionPath}
                  color="#4A90E2"
                  style="fill"
                  opacity={0.1}
                />
                {/* Border stroke with dash effect */}
                <Path
                  path={selectionPath}
                  color="#4A90E2"
                  style="stroke"
                  strokeWidth={2}
                  opacity={0.8}
                >
                  <DashPathEffect intervals={[10, 5]} />
                </Path>
              </>
            );
          })()}
        </Canvas>
      </View>

      {/* Tool Panel */}
      {!isFullscreen && (
        <ToolPanel
          selectedTool={selectedTool}
          brushSettings={brushSettings}
          brushType={brushSettings.brushType}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onToolSelect={handleToolSelect}
          onBrushSettingsChange={handleBrushSettingsChange}
          onBrushTypeChange={handleBrushTypeChange}
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
        onSaveToGallery={handleSaveToGallery}
        isPremiumUser={isPremiumUser}
        artworkWidth={artworkResolution.width}
        artworkHeight={artworkResolution.height}
      />
    </GestureHandlerRootView>
  </GestureDetector>
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
    selectionClearIcon: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
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
