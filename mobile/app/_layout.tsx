import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CourtMapProvider } from '@/context/CourtMapContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    ArchivoBlack_400Regular,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e0e0e' }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CourtMapProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="player-auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(coach-tabs)" />
            <Stack.Screen
              name="venue/[id]"
              options={{
                presentation: 'transparentModal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
                contentStyle: { backgroundColor: 'transparent' },
                ...(Platform.OS === 'ios'
                  ? { fullScreenGestureEnabled: true as const }
                  : {}),
              }}
            />
          </Stack>
        </CourtMapProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
