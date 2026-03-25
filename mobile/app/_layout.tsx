import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.put('/notifications/token', { expoPushToken: token });
  } catch {
    // Non-critical
  }
}

export default function RootLayout() {
  const { isReady, accessToken, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    SecureStore.getItemAsync('onboarding_done').then((v) => {
      if (!v) {
        router.replace('/onboarding');
        return;
      }
      const inAuth = segments[0] === '(auth)';
      if (!accessToken && !inAuth) router.replace('/(auth)/login');
      if (accessToken && inAuth) router.replace('/(tabs)/');
    });
  }, [isReady, accessToken, segments]);

  useEffect(() => {
    if (accessToken) registerForPushNotifications();
  }, [accessToken]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
