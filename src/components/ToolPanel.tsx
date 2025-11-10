import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';
import Icon from 'react-native-vector-icons/Feather';
import { Tool, BrushSettings, BrushType, BlurType } from '../types';
import {
  BRUSH_TYPES,
  BRUSH_TYPE_SEQUENCE,
  type BrushTypeConfig,
} from '../constants/brushTypes';
import {
  BLUR_TYPES,
  BLUR_TYPE_SEQUENCE,
  type BlurTypeConfig,
} from '../constants/blurTypes';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToolPanelProps {
  selectedTool: Tool;
  brushSettings: BrushSettings;
  brushType: BrushType;
  primaryColor: string;
  secondaryColor: string;
  onToolSelect: (tool: Tool) => void;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  onBrushTypeChange: (nextType?: BrushType) => void;
  onBlurTypeChange: (nextType?: BlurType) => void;
  onColorPress: () => void;
  onSwapColors: () => void;
}

const TOOLS: Array<{
  id: Tool;
  icon: string;
  label: string;
  isPremium?: boolean;
}> = [
  { id: 'brush', icon: 'edit-3', label: 'Brush' },
  { id: 'pencil', icon: 'pen-tool', label: 'Pencil' },
  { id: 'eraser', icon: 'delete', label: 'Eraser' },
  { id: 'fill', icon: 'droplet', label: 'Fill' },
  { id: 'eyedropper', icon: 'eye', label: 'Eyedropper' },
  { id: 'selection', icon: 'square', label: 'Selection' },
  { id: 'smudge', icon: 'wind', label: 'Smudge', isPremium: true },
  { id: 'blur', icon: 'circle', label: 'Blur', isPremium: true },
  { id: 'clone', icon: 'copy', label: 'Clone', isPremium: true },
  { id: 'symmetry', icon: 'git-merge', label: 'Symmetry', isPremium: true },
];

