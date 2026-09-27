import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/store';
import { strings } from '../../src/i18n';
import { fonts, usePalette } from '../../src/theme';

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ focused, color }: { focused: boolean; color: string }) => (
  <Ionicons name={focused ? on : off} size={24} color={color} />
);

export default function TabsLayout() {
  const p = usePalette();
  const t = strings[useApp((s) => s.lang)];
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line, height: 64 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 8 },
        tabBarLabelStyle: { fontFamily: fonts.bnSemi, fontSize: 12 },
        sceneStyle: { backgroundColor: p.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabHome, tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="bonds" options={{ title: t.tabBonds, tabBarIcon: icon('wallet', 'wallet-outline') }} />
      <Tabs.Screen name="results" options={{ title: t.tabResults, tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t.tabSettings, tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
