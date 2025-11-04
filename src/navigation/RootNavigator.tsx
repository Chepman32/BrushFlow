import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SplashScreen } from '../screens/SplashScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import { CanvasScreen } from '../screens/CanvasScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { RootStackParamList, DrawerParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#1A1F3A',
          width: '80%',
        },
      }}
    >
      <Drawer.Screen name="Gallery" component={GalleryScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="Canvas" component={CanvasScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
