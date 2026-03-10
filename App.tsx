import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { UserRecipesProvider } from './src/contexts/UserRecipesContext';
import { FavoritesProvider } from './src/contexts/FavoritesContext';
import { UserProfileProvider } from './src/contexts/UserProfileContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <UserProfileProvider>
            <UserRecipesProvider>
              <FavoritesProvider>
                <StatusBar style="dark" />
                <AppNavigator />
              </FavoritesProvider>
            </UserRecipesProvider>
          </UserProfileProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
