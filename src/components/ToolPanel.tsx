import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';
import { Tool, BrushSettings } from '../types';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToolPanelProps {
  selectedTool: Tool;
  brushSettings: BrushSettings;
  primaryColor: string;
  secondaryColor: string;
  onToolSelect: (tool: Tool) => void;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  onColorPress: () => void;
  onSwapColors: () => void;
  isPremiumUser: boolean;
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
const EXPANDED_HEIGHT = 320;

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  brushSettings,
  primaryColor,
  secondaryColor,
  onToolSelect,
  onBrushSettingsChange,
  onColorPress,
  onSwapColors,
  isPremiumUser,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

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

  const selectedToolData = TOOLS.find(t => t.id === selectedTool);

  return (
    <GestureDetector gesture={Gesture.Simultaneous(panGesture, dragGesture)}>
      <Animated.View style={[styles.container, panelStyle]}>
        {/* Minimized View */}
        {!isExpanded && (
          <TouchableOpacity
            style={styles.minimizedContent}
            onPress={() => setIsExpanded(true)}
            activeOpacity={0.9}
          >
            <Icon
              name={selectedToolData?.icon || 'edit-3'}
              size={24}
              color={colors.text.light}
            />
            <View style={styles.colorPreview}>
              <View
                style={[styles.colorCircle, { backgroundColor: primaryColor }]}
              />
            </View>
            <Text style={styles.brushSizeText}>{brushSettings.size}px</Text>
          </TouchableOpacity>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <Animated.View style={[styles.expandedContent, contentOpacity]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Tool Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsContainer}
            >
              {TOOLS.map(tool => {
                const isLocked = tool.isPremium && !isPremiumUser;
                const isSelected = selectedTool === tool.id;

                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[
                      styles.toolButton,
                      isSelected && styles.toolButtonSelected,
                    ]}
                    onPress={() => !isLocked && onToolSelect(tool.id)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={tool.icon}
                      size={28}
                      color={
                        isSelected ? colors.text.light : 'rgba(255,255,255,0.6)'
                      }
                    />
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <Icon name="lock" size={12} color={colors.text.light} />
                      </View>
                    )}
                    {tool.isPremium && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={colors.text.light}
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
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={colors.text.light}
                />
              </View>

              {/* Color Selector */}
              <View style={styles.colorRow}>
                <View style={styles.brushPreview}>
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
                </View>

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
                    <Icon name="droplet" size={20} color={colors.text.light} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    maxWidth: 600,
    backgroundColor: 'rgba(20,20,40,0.95)',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MINIMIZED_HEIGHT,
    paddingHorizontal: 24,
    gap: 16,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  brushSizeText: {
    ...typography.body,
    color: colors.text.light,
    fontWeight: '600',
  },
  expandedContent: {
    flex: 1,
    padding: 16,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  toolsContainer: {
    paddingHorizontal: 8,
    gap: 12,
    marginBottom: 16,
  },
  toolButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonSelected: {
    backgroundColor: colors.primary.blue,
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
    ...typography.caption,
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
    ...typography.callout,
    color: colors.text.light,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    borderColor: 'rgba(255,255,255,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
