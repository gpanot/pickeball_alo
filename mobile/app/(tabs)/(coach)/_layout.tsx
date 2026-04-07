import { Stack } from 'expo-router';
import { CoachDiscoveryProvider } from '@/context/CoachDiscoveryContext';
import { SessionProvider } from '@/context/SessionContext';
import { CreditProvider } from '@/context/CreditContext';

export default function CoachLayout() {
  return (
    <CoachDiscoveryProvider>
      <SessionProvider>
        <CreditProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="coach-profile" />
            <Stack.Screen name="session-booking" />
            <Stack.Screen name="session-payment" />
            <Stack.Screen name="session-detail" />
            <Stack.Screen name="my-credits" />
            <Stack.Screen name="buy-credit-pack" />
          </Stack>
        </CreditProvider>
      </SessionProvider>
    </CoachDiscoveryProvider>
  );
}
