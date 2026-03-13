import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { UserRecipesProvider } from './src/contexts/UserRecipesContext';
import { FavoritesProvider } from './src/contexts/FavoritesContext';
import { UserProfileProvider } from './src/contexts/UserProfileContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <UserProfileProvider>
        <UserRecipesProvider>
          <FavoritesProvider>
            <AppNavigator />
          </FavoritesProvider>
        </UserRecipesProvider>
      </UserProfileProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
