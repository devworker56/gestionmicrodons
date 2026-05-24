import React, { useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LanguageContext } from '../../contexts/LanguageContext';

export default function LanguageSelectionScreen({ navigation }) {
  const theme = useTheme();
  const { changeLanguage } = useContext(LanguageContext);

  const handleLanguageSelect = async (language) => {
    await changeLanguage(language);
    navigation.navigate('Welcome');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="hand-heart" 
          size={80} 
          color={theme.colors.primary} 
        />
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          GestionMicroDons
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          Choose your language / Choisissez votre langue
        </Text>
      </View>
      
      <View style={styles.languageContainer}>
        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleLanguageSelect('en')}
        >
          <Text style={[styles.languageText, { color: theme.colors.text }]}>
            English
          </Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.disabled} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleLanguageSelect('fr')}
        >
          <Text style={[styles.languageText, { color: theme.colors.text }]}>
            Français
          </Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.disabled} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.disabled }]}>
          You can change language later in settings
        </Text>
        <Text style={[styles.footerText, { color: theme.colors.disabled }]}>
          Vous pouvez changer la langue plus tard dans les paramètres
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  languageContainer: {
    marginVertical: 40,
  },
  languageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  languageText: {
    fontSize: 18,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
});