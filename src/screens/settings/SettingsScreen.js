// screens/settings/SettingsScreen.js
import React, { useContext } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';

export default function SettingsScreen() {
  const theme = useTheme();
  const { t, language, setLanguage } = useContext(LanguageContext);
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  // Your color scheme from CSS
  const colors = {
    primaryBlue: '#1e3a8a',
    primaryDark: '#1e40af',
    primaryLight: '#3b82f6',
    secondaryTeal: '#0d9488',
    accentGreen: '#10b981',
    warningOrange: '#f59e0b',
    dangerRed: '#ef4444',
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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header matching your web portal banner */}
      <View style={[styles.header, { 
        backgroundColor: colors.primaryBlue,
        backgroundGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
      }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your account preferences</Text>
      </View>

      <View style={styles.content}>
        {/* Account Settings Card */}
        <View style={[styles.card, { 
          backgroundColor: '#ffffff',
          borderColor: '#eef0f2'
        }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
            Account Settings
          </Text>
          
          <List.Item
            title="Email Notifications"
            description="Receive updates about your donations"
            left={props => <List.Icon {...props} icon="email" color={colors.primaryBlue} />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.gray300, true: colors.accentGreen }}
                thumbColor={notifications ? colors.secondaryTeal : colors.gray400}
              />
            )}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Language"
            description="App interface language"
            left={props => <List.Icon {...props} icon="translate" color={colors.primaryBlue} />}
            right={() => (
              <Text style={{ color: colors.gray600, alignSelf: 'center' }}>
                {language === 'en' ? 'English' : 'Français'}
              </Text>
            )}
            onPress={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Dark Mode"
            description="Switch between light and dark themes"
            left={props => <List.Icon {...props} icon="theme-light-dark" color={colors.primaryBlue} />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.gray300, true: colors.accentGreen }}
                thumbColor={darkMode ? colors.secondaryTeal : colors.gray400}
              />
            )}
          />
        </View>

        {/* Privacy & Security Card */}
        <View style={[styles.card, { 
          backgroundColor: '#ffffff',
          borderColor: '#eef0f2'
        }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
            Privacy & Security
          </Text>
          
          <List.Item
            title="Two-Factor Authentication"
            description="Add extra security to your account"
            left={props => <List.Icon {...props} icon="shield-check" color={colors.accentGreen} />}
            onPress={() => {}}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Change Password"
            description="Update your login credentials"
            left={props => <List.Icon {...props} icon="key" color={colors.primaryBlue} />}
            onPress={() => {}}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Privacy Settings"
            description="Manage your data and privacy"
            left={props => <List.Icon {...props} icon="lock" color={colors.primaryBlue} />}
            onPress={() => {}}
          />
        </View>

        {/* Donation Settings Card */}
        <View style={[styles.card, { 
          backgroundColor: '#ffffff',
          borderColor: '#eef0f2'
        }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
            Donation Preferences
          </Text>
          
          <List.Item
            title="Default Charity"
            description="Set your preferred charity for quick donations"
            left={props => <List.Icon {...props} icon="heart" color={colors.dangerRed} />}
            right={() => (
              <Text style={{ color: colors.gray500, alignSelf: 'center' }}>Not set</Text>
            )}
            onPress={() => {}}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Receipt Preferences"
            description="How you receive tax receipts"
            left={props => <List.Icon {...props} icon="file-document" color={colors.warningOrange} />}
            right={() => (
              <Text style={{ color: colors.gray500, alignSelf: 'center' }}>Email</Text>
            )}
            onPress={() => {}}
          />
        </View>

        {/* About Section */}
        <View style={[styles.card, { 
          backgroundColor: '#ffffff',
          borderColor: '#eef0f2'
        }]}>
          <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
            About
          </Text>
          
          <List.Item
            title="App Version"
            description="GestionMicroDons Mobile"
            left={props => <List.Icon {...props} icon="information" color={colors.gray500} />}
            right={() => (
              <Text style={{ color: colors.gray500, alignSelf: 'center' }}>1.0.0</Text>
            )}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Terms & Conditions"
            left={props => <List.Icon {...props} icon="file-document-outline" color={colors.gray500} />}
            onPress={() => {}}
          />
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield-account" color={colors.gray500} />}
            onPress={() => {}}
          />
        </View>

        {/* Trust Badge matching web portal */}
        <View style={[styles.trustBadge, { 
          borderColor: colors.accentGreen,
          backgroundColor: 'rgba(16, 185, 129, 0.05)'
        }]}>
          <List.Icon icon="shield-check" color={colors.accentGreen} />
          <View style={styles.trustContent}>
            <Text style={[styles.trustTitle, { color: colors.gray800 }]}>
              Secure & Verified
            </Text>
            <Text style={[styles.trustText, { color: colors.gray600 }]}>
              All transactions are cryptographically secured with SHA-256
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  divider: {
    marginHorizontal: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 8,
    marginBottom: 30,
  },
  trustContent: {
    flex: 1,
    marginLeft: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trustText: {
    fontSize: 14,
    lineHeight: 18,
  },
});