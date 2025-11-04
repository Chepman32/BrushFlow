import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: React.ReactNode;
}

interface TutorialCarouselProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const SLIDES: TutorialSlide[] = [
  {
    id: 'welcome',
    title: 'Welcome to BrushFlow',
    description: 'Your mobile canvas for unlimited creativity',
    icon: 'edit-3',
    content: null,
  },
  {
    id: 'gestures',
    title: 'Master the Gestures',
    description: 'Learn intuitive touch controls',
    icon: 'hand',
    content: null,
  },
  {
    id: 'tools',
    title: 'Powerful Tools',
    description: 'Professional tools at your fingertips',
    icon: 'tool',
    content: null,
  },
  {
    id: 'layers',
    title: 'Work with Layers',
    description: 'Create complex artwork with multiple layers',
    icon: 'layers',
    content: null,
  },
  {
    id: 'start',
    title: 'Ready to Create?',
    description: "Let's start your creative journey",
    icon: 'zap',
    content: null,
  },
];

export const TutorialCarousel: React.FC<TutorialCarouselProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX < -100 && currentSlide < SLIDES.length - 1) {
        // Swipe left - next slide
        translateX.value = withSpring(-SCREEN_WIDTH);
        setTimeout(() => {
          setCurrentSlide(currentSlide + 1);
          translateX.value = 0;
        }, 300);
      } else if (event.translationX > 100 && currentSlide > 0) {
        // Swipe right - previous slide
        translateX.value = withSpring(SCREEN_WIDTH);
        setTimeout(() => {
          setCurrentSlide(currentSlide - 1);
          translateX.value = 0;
        }, 300);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [1, 0.5],
      Extrapolate.CLAMP,
    ),
  }));

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      translateX.value = withSpring(-SCREEN_WIDTH);
      setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
        translateX.value = 0;
      }, 300);
    } else {
      onComplete();
    }
  };

  const handleDotPress = (index: number) => {
    setCurrentSlide(index);
  };

  if (!visible) return null;

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.slideContainer, slideStyle]}>
          <View style={styles.iconContainer}>
            <Animated.View style={styles.iconCircle}>
              <Icon name={slide.icon} size={64} color={colors.primary.blue} />
            </Animated.View>
          </View>

          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>

          {/* Slide-specific content */}
          {slide.id === 'gestures' && <GesturesDemo />}
          {slide.id === 'tools' && <ToolsDemo />}
          {slide.id === 'layers' && <LayersDemo />}
        </Animated.View>
      </GestureDetector>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotPress(index)}
            style={[styles.dot, index === currentSlide && styles.dotActive]}
          />
        ))}
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {isLastSlide ? 'Get Started' : 'Next'}
        </Text>
        <Icon
          name={isLastSlide ? 'check' : 'arrow-right'}
          size={20}
          color={colors.text.light}
        />
      </TouchableOpacity>
    </View>
  );
};

const GesturesDemo: React.FC = () => (
  <View style={styles.demoContainer}>
    <View style={styles.gestureItem}>
      <Icon name="edit-3" size={32} color={colors.primary.blue} />
      <Text style={styles.gestureText}>Single finger: Draw</Text>
    </View>
    <View style={styles.gestureItem}>
      <Icon name="move" size={32} color={colors.primary.blue} />
      <Text style={styles.gestureText}>Two fingers: Pan & Zoom</Text>
    </View>
    <View style={styles.gestureItem}>
      <Icon name="rotate-ccw" size={32} color={colors.primary.blue} />
      <Text style={styles.gestureText}>Three fingers down: Undo</Text>
    </View>
    <View style={styles.gestureItem}>
      <Icon name="rotate-cw" size={32} color={colors.primary.blue} />
      <Text style={styles.gestureText}>Three fingers up: Redo</Text>
    </View>
  </View>
);

const ToolsDemo: React.FC = () => (
  <View style={styles.demoContainer}>
    <View style={styles.toolsGrid}>
      <View style={styles.toolItem}>
        <Icon name="edit-3" size={28} color={colors.primary.blue} />
        <Text style={styles.toolText}>Brush</Text>
      </View>
      <View style={styles.toolItem}>
        <Icon name="pen-tool" size={28} color={colors.primary.blue} />
        <Text style={styles.toolText}>Pencil</Text>
      </View>
      <View style={styles.toolItem}>
        <Icon name="delete" size={28} color={colors.primary.blue} />
        <Text style={styles.toolText}>Eraser</Text>
      </View>
      <View style={styles.toolItem}>
        <Icon name="droplet" size={28} color={colors.primary.blue} />
        <Text style={styles.toolText}>Fill</Text>
      </View>
    </View>
  </View>
);

const LayersDemo: React.FC = () => (
  <View style={styles.demoContainer}>
    <View style={styles.layersStack}>
      <View style={[styles.layerCard, { backgroundColor: '#FF6B6B' }]}>
        <Text style={styles.layerText}>Layer 3</Text>
      </View>
      <View style={[styles.layerCard, { backgroundColor: '#4ECDC4' }]}>
        <Text style={styles.layerText}>Layer 2</Text>
      </View>
      <View style={[styles.layerCard, { backgroundColor: '#FFE66D' }]}>
        <Text style={styles.layerText}>Layer 1</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 12,
    zIndex: 10,
  },
  skipButtonText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(102,126,234,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.display,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 40,
  },
  demoContainer: {
    width: '100%',
    marginTop: 20,
  },
  gestureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  gestureText: {
    ...typography.body,
    color: colors.text.light,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  toolItem: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  toolText: {
    ...typography.callout,
    color: colors.text.light,
  },
  layersStack: {
    alignItems: 'center',
    gap: -20,
  },
  layerCard: {
    width: 200,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  layerText: {
    ...typography.body,
    color: colors.text.light,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary.blue,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: colors.primary.blue,
    borderRadius: 24,
    minWidth: 160,
  },
  nextButtonText: {
    ...typography.title,
    color: colors.text.light,
    fontWeight: '600',
  },
});
