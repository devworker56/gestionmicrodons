import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoadingScreen({ message = 'Loading...', error = null, showRetry = false, onRetry }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {error ? (
          <>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={64} 
              color={theme.colors.error} 
            />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
            <Text style={[styles.message, { color: theme.colors.text }]}>
              {message}
            </Text>
            {showRetry && (
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={onRetry}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <ActivityIndicator 
              size="large" 
              color={theme.colors.primary} 
            />
            <Text style={[styles.message, { color: theme.colors.text }]}>
              {message}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});