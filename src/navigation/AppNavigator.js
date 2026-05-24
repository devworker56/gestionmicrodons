import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { AuthContext } from '../contexts/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import CharitySelectionScreen from '../screens/main/CharitySelectionScreen';

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}