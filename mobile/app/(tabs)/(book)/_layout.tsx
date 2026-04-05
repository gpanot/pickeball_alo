import { Stack } from 'expo-router';

export default function BookStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="results" />
      <Stack.Screen name="results-map" />
    </Stack>
  );
}
