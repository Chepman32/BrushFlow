import React, { useMemo } from 'react';
import {
  NavigationContainer,
  Theme as NavigationTheme,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SplashScreen } from '../screens/SplashScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import { CanvasScreen } from '../screens/CanvasScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TrashScreen } from '../screens/TrashScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { AboutScreen } from '../screens/AboutScreen';
import type { RootStackParamList, DrawerParamList } from './types';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../i18n';

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerNavigator = () => {
  const { theme } = useSettings();
  const { locale } = useTranslation();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: theme.colors.accent,
        drawerInactiveTintColor: theme.colors.secondaryText,
        drawerLabelStyle: {
          fontSize: 16,
        },
        sceneContainerStyle: {
          backgroundColor: theme.colors.background,
        },
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: '80%',
        },
      }}
    >
      <Drawer.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          title: locale.navigation.gallery,
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: locale.navigation.settings,
        }}
      />
      <Drawer.Screen
        name="Trash"
        component={TrashScreen}
        options={{
          title: locale.navigation.trash,
        }}
      />
      <Drawer.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          title: locale.navigation.premium,
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: locale.navigation.about,
        }}
      />
    </Drawer.Navigator>
  );
};

export const RootNavigator = () => {
  const { theme } = useSettings();

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme.isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.primaryText,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen
          name="Canvas"
          component={CanvasScreen}
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
