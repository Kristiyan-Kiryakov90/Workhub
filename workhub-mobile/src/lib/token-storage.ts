import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getToken(key: string) {
  if (isWeb && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setToken(key: string, token: string) {
  if (isWeb && typeof window !== 'undefined') {
    window.localStorage.setItem(key, token);
    return;
  }

  await SecureStore.setItemAsync(key, token);
}

export async function deleteToken(key: string) {
  if (isWeb && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
