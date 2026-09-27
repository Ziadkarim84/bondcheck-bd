import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { strings } from '../i18n';
import { fonts, radius, usePalette } from '../theme';

/** "Add bonds" in thumb reach, bottom right. */
export function AddFab() {
  const router = useRouter();
  const p = usePalette();
  const t = strings[useApp((s) => s.lang)];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/add')}
      style={({ pressed }) => ({
        position: 'absolute', right: 16, bottom: 16, height: 60, paddingHorizontal: 24, borderRadius: radius.pill,
        backgroundColor: p.accent, flexDirection: 'row', alignItems: 'center', gap: 8,
        shadowColor: p.accent, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Ionicons name="add" size={24} color={p.onAccent} />
      <Text style={{ fontFamily: fonts.bnSemi, fontSize: 16, color: p.onAccent }}>{t.addBonds}</Text>
    </Pressable>
  );
}
