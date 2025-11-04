import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Canvas,
  Circle,
  LinearGradient,
  vec,
  Rect,
} from '@shopify/react-native-skia';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WHEEL_SIZE = 280;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

// Helper functions for color conversion
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

const rgbToHsv = (
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  let h = 0;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, v };
};

const hsvToRgb = (
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } => {
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return { r: r * 255, g: g * 255, b: b * 255 };
};

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  initialColor,
  onColorSelect,
  onClose,
}) => {
  const rgb = hexToRgb(initialColor);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hue, setHue] = useState(hsv.h);
  const [saturation, setSaturation] = useState(hsv.s);
  const [value, setValue] = useState(hsv.v);
  const [hexInput, setHexInput] = useState(initialColor);

  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(MODAL_HEIGHT);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const getCurrentColor = () => {
    const rgb = hsvToRgb(hue, saturation, value);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };

  const handleHexChange = (text: string) => {
    setHexInput(text);
    if (/^#[0-9A-F]{6}$/i.test(text)) {
      const rgb = hexToRgb(text);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setValue(hsv.v);
    }
  };

  const handleConfirm = () => {
    onColorSelect(getCurrentColor());
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(event => {
      if (event.translationY > 100 || event.velocityY > 500) {
        translateY.value = withSpring(MODAL_HEIGHT);
        backdropOpacity.value = withTiming(0);
        setTimeout(onClose, 300);
      } else {
        translateY.value = withSpring(0);
      }
    });

  if (!visible) return null;

  const currentColor = getCurrentColor();
  const currentRgb = hsvToRgb(hue, saturation, value);

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
          <Animated.View style={[styles.modal, modalStyle]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Select Color</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="x" size={24} color={colors.text.dark} />
              </TouchableOpacity>
            </View>

            {/* Color Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[styles.colorPreview, { backgroundColor: currentColor }]}
              />
            </View>

            {/* HSV Sliders */}
            <View style={styles.slidersContainer}>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Hue</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={360}
                  value={hue}
                  onValueChange={setHue}
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(0,0,0,0.1)"
                />
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Saturation</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={saturation}
                  onValueChange={setSaturation}
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(0,0,0,0.1)"
                />
              </View>

              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>Brightness</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={value}
                  onValueChange={setValue}
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(0,0,0,0.1)"
                />
              </View>
            </View>

            {/* RGB Values */}
            <View style={styles.rgbContainer}>
              <View style={styles.rgbRow}>
                <Text style={styles.rgbLabel}>
                  R: {Math.round(currentRgb.r)}
                </Text>
                <Text style={styles.rgbLabel}>
                  G: {Math.round(currentRgb.g)}
                </Text>
                <Text style={styles.rgbLabel}>
                  B: {Math.round(currentRgb.b)}
                </Text>
              </View>
            </View>

            {/* Hex Input */}
            <View style={styles.hexContainer}>
              <Text style={styles.hexLabel}>Hex:</Text>
              <TextInput
                style={styles.hexInput}
                value={hexInput}
                onChangeText={handleHexChange}
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Select Color</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    height: MODAL_HEIGHT,
    backgroundColor: colors.background.light,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...typography.headline,
    color: colors.text.dark,
  },
  closeButton: {
    padding: 8,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  slidersContainer: {
    gap: 16,
    marginBottom: 24,
  },
  sliderRow: {
    gap: 8,
  },
  sliderLabel: {
    ...typography.callout,
    color: colors.text.dark,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rgbContainer: {
    marginBottom: 16,
  },
  rgbRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rgbLabel: {
    ...typography.body,
    color: colors.text.dark,
    fontWeight: '600',
  },
  hexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  hexLabel: {
    ...typography.body,
    color: colors.text.dark,
    fontWeight: '600',
  },
  hexInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.text.dark,
  },
  confirmButton: {
    height: 56,
    backgroundColor: colors.primary.blue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    ...typography.title,
    color: colors.text.light,
    fontWeight: '600',
  },
});
