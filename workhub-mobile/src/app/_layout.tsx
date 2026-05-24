import { Stack } from 'expo-router';

import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="calendar/[date]" options={{ title: 'Day Activities' }} />
        <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Stack.Screen name="tasks/[id]" options={{ title: 'Task Details' }} />
        <Stack.Screen name="leaves" options={{ title: 'Leaves' }} />
        <Stack.Screen name="leaves/[id]" options={{ title: 'Leave Details' }} />
        <Stack.Screen name="leaves/create" options={{ title: 'Request Leave' }} />
        <Stack.Screen name="shifts" options={{ title: 'Shifts' }} />
        <Stack.Screen name="shifts/[id]" options={{ title: 'Shift Details' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      </Stack>
    </AuthProvider>
  );
}
