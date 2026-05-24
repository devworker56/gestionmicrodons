import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService'; // Import your API service

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (userData && token) {
        setUser(JSON.parse(userData));
        setAuthToken(token);
        
        // Try to refresh user data from server
        try {
          const profileResponse = await apiService.getUserProfile();
          if (profileResponse.success && profileResponse.profile) {
            const updatedUser = profileResponse.profile;
            await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
        } catch (profileError) {
          console.log('Using cached user data, could not refresh:', profileError.message);
          // Continue with cached data
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginResponse) => {
    try {
      // loginResponse should contain: {success: true, user_id: X, token: '...'}
      if (!loginResponse.success || !loginResponse.user_id || !loginResponse.token) {
        return { success: false, error: 'Invalid login response' };
      }
      
      const { user_id, token } = loginResponse;
      
      // Store token first
      await AsyncStorage.setItem('auth_token', token);
      setAuthToken(token);
      
      // Fetch complete user profile from API
      const profileResponse = await apiService.getUserProfile();
      
      if (!profileResponse.success || !profileResponse.profile) {
        // If profile fetch fails, create minimal user object
        const minimalUser = {
          id: user_id,
          email: loginResponse.email || '',
          user_type: loginResponse.user_type || 'donor'
        };
        
        await AsyncStorage.setItem('user_data', JSON.stringify(minimalUser));
        setUser(minimalUser);
        
        return { 
          success: true, 
          warning: 'Logged in with minimal profile data' 
        };
      }
      
      // Store complete user profile
      const userProfile = profileResponse.profile;
      await AsyncStorage.setItem('user_data', JSON.stringify(userProfile));
      setUser(userProfile);
      
      return { success: true };
      
    } catch (error) {
      console.error('Login error:', error);
      // Clean up on error
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setAuthToken(null);
      setUser(null);
      
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['user_data', 'auth_token']);
      setUser(null);
      setAuthToken(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshUserProfile = async () => {
    try {
      if (!authToken) {
        return { success: false, error: 'No authentication token' };
      }
      
      const profileResponse = await apiService.getUserProfile();
      
      if (profileResponse.success && profileResponse.profile) {
        const updatedUser = profileResponse.profile;
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      } else {
        return { success: false, error: profileResponse.error || 'Failed to fetch profile' };
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      authToken,
      login, 
      logout, 
      updateUser,
      refreshUserProfile,
      isAuthenticated: !!user && !!authToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};