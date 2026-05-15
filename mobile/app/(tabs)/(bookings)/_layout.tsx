import { Stack } from 'expo-router';
import { SessionProvider } from '@/context/SessionContext';

export default function BookingsStackLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="session-detail" />
      </Stack>
    </SessionProvider>
  );
}
