// App.js - Main Entry Point for GestionMicroDons Mobile App
// Add this in App.js on app startup to clear old cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { VoucherProvider } from './src/contexts/VoucherContext'; // Changed from VoucherLedgerProvider

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';

// Import error boundary
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Import loading screen
import LoadingScreen from './src/components/common/LoadingScreen';

// Initialize i18n
import './src/i18n';
// Clear old cache on app start
AsyncStorage.removeItem('cached_charities').then(() => {
  console.log('🧹 Cleared old charity cache');
});

// 1. Setup Material Design 3 Theme with EXACT web portal colors
const GestionMicroDonsTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Your exact web portal CSS colors
    primary: '#1e3a8a',           // primary-blue from CSS
    primaryContainer: '#1e40af',  // primary-dark from CSS
    secondary: '#0d9488',         // secondary-teal from CSS
    tertiary: '#10b981',          // accent-green from CSS
    surface: '#FFFFFF',
    background: '#f9fafb',        // gray-50 from CSS
    error: '#ef4444',             // danger-red from CSS
    outline: '#e5e7eb',           // gray-200 from CSS
    surfaceVariant: '#f3f4f6',    // gray-100 from CSS
    onSurface: '#1f2937',         // gray-800 from CSS
    onSurfaceVariant: '#6b7280',  // gray-500 from CSS
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    // Additional colors from your CSS
    warning: '#f59e0b',           // warning-orange
    info: '#3b82f6',              // primary-light
    success: '#10b981',           // accent-green
  },
  roundness: 12, // Match your CSS border-radius: 0.75rem = 12px
};

// 2. Adapt Navigation Theme to match Paper Theme with web portal colors
const { LightTheme: AdaptedNavigationTheme } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
});

const NavigationTheme = {
  ...AdaptedNavigationTheme,
  colors: {
    ...AdaptedNavigationTheme.colors,
    // Match your web portal banner gradient
    primary: '#1e3a8a',
    background: '#f9fafb',
    card: '#FFFFFF',
    text: '#1f2937',
    border: '#e5e7eb',
    notification: '#f59e0b',
  },
};

// Custom fonts to match web portal (Inter font)
const typography = {
  fontFamily: 'Inter',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
};

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [error, setError] = React.useState(null);

  // App initialization
  React.useEffect(() => {
    async function prepare() {
      try {
        // Simulate initialization tasks
        await new Promise(resolve => setTimeout(resolve, 1500)); 
      } catch (e) {
        console.error('App initialization failed:', e);
        setError(e.message || 'Failed to initialize app');
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Show loading screen while app is initializing
  if (!appIsReady) {
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={GestionMicroDonsTheme}>
          <StatusBar backgroundColor="#1e3a8a" barStyle="light-content" />
          <LoadingScreen 
            message="Application Error" 
            error={error}
            showRetry={true}
            onRetry={() => {
              setError(null);
              setAppIsReady(false);
            }}
          />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AuthProvider>
              <VoucherProvider>  {/* ← Changed from VoucherLedgerProvider */}
                <PaperProvider theme={GestionMicroDonsTheme}>
                  <StatusBar 
                    backgroundColor="#1e3a8a"  // primary-blue from CSS
                    barStyle="light-content" 
                  />
                  <NavigationContainer theme={NavigationTheme}>
                    <AppNavigator />
                  </NavigationContainer>
                </PaperProvider>
              </VoucherProvider>
            </AuthProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

console.log('GestionMicroDons Mobile App started');