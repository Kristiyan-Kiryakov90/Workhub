module.exports = {
  expo: {
    name: 'workhub-mobile',
    slug: 'workhub-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'workhubmobile',
    userInterfaceStyle: 'light',
    ios: {},
    android: {
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ??
        'http://localhost:3000/api',
    },
  },
};
