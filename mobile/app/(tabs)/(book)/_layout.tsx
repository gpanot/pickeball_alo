import { Stack } from 'expo-router';

export default function BookStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="map" />
      <Stack.Screen name="results" />
      <Stack.Screen name="results-map" />
    </Stack>
  );
}
