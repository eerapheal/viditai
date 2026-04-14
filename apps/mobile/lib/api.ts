import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For development, we use the machine's local IP address.
// On physical devices and emulators, 'localhost' points to the device itself.
const DEV_API_URL = 'http://192.168.0.2:8000/api/v1';
const PROD_API_URL = 'https://api.viditai.com/api/v1'; // Placeholder

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

export async function getToken() {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export async function deleteToken() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error deleting token:', error);
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'API request failed');
  }

  return data;
}
