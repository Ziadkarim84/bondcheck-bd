import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store';
import { strings } from '../src/i18n';
import { usePalette, radius } from '../src/theme';
import { askNotificationPermission } from '../src/notify';
import { Button, Segmented, T } from '../src/ui/kit';
import { BondArt } from '../src/ui/art';

export default function Welcome() {
  const router = useRouter();
  const p = usePalette();
  const lang = useApp((s) => s.lang);
  const set = useApp((s) => s.set);
  const t = strings[lang];

  async function start() {
    await askNotificationPermission();
    set({ onboarded: true });
    router.replace('/');
  }

  const points: [keyof typeof Ionicons.glyphMap, string][] = [
    ['person-remove-outline', t.welcomePoint1],
    ['phone-portrait-outline', t.welcomePoint2],
    ['shield-checkmark-outline', t.welcomePoint3],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.ground }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 16 }}>
        <View style={{ backgroundColor: p.hero, borderRadius: radius.xl, height: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <BondArt />
        </View>
        <T v="display" style={{ marginTop: 32 }}>{t.welcomeTitle}</T>
        <T v="body" style={{ marginTop: 12, fontSize: 16, lineHeight: 25 }}>{t.welcomeBody}</T>
        <View style={{ marginTop: 24, gap: 16 }}>
          {points.map(([icon, text]) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={18} color={p.accent} />
              </View>
              <T v="bodyStrong" style={{ flex: 1 }}>{text}</T>
            </View>
          ))}
        </View>
        <T v="label" style={{ marginTop: 32, marginBottom: 8 }}>{t.chooseLanguage}</T>
        <Segmented
          options={[{ key: 'bn', label: 'বাংলা' }, { key: 'en', label: 'English' }]}
          value={lang}
          onChange={(k) => set({ lang: k as 'bn' | 'en' })}
        />
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 8 }}>
        <Button label={t.start} onPress={start} icon="arrow-forward" />
      </View>
    </SafeAreaView>
  );
}
