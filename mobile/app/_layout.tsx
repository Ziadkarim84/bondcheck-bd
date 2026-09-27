import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { useApp } from '../src/store';
import { fetchResults } from '../src/results';
import { announce, ensureChannel, registerBackgroundCheck } from '../src/notify';
import { initAds } from '../src/ads';
import { initIap } from '../src/iap';
import { usePalette } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

async function refresh() {
  const r = await fetchResults();
  useApp.getState().setResults(r);
  if (r) await announce(r, false);
}

export default function RootLayout() {
  const router = useRouter();
  const p = usePalette();
  const scheme = useColorScheme();
  const onboarded = useApp((s) => s.onboarded);
  const [fontsLoaded] = useFonts({
    'NotoSansBengali-Medium': require('../assets/fonts/NotoSansBengali-Medium.ttf'),
    'NotoSansBengali-SemiBold': require('../assets/fonts/NotoSansBengali-SemiBold.ttf'),
    'NotoSansBengali-Bold': require('../assets/fonts/NotoSansBengali-Bold.ttf'),
    'Manrope-500': require('../assets/fonts/Manrope-500.ttf'),
    'Manrope-700': require('../assets/fonts/Manrope-700.ttf'),
    'Manrope-800': require('../assets/fonts/Manrope-800.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
    if (!onboarded) router.replace('/welcome');
  }, [fontsLoaded, onboarded]);

  useEffect(() => {
    ensureChannel().catch(() => {});
    refresh();
    registerBackgroundCheck();
    initAds();
    initIap();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.notification.request.content.data?.screen === 'results') router.navigate('/results');
      else router.navigate('/');
    });
    return () => { sub.remove(); tap.remove(); };
  }, []);

  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.ground }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pro" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
