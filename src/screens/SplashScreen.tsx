import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 200;
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

type NavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Animation values
  const logoScale = useSharedValue(0.8);
  const logoRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    startAnimation();
  }, []);

  const startAnimation = () => {
    // Phase 2: Logo solidification (1.2-1.8s)
    logoScale.value = withDelay(
      1200,
      withSpring(1.0, {
        damping: 15,
        stiffness: 180,
        mass: 1,
      }),
    );

    logoRotation.value = withDelay(
      1200,
      withSequence(
        withTiming(3, { duration: 200 }),
        withTiming(-3, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ),
    );

    // Phase 3: Text reveal (1.8-2.4s)
    textOpacity.value = withDelay(
      1800,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );

    // Phase 4: Transition out (2.4-2.8s)
    screenOpacity.value = withDelay(
      2400,
      withTiming(0, { duration: 400 }, () => {
        runOnJS(navigateToMain)();
      }),
    );
  };

  const navigateToMain = () => {
    navigation.replace('Main', { screen: 'Gallery' });
  };

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: logoScale.value },
        { rotate: `${logoRotation.value}deg` },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: (1 - textOpacity.value) * 20 }],
    };
  });

  const screenAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <Canvas style={styles.canvas}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#0A0E27', '#1A1F3A']}
        />
        <Group>
          {Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
            const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
            const radius = 150;
            const targetX = CENTER_X + Math.cos(angle) * (radius * 0.3);
            const targetY = CENTER_Y + Math.sin(angle) * (radius * 0.3);

            return (
              <Circle
                key={index}
                cx={targetX}
                cy={targetY}
                r={2}
                color="#667EEA"
                opacity={0.6}
              />
            );
          })}
        </Group>
      </Canvas>

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logo} />
        </Animated.View>

        <Animated.Text style={[styles.text, textAnimatedStyle]}>
          BrushFlow
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  canvas: {
    position: 'absolute',
    width,
    height,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#667EEA',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
