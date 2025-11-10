import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const logoScale = useSharedValue(0.2);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    startAnimation();
  }, []);

  const navigateToMain = () => {
    navigation.replace('Main', { screen: 'Gallery' });
  };

  const startAnimation = () => {
    logoOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

    logoScale.value = withSequence(
      withTiming(1.2, { duration: 360, easing: Easing.out(Easing.quad) }),
      withTiming(0.9, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }, finished => {
        if (finished) {
          runOnJS(navigateToMain)();
        }
      }),
    );
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/icons/app.png')}
        style={[styles.logo, logoAnimatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 140,
      height: 140,
      borderRadius: 36,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.45,
      shadowOffset: { width: 0, height: 14 },
      shadowRadius: 28,
      elevation: 12,
    },
  });
