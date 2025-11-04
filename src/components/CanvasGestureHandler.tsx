import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureProcessor } from '../services/GestureProcessor';

interface CanvasGestureHandlerProps {
  children: React.ReactNode;
  onPinch?: (scale: number, focalX: number, focalY: number) => void;
  onPan?: (translateX: number, translateY: number) => void;
  onRotate?: (rotation: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleFullScreen?: () => void;
  onEyedropper?: (x: number, y: number) => void;
}

export const CanvasGestureHandler: React.FC<CanvasGestureHandlerProps> = ({
  children,
  onPinch,
  onPan,
  onRotate,
  onUndo,
  onRedo,
  onToggleFullScreen,
  onEyedropper,
}) => {
  const gestureProcessor = GestureProcessor.getInstance();

  // Shared values for transforms
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      const newScale = gestureProcessor.calculatePinchScale(
        event.scale,
        1,
        savedScale.value,
      );
      scale.value = newScale;

      if (onPinch) {
        runOnJS(onPinch)(newScale, event.focalX, event.focalY);
      }
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture (two fingers)
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onUpdate(event => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;

      if (onPan) {
        runOnJS(onPan)(translateX.value, translateY.value);
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onUpdate(event => {
      const newRotation = gestureProcessor.calculateRotation(
        savedRotation.value + (event.rotation * 180) / Math.PI,
      );
      rotation.value = newRotation;

      if (onRotate) {
        runOnJS(onRotate)(newRotation);
      }
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // Three-finger swipe down (undo)
  const threeFingerSwipeDown = Gesture.Pan()
    .minPointers(3)
    .maxPointers(3)
    .onEnd(event => {
      if (event.translationY > 60 && Math.abs(event.velocityY) > 500) {
        if (onUndo) {
          runOnJS(onUndo)();
        }
      }
    });

  // Three-finger swipe up (redo)
  const threeFingerSwipeUp = Gesture.Pan()
    .minPointers(3)
    .maxPointers(3)
    .onEnd(event => {
      if (event.translationY < -60 && Math.abs(event.velocityY) > 500) {
        if (onRedo) {
          runOnJS(onRedo)();
        }
      }
    });

  // Three-finger tap (toggle full screen)
  const threeFingerTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(100)
    .onEnd(() => {
      if (onToggleFullScreen) {
        runOnJS(onToggleFullScreen)();
      }
    });

  // Two-finger long press (eyedropper)
  const twoFingerLongPress = Gesture.LongPress()
    .minPointers(2)
    .maxPointers(2)
    .minDuration(300)
    .onStart(event => {
      if (onEyedropper) {
        runOnJS(onEyedropper)(event.x, event.y);
      }
    });

  // Compose gestures
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, rotationGesture),
    threeFingerSwipeDown,
    threeFingerSwipeUp,
    threeFingerTap,
    twoFingerLongPress,
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
