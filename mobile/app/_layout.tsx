import { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
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

const FONT_TIMEOUT_MS = 5000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    ArchivoBlack_400Regular,
  });

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = fontsLoaded || timedOut;

  useEffect(() => {
    if (fontError) console.warn('Font load error:', fontError);
  }, [fontError]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e0e0e', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={{ width: 84, height: 84, marginBottom: 12 }}
          resizeMode="contain"
        />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <SafeAreaProvider>
        <CourtMapProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }}>
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
