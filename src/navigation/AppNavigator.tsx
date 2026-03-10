import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, BookOpen, ShoppingBasket } from 'lucide-react-native';
import DashboardScreen from '../screens/DashboardScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MyRecipesScreen from '../screens/MyRecipesScreen';
import PantryScreen from '../screens/PantryScreen';
import { colors } from '../theme/colors';

const Tab = createMaterialTopTabNavigator();

const ICON_SIZE = 22;

const AppNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarPressColor: 'transparent',
        tabBarIndicatorStyle: {
          backgroundColor: colors.tabActive,
          height: 3,
          borderRadius: 2,
          position: 'absolute',
          top: 0,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          height: 60 + bottomPadding,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'none',
          marginTop: -2,
        },
        tabBarIconStyle: {
          width: ICON_SIZE,
          height: ICON_SIZE,
        },
      }}
    >
      <Tab.Screen
        name="Início"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Home size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Descubra"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color }) => <Compass size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Receitas"
        component={MyRecipesScreen}
        options={{
          tabBarIcon: ({ color }) => <BookOpen size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Despensa"
        component={PantryScreen}
        options={{
          tabBarIcon: ({ color }) => <ShoppingBasket size={ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
