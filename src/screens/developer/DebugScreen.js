// screens/developer/DebugScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Card, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DebugScreen() {
  const [loading, setLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState('');

  const clearAsyncStorage = async () => {
    setLoading(true);
    try {
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage cleared');
      Alert.alert('Success', 'AsyncStorage cleared successfully');
      await viewAsyncStorage();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      Alert.alert('Error', 'Failed to clear AsyncStorage');
    } finally {
      setLoading(false);
    }
  };

  const viewAsyncStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const storageData = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        try {
          storageData[key] = JSON.parse(value);
        } catch {
          storageData[key] = value;
        }
      }
      
      setStorageInfo(JSON.stringify(storageData, null, 2));
    } catch (error) {
      console.error('Error viewing AsyncStorage:', error);
      setStorageInfo('Error: ' + error.message);
    }
  };

  const clearUserDataOnly = async () => {
    setLoading(true);
    try {
      await AsyncStorage.multiRemove([
        'auth_token',
        'user_data',
        'local_vouchers',
        'cached_charities'
      ]);
      
      // Clear charity buckets
      const keys = await AsyncStorage.getAllKeys();
      const bucketKeys = keys.filter(key => key.startsWith('charity_bucket_'));
      if (bucketKeys.length > 0) {
        await AsyncStorage.multiRemove(bucketKeys);
      }
      
      Alert.alert('Success', 'User data cleared successfully');
      await viewAsyncStorage();
    } catch (error) {
      console.error('Error clearing user data:', error);
      Alert.alert('Error', 'Failed to clear user data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Developer Tools</Text>
          <Text style={styles.subtitle}>AsyncStorage Management</Text>
          
          <Divider style={styles.divider} />
          
          <Button
            mode="contained"
            onPress={clearAsyncStorage}
            loading={loading}
            disabled={loading}
            style={styles.button}
            icon="delete"
          >
            Clear ALL AsyncStorage
          </Button>
          
          <Button
            mode="outlined"
            onPress={clearUserDataOnly}
            loading={loading}
            disabled={loading}
            style={styles.button}
            icon="account-remove"
          >
            Clear User Data Only
          </Button>
          
          <Button
            mode="outlined"
            onPress={viewAsyncStorage}
            loading={loading}
            disabled={loading}
            style={styles.button}
            icon="eye"
          >
            View AsyncStorage
          </Button>
          
          {storageInfo ? (
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text style={styles.infoTitle}>AsyncStorage Contents:</Text>
                <Text style={styles.infoText}>{storageInfo}</Text>
              </Card.Content>
            </Card>
          ) : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginBottom: 12,
  },
  infoCard: {
    marginTop: 20,
    backgroundColor: '#f3f4f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#4b5563',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});