const MINIMIZED_HEIGHT = 56;
const EXPANDED_HEIGHT = 600;

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  brushSettings,
  brushType,
  primaryColor,
  secondaryColor,
  onToolSelect,
  onBrushSettingsChange,
  onBrushTypeChange,
  onBlurTypeChange,
  onColorPress,
  onSwapColors,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const toolScrollRef = React.useRef<ScrollView>(null);
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const panelHeight = useSharedValue(MINIMIZED_HEIGHT);

  React.useEffect(() => {
    panelHeight.value = withSpring(
      isExpanded ? EXPANDED_HEIGHT : MINIMIZED_HEIGHT,
      {
        damping: 20,
        stiffness: 300,
        overshootClamping: false,
      },
    );
  }, [isExpanded]);

  // Scroll to selected tool when panel expands
  React.useEffect(() => {
    if (isExpanded && toolScrollRef.current) {
      const selectedIndex = TOOLS.findIndex(tool => tool.id === selectedTool);
      if (selectedIndex > -1) {
        // Each tool button is 64px wide + 12px gap
        const toolWidth = 64 + 12;
        const scrollPosition = selectedIndex * toolWidth;

        setTimeout(() => {
          toolScrollRef.current?.scrollTo({
            x: scrollPosition,
            animated: true,
          });
        }, 100); // Small delay to ensure the panel is expanded
      }
    }
  }, [isExpanded, selectedTool]);

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    transform: [{ translateX: translateX.value }],
  }));

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      panelHeight.value,
      [MINIMIZED_HEIGHT, EXPANDED_HEIGHT],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (isExpanded && event.translationY > 0) {
        translateY.value = event.translationY;
      } else if (!isExpanded && event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(event => {
      if (isExpanded && event.translationY > 40) {
        runOnJS(setIsExpanded)(false);
      } else if (!isExpanded && event.translationY < -30) {
        runOnJS(setIsExpanded)(true);
      }
      translateY.value = withSpring(0);
    });

  const dragGesture = Gesture.Pan()
    .enabled(!isExpanded)
    .onUpdate(event => {
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      const snapPoints = [-SCREEN_WIDTH / 2 + 100, 0, SCREEN_WIDTH / 2 - 100];
      const closest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - translateX.value) < Math.abs(prev - translateX.value)
          ? curr
          : prev,
      );
      translateX.value = withSpring(closest, {
        damping: 20,
        stiffness: 250,
      });
    });

  const currentBrushType = BRUSH_TYPES[brushType];
  const currentBlurType = brushSettings.blurType ?? BLUR_TYPE_SEQUENCE[0];
  const currentBlurConfig = BLUR_TYPES[currentBlurType];
  const bottomOffset = 16 + insets.bottom;

  // Get the currently selected tool info
  const currentToolInfo = TOOLS.find(tool => tool.id === selectedTool);

  // Determine if we should show brush type or tool type
  const isBrushLikeTool = selectedTool === 'brush' || selectedTool === 'pencil';
  const isBlurTool = selectedTool === 'blur';

  const renderBrushIcon = (
    config: BrushTypeConfig,
    size: number,
    color: string,
  ) => {
    if (config.iconImage) {
      return (
        <Image
          source={config.iconImage}
          style={{ width: size, height: size, tintColor: color, resizeMode: 'contain' }}
        />
      );
    }
    return <Icon name={config.icon} size={size} color={color} />;
  };

  const renderBlurIcon = (
    config: BlurTypeConfig,
    size: number,
    color: string,
  ) => {
    return <Icon name={config.icon} size={size} color={color} />;
  };

  return (
    <>
      {isExpanded && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsExpanded(false)}
        />
      )}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, dragGesture)}>
        <Animated.View
          style={[
            styles.container,
            { bottom: bottomOffset },
            panelStyle,
          ]}
        >
        {/* Minimized View */}
        {!isExpanded && (
          <View style={styles.minimizedContent}>
            <TouchableOpacity
              style={styles.brushToggle}
              onPress={() => {
                if (isBrushLikeTool) {
                  onBrushTypeChange();
                } else if (isBlurTool) {
                  onBlurTypeChange();
                } else {
                  setIsExpanded(true);
                }
              }}
              accessibilityLabel={
                isBrushLikeTool
                  ? 'Change brush type'
                  : isBlurTool
                    ? 'Change blur type'
                    : 'Open tool panel'
              }
            >
              {isBrushLikeTool ? (
                <>
                  {renderBrushIcon(currentBrushType, 20, theme.colors.primaryText)}
                  <Text style={styles.brushToggleLabel}>
                    {currentBrushType.label}
                  </Text>
                </>
              ) : isBlurTool ? (
                <>
                  {renderBlurIcon(currentBlurConfig, 20, theme.colors.primaryText)}
                  <Text style={styles.brushToggleLabel}>
                    {currentBlurConfig.label}
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name={currentToolInfo?.icon || 'edit-3'}
                    size={20}
                    color={theme.colors.primaryText}
                  />
                  <Text style={styles.brushToggleLabel}>
                    {currentToolInfo?.label || 'Tool'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.minimizedMain}
              onPress={() => setIsExpanded(true)}
              activeOpacity={0.9}
            >
              <View style={styles.colorPreview}>
                <View
                  style={[styles.colorCircle, { backgroundColor: primaryColor }]}
                />
              </View>
              <Text style={styles.brushSizeText}>{brushSettings.size}px</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.expandedContent,
              { paddingBottom: bottomOffset },
              contentOpacity,
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Tool Selector */}
            <ScrollView
              ref={toolScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsContainer}
            >
              {TOOLS.map(tool => {
                const isSelected = selectedTool === tool.id;

                return (
                  <View key={tool.id} style={styles.toolContainer}>
                    <TouchableOpacity
                      style={[
                        styles.toolButton,
                        isSelected && styles.toolButtonSelected,
                      ]}
                      onPress={() => {
                        onToolSelect(tool.id);
                        setIsExpanded(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={tool.icon}
                        size={28}
                        color={
                          isSelected ? theme.colors.primaryText : withOpacity(theme.colors.primaryText, 0.6)
                        }
                      />
                      {tool.isPremium && (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.toolLabel}>{tool.label}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Brush Type Selector */}
            {isBrushLikeTool && (
              <View style={styles.brushTypeContainer}>
                <View style={styles.brushTypeHeader}>
                  <Text style={styles.settingLabel}>Brush Type</Text>
                  <Text style={styles.brushTypeValue}>
                    {currentBrushType.label}
                  </Text>
                </View>
                <View style={styles.brushTypeChips}>
                  {BRUSH_TYPE_SEQUENCE.map(typeId => {
                    const config = BRUSH_TYPES[typeId];
                    const isSelected = typeId === brushType;
                    return (
                      <TouchableOpacity
                        key={typeId}
                        style={[
                          styles.brushChip,
                          isSelected && styles.brushChipSelected,
                        ]}
                        onPress={() => onBrushTypeChange(typeId)}
                        activeOpacity={0.8}
                      >
                        {renderBrushIcon(
                          config,
                          18,
                          isSelected
                            ? theme.isDark
                              ? theme.colors.primaryText
                              : theme.colors.background
                            : theme.colors.primaryText,
                        )}
                        <Text
                          style={[
                            styles.brushChipLabel,
                            isSelected && styles.brushChipLabelSelected,
                          ]}
                        >
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.brushHint}>{currentBrushType.description}</Text>
              </View>
            )}

            {/* Blur Type Selector */}
            {isBlurTool && (
              <View style={styles.brushTypeContainer}>
                <View style={styles.brushTypeHeader}>
                  <Text style={styles.settingLabel}>Blur Type</Text>
                  <Text style={styles.brushTypeValue}>
                    {currentBlurConfig.label}
                  </Text>
                </View>
                <View style={styles.brushTypeChips}>
                  {BLUR_TYPE_SEQUENCE.map(typeId => {
                    const config = BLUR_TYPES[typeId];
                    const isSelected = typeId === currentBlurType;
                    return (
                      <TouchableOpacity
                        key={typeId}
                        style={[
                          styles.brushChip,
                          isSelected && styles.brushChipSelected,
                        ]}
                        onPress={() => onBlurTypeChange(typeId)}
                        activeOpacity={0.8}
                      >
                        {renderBlurIcon(
                          config,
                          18,
                          isSelected
                            ? theme.isDark
                              ? theme.colors.primaryText
                              : theme.colors.background
                            : theme.colors.primaryText,
                        )}
                        <Text
                          style={[
                            styles.brushChipLabel,
                            isSelected && styles.brushChipLabelSelected,
                          ]}
                        >
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.brushHint}>{currentBlurConfig.description}</Text>
              </View>
            )}

            {/* Brush Settings */}
            <View style={styles.settingsContainer}>
              {/* Brush Size */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>
                  Size: {brushSettings.size}px
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={200}
                  value={brushSettings.size}
                  onValueChange={value =>
                    onBrushSettingsChange({ size: Math.round(value) })
                  }
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={withOpacity(theme.colors.primaryText, 0.2)}
                  thumbTintColor={theme.colors.primaryText}
                />
              </View>

              {/* Opacity */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>
                  Opacity: {Math.round(brushSettings.opacity * 100)}%
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={brushSettings.opacity}
                  onValueChange={value =>
                    onBrushSettingsChange({ opacity: value })
                  }
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={withOpacity(theme.colors.primaryText, 0.2)}
                  thumbTintColor={theme.colors.primaryText}
                />
              </View>

              {/* Color Selector */}
              <View style={styles.colorRow}>
                <TouchableOpacity
                  style={styles.brushPreview}
                  onPress={onColorPress}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.brushPreviewCircle,
                      {
                        width: Math.min(brushSettings.size, 60),
                        height: Math.min(brushSettings.size, 60),
                        backgroundColor: primaryColor,
                        opacity: brushSettings.opacity,
                      },
                    ]}
                  />
                </TouchableOpacity>

                <View style={styles.colorSelector}>
                  <TouchableOpacity
                    style={styles.colorSquares}
                    onPress={onSwapColors}
                  >
                    <View
                      style={[
                        styles.colorSquare,
                        styles.colorSquareSecondary,
                        { backgroundColor: secondaryColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.colorSquare,
                        styles.colorSquarePrimary,
                        { backgroundColor: primaryColor },
                      ]}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.colorPickerButton}
                    onPress={onColorPress}
                  >
                    <Icon name="droplet" size={20} color={theme.colors.primaryText} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const withOpacity = (color: string, opacity: number) => {
  // Simple helper to add opacity to hex colors
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    maxWidth: 600,
    backgroundColor: withOpacity(theme.colors.card, 0.95),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.border, 0.5),
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.5 : 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 2,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Tiny alpha to ensure it captures touches while appearing transparent
    backgroundColor: 'rgba(0,0,0,0.001)',
    zIndex: 1,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MINIMIZED_HEIGHT,
    paddingHorizontal: 24,
    gap: 16,
  },
  brushToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.12),
    minWidth: 120,
    justifyContent: 'center',
  },
  brushToggleLabel: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  minimizedMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: withOpacity(theme.colors.primaryText, 0.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  brushSizeText: {
    fontSize: typography.fontSize.body,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  expandedContent: {
    flex: 1,
    padding: 16,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.3),
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  toolsContainer: {
    paddingHorizontal: 8,
    gap: 12,
    marginBottom: 16,
    marginTop: 12,
  },
  toolContainer: {
    alignItems: 'center',
    gap: 6,
  },
  toolButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonSelected: {
    backgroundColor: theme.colors.accent,
  },
  toolLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    opacity: 0.7,
    textAlign: 'center',
  },
  brushTypeContainer: {
    marginBottom: 16,
    gap: 8,
  },
  brushTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brushTypeValue: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.secondaryText,
    opacity: 0.75,
  },
  brushTypeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brushChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.primaryText, 0.2),
  },
  brushChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  brushChipLabel: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  brushChipLabelSelected: {
    color: theme.isDark ? theme.colors.primaryText : theme.colors.background,
  },
  brushHint: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.secondaryText,
    opacity: 0.6,
  },
  proBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.premium.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 10,
    color: colors.text.dark,
    fontWeight: '700',
  },
  settingsContainer: {
    gap: 12,
  },
  settingRow: {
    gap: 8,
  },
  settingLabel: {
    fontSize: typography.fontSize.callout,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  brushPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  brushPreviewCircle: {
    borderRadius: 100,
  },
  colorSelector: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  colorSquares: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  colorSquare: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: withOpacity(theme.colors.primaryText, 0.3),
  },
  colorSquareSecondary: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  colorSquarePrimary: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  colorPickerButton: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.1),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
