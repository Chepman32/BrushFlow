/**
 * BrushFlow - Professional Digital Painting App
 * @format
 */

import React from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';

const AppContent = () => {
  const { theme, isReady } = useSettings();

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.colors.statusBar} />
      <RootNavigator />
    </>
  );
};

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

export default App;
