import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage abstraction that works across web and native
class StorageService {
  getItem(key: string): Promise<string | null> | string | null {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web (synchronous)
        return localStorage.getItem(key);
      } else {
        // Use AsyncStorage for native (asynchronous)
        return AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  setItem(key: string, value: string): Promise<void> | void {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web (synchronous)
        localStorage.setItem(key, value);
      } else {
        // Use AsyncStorage for native (asynchronous)
        return AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  removeItem(key: string): Promise<void> | void {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web (synchronous)
        localStorage.removeItem(key);
      } else {
        // Use AsyncStorage for native (asynchronous)
        return AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  // Async versions for services that need them
  async getItemAsync(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItemAsync error:', error);
      return null;
    }
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItemAsync error:', error);
    }
  }

  async removeItemAsync(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItemAsync error:', error);
    }
  }
}

export const storage = new StorageService();