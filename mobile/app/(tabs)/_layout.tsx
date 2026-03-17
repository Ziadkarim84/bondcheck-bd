import { Tabs } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

export default function TabLayout() {
  const lang = useAuthStore((s) => s.language);
  const t = strings[lang];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
        headerStyle: { backgroundColor: '#0284c7' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.home, tabBarLabel: t.home, tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="bonds"
        options={{ title: t.myBonds, tabBarLabel: t.myBonds, tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: t.scan, tabBarLabel: t.scan, tabBarIcon: ({ color }) => <TabIcon emoji="📷" color={color} /> }}
      />
      <Tabs.Screen
        name="results"
        options={{ title: t.results, tabBarLabel: t.results, tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t.settings, tabBarLabel: t.settings, tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === '#0284c7' ? 1 : 0.5 }}>{emoji}</Text>;
}
