import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For development, we use the machine's local IP address.
// On physical devices and emulators, 'localhost' points to the device itself.
const DEV_API_URL = 'http://192.168.0.2:8000/api/v1';
const PROD_API_URL = 'https://api.viditai.com/api/v1'; // Placeholder

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const API_BASE = __DEV__ ? 'http://192.168.0.2:8000' : 'https://api.viditai.com';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function saveUser(user: any) {
  try {
    const userStr = JSON.stringify(user);
    if (Platform.OS === 'web') {
      localStorage.setItem(USER_KEY, userStr);
    } else {
      await SecureStore.setItemAsync(USER_KEY, userStr);
    }
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

export async function getUser() {
  try {
    let userStr: string | null = null;
    if (Platform.OS === 'web') {
      userStr = localStorage.getItem(USER_KEY);
    } else {
      userStr = await SecureStore.getItemAsync(USER_KEY);
    }
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function deleteUser() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

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

  if (response.status === 401) {
    await deleteToken();
    await deleteUser();
    // Use a custom event or a simple reload to force state reset if needed, 
    // but clearing storage will make the next app start or syncAuth fail.
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = typeof data.detail === 'object' 
      ? JSON.stringify(data.detail) 
      : (data.detail || 'API request failed');
    throw new Error(errorMsg);
  }

  return data;
}
