import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://workhubx.netlify.app/api';

const deployedWebApiUrl =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? '/api'
    : null;

export const API_URL = (deployedWebApiUrl ?? configuredApiUrl).replace(/\/$/, '');
