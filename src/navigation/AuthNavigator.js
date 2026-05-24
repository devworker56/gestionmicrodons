import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RegistrationScreen from '../screens/auth/RegistrationScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  const theme = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.primary,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
    },
    headerBackTitleVisible: false,
    cardStyle: {
      backgroundColor: theme.colors.background,
    },
  };

  return (
    <Stack.Navigator 
      initialRouteName="LanguageSelection"
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="LanguageSelection" 
        component={LanguageSelectionScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      
      <Stack.Screen 
        name="Register" 
        component={RegistrationScreen}
        options={{
          title: 'Registration',
          headerLeft: ({ onPress }) => (
            <MaterialCommunityIcons 
              name="arrow-left"
              size={24}
              color="#FFFFFF"
              style={{ marginLeft: 15 }}
              onPress={onPress}
            />
          ),
        }}
      />
      
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          title: 'Login',
          headerLeft: ({ onPress }) => (
            <MaterialCommunityIcons 
              name="arrow-left"
              size={24}
              color="#FFFFFF"
              style={{ marginLeft: 15 }}
              onPress={onPress}
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
}