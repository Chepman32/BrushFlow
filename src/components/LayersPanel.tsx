import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Layer, BlendMode } from '../types';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = 320;

interface LayersPanelProps {
  visible: boolean;
  layers: Layer[];
  selectedLayerId: string;
  onClose: () => void;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerBlendModeChange: (layerId: string, blendMode: BlendMode) => void;
  isPremiumUser: boolean;
  maxFreeLayers: number;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  visible,
  layers,
  selectedLayerId,
  onClose,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerDuplicate,
  onLayerReorder,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  isPremiumUser,
  maxFreeLayers,
}) => {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(PANEL_WIDTH);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateX.value = withSpring(PANEL_WIDTH);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd(event => {
      if (event.translationX > 100 || event.velocityX > 500) {
        translateX.value = withSpring(PANEL_WIDTH);
        backdropOpacity.value = withTiming(0);
        setTimeout(onClose, 300);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const canAddLayer = isPremiumUser || layers.length < maxFreeLayers;

  const handleAddLayer = () => {
    if (canAddLayer) {
      onLayerAdd();
    } else {
      // Show premium upsell
      alert('Upgrade to Premium for unlimited layers!');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableOpacity>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.panel,
              panelStyle,
              { paddingTop: Math.max(insets.top, 12) },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Layers</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleAddLayer}
                >
                  <Icon name="plus" size={24} color={colors.text.light} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                  <Icon name="x" size={24} color={colors.text.light} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Layer List */}
            <ScrollView style={styles.layerList}>
              {[...layers].reverse().map((layer, index) => {
                const isSelected = layer.id === selectedLayerId;
                const actualIndex = layers.length - 1 - index;

                return (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={isSelected}
                    onSelect={() => onLayerSelect(layer.id)}
                    onVisibilityToggle={() => onLayerVisibilityToggle(layer.id)}
                    onLockToggle={() => onLayerLockToggle(layer.id)}
                    onDelete={() => onLayerDelete(layer.id)}
                    onDuplicate={() => onLayerDuplicate(layer.id)}
                    onOpacityChange={opacity =>
                      onLayerOpacityChange(layer.id, opacity)
                    }
                  />
                );
              })}
            </ScrollView>

            {/* Layer Limit Info */}
            {!isPremiumUser && (
              <View style={styles.limitInfo}>
                <Text style={styles.limitText}>
                  {layers.length}/{maxFreeLayers} layers (Free)
                </Text>
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpacityChange: (opacity: number) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onVisibilityToggle,
  onLockToggle,
  onDelete,
  onDuplicate,
  onOpacityChange,
}) => {
  const [showOpacity, setShowOpacity] = React.useState(false);

  return (
    <View>
      <TouchableOpacity
        style={[styles.layerItem, isSelected && styles.layerItemSelected]}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          {layer.thumbnail ? (
            <Image source={{ uri: layer.thumbnail }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Icon name="image" size={24} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>

        {/* Layer Info */}
        <View style={styles.layerInfo}>
          <Text style={styles.layerName} numberOfLines={1}>
            {layer.name}
          </Text>
          <Text style={styles.layerStats}>
            {layer.blendMode} • {Math.round(layer.opacity * 100)}%
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.layerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onVisibilityToggle}
          >
            <Icon
              name={layer.visible ? 'eye' : 'eye-off'}
              size={20}
              color={colors.text.light}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onLockToggle}>
            <Icon
              name={layer.locked ? 'lock' : 'unlock'}
              size={20}
              color={colors.text.light}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowOpacity(!showOpacity)}
          >
            <Icon name="more-vertical" size={20} color={colors.text.light} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Opacity Slider */}
      {isSelected && showOpacity && (
        <View style={styles.opacityContainer}>
          <Text style={styles.opacityLabel}>
            Opacity: {Math.round(layer.opacity * 100)}%
          </Text>
          <Slider
            style={styles.opacitySlider}
            minimumValue={0}
            maximumValue={1}
            value={layer.opacity}
            onValueChange={onOpacityChange}
            minimumTrackTintColor={colors.primary.blue}
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor={colors.text.light}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: 'rgba(20,20,40,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    ...typography.headline,
    color: colors.text.light,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerList: {
    flex: 1,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  layerItemSelected: {
    backgroundColor: 'rgba(102,126,234,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.blue,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerInfo: {
    flex: 1,
    gap: 4,
  },
  layerName: {
    ...typography.body,
    color: colors.text.light,
    fontWeight: '600',
  },
  layerStats: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
  },
  layerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  opacityContainer: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 8,
  },
  opacityLabel: {
    ...typography.callout,
    color: colors.text.light,
    fontWeight: '600',
  },
  opacitySlider: {
    width: '100%',
    height: 40,
  },
  limitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  limitText: {
    ...typography.callout,
    color: 'rgba(255,255,255,0.6)',
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.premium.gold,
    borderRadius: 16,
  },
  upgradeButtonText: {
    ...typography.callout,
    color: colors.text.dark,
    fontWeight: '700',
  },
});
