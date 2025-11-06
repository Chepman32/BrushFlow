import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

type AnimatedScreenContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const AnimatedScreenContainer: React.FC<
  AnimatedScreenContainerProps
> = ({ children, style }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useFocusEffect(
    React.useCallback(() => {
      opacity.value = 0;
      translateY.value = 12;

      opacity.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });

      translateY.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });

      return () => {
        opacity.value = 0;
        translateY.value = 12;
      };
    }, [opacity, translateY]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
