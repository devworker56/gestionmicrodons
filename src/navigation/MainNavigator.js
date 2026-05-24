import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LanguageContext } from '../contexts/LanguageContext';

// Import screens
import DashboardScreen from '../screens/main/DashboardScreen';
import QRScannerScreen from '../screens/main/QRScannerScreen';
import CharitySelectionScreen from '../screens/main/CharitySelectionScreen';
import DonationScreen from '../screens/main/DonationScreen';
import VoucherLedgerScreen from '../screens/main/VoucherLedgerScreen';
import TaxReceiptScreen from '../screens/main/TaxReceiptScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Color scheme matching web portal CSS
const colors = {
  primaryBlue: '#1e3a8a',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  secondaryTeal: '#0d9488',
  accentGreen: '#10b981',
  warningOrange: '#f59e0b',
  dangerRed: '#ef4444',
  profilePurple: '#8b5cf6',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// Main Tab Navigator
function MainTabNavigator() {
  const { t } = useContext(LanguageContext);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          // Determine icon name based on route
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Donate') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Ledger') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Receipts') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }
          
          // Custom colors for specific tabs (always these colors, not dependent on focus)
          let iconColor = color; // default from React Navigation
          if (route.name === 'Donate') {
            iconColor = colors.dangerRed; // Red for Donate
          } else if (route.name === 'Profile') {
            iconColor = colors.profilePurple; // Purple for Profile
          }
          
          return <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />;
        },
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.gray200,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: colors.primaryBlue,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 20,
        },
        headerTitleAlign: 'center',
        // Custom tab bar button with green indicator line above active tab
        tabBarButton: (props) => {
          const isFocused = props.accessibilityState?.selected;
          return (
            <View style={{ flex: 1, alignItems: 'center' }}>
              {isFocused && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 30,
                    height: 3,
                    backgroundColor: colors.accentGreen,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                  }}
                />
              )}
              <TouchableOpacity
                {...props}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 4,
                }}
                activeOpacity={0.7}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ 
          title: t('common.dashboard') || 'Dashboard',
        }}
      />
      
      <Tab.Screen 
        name="Donate" 
        component={QRScannerScreen}
        options={{ 
          title: t('common.donate') || 'Donate',
        }}
      />
      
      <Tab.Screen 
        name="Ledger" 
        component={VoucherLedgerScreen}
        options={{ 
          title: t('common.ledger') || 'Ledger',
        }}
      />
      
      <Tab.Screen 
        name="Receipts" 
        component={TaxReceiptScreen}
        options={{ 
          title: t('common.receipts') || 'Receipts',
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: t('common.profile') || 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
export default function RootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primaryBlue,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
      }}
    >
      <RootStack.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      
      <RootStack.Screen 
        name="CharitySelection" 
        component={CharitySelectionScreen}
        options={{ 
          title: 'Select Charity',
        }}
      />
      
      <RootStack.Screen 
        name="QRScanner" 
        component={QRScannerScreen}
        options={{ 
          title: 'Scan Donation Module',
        }}
      />
      
      <RootStack.Screen 
        name="Donation" 
        component={DonationScreen}
        options={{ 
          title: 'Make Donation',
        }}
      />
      
      <RootStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          title: 'Settings',
        }}
      />
    </RootStack.Navigator>
  );
}