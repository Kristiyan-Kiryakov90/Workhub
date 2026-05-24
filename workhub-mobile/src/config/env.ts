import Constants from 'expo-constants';

const configuredApiUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://workhubx.netlify.app/api';

export const API_URL = configuredApiUrl.replace(/\/$/, '');
