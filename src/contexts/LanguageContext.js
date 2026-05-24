import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import apiService from '../services/apiService';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from user data first (this is the source of truth)
      const userData = await apiService.loadUserData();
      if (userData?.language_preference) {
        const savedLanguage = userData.language_preference;
        setLanguage(savedLanguage);
        i18n.locale = savedLanguage;
        await AsyncStorage.setItem('gmd_language', savedLanguage);
        console.log('🌐 Language loaded from user data:', savedLanguage);
      } else {
        // Fallback to AsyncStorage
        const savedLanguage = await AsyncStorage.getItem('gmd_language');
        if (savedLanguage) {
          setLanguage(savedLanguage);
          i18n.locale = savedLanguage;
          console.log('🌐 Language loaded from AsyncStorage:', savedLanguage);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (lang) => {
    try {
      if (lang !== 'fr' && lang !== 'en') {
        console.error('Invalid language code:', lang);
        return { success: false, error: 'Invalid language code' };
      }

      console.log('🌐 Changing language to:', lang);
      
      // Update state
      setLanguage(lang);
      
      // Update i18n
      i18n.locale = lang;
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('gmd_language', lang);
      
      // Update user data if logged in
      const userData = await apiService.loadUserData();
      if (userData) {
        userData.language_preference = lang;
        await apiService.saveUserData(userData);
        
        // Try to sync with backend
        try {
          await apiService.setUserLanguage(lang);
        } catch (syncError) {
          console.log('Could not sync language to backend:', syncError.message);
        }
      }
      
      // CRITICAL: Clear charity cache when language changes
      await AsyncStorage.removeItem('cached_charities');
      await AsyncStorage.removeItem('charities_cache');
      
      console.log('✅ Language changed successfully to:', lang);
      
      return { success: true };
    } catch (error) {
      console.error('Error changing language:', error);
      return { success: false, error: error.message };
    }
  };

  // Alias for ProfileScreen compatibility
  const setLanguageAlias = (lang) => {
    return changeLanguage(lang);
  };

  // Translation helper function
  const t = (key, params = {}) => {
    try {
      const result = i18n.t(key, params);
      if (typeof result !== 'string' || result.includes('[missing')) {
        console.warn(`Missing translation: ${key}`);
        const parts = key.split('.');
        const lastPart = parts[parts.length - 1];
        return lastPart.replace(/_/g, ' ');
      }
      return result;
    } catch (error) {
      console.error(`Translation error for key ${key}:`, error);
      return key.split('.').pop().replace(/_/g, ' ');
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language,                // current language (en/fr)
      currentLanguage: language, // alias for ProfileScreen
      changeLanguage,          // original method
      setLanguage: setLanguageAlias, // alias for ProfileScreen
      t,                       // translation function
      isLoading               // loading state
    }}>
      {children}
    </LanguageContext.Provider>
  );
};