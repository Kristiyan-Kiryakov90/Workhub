import Constants from 'expo-constants';

const configuredApiUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000/api';

export const API_URL = configuredApiUrl.replace(/\/$/, '');
