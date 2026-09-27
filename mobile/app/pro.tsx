import { useEffect, useState } from 'react';
import { Pressable, ScrollView, ToastAndroid, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store';
import { strings } from '../src/i18n';
import { radius } from '../src/theme';
import { buyPro, onProPrice, proPrice, restorePro } from '../src/iap';
import { Button, T } from '../src/ui/kit';
import { BondArt, Glow } from '../src/ui/art';

const NIGHT = '#07140E';
const GOLD = '#F2B233';

export default function Pro() {
  const router = useRouter();
  const { lang, isPro } = useApp();
  const t = strings[lang];
  const [price, setPrice] = useState(proPrice());
  const [busy, setBusy] = useState(false);
  useEffect(() => onProPrice(setPrice), []);
  useEffect(() => {
    if (isPro) {
      ToastAndroid.show(t.proThanks, ToastAndroid.LONG);
      router.back();
    }
  }, [isPro]);

  async function buy() {
    setBusy(true);
    const ok = await buyPro();
    setBusy(false);
    if (!ok) ToastAndroid.show(t.proUnavailable, ToastAndroid.LONG);
  }

  async function restore() {
    try {
      const owned = await restorePro();
      if (!owned) ToastAndroid.show(t.proUnavailable, ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show(t.proUnavailable, ToastAndroid.SHORT);
    }
  }

  const perks: [keyof typeof Ionicons.glyphMap, string, string][] = [
    ['infinite', t.proPerk1, t.proPerk1Body],
    ['ban-outline', t.proPerk2, t.proPerk2Body],
    ['heart-outline', t.proPerk3, t.proPerk3Body],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT }}>
      <Glow color="#16A06E" size={420} x={-120} y={-200} opacity={0.55} />
      <Glow color={GOLD} size={260} x={200} y={-80} opacity={0.3} />
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 16, alignSelf: 'flex-start' }} accessibilityLabel={t.cancel}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
        <View style={{ height: 170, alignItems: 'center', justifyContent: 'center' }}><BondArt scale={0.9} /></View>
        <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(242,178,51,0.18)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: 16 }}>
          <T style={{ color: GOLD, fontFamily: 'Manrope-800', fontSize: 12, letterSpacing: 1.2 }}>PRO</T>
        </View>
        <T v="display" style={{ color: '#fff', marginTop: 12 }}>{t.proTitle}</T>
        <T v="body" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>{t.proSubtitle}</T>
        <View style={{ marginTop: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, gap: 20 }}>
          {perks.map(([icon, title, body]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(242,178,51,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={20} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" style={{ color: '#fff' }}>{title}</T>
                <T v="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>{body}</T>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      {!isPro && (
        <View style={{ padding: 24, paddingTop: 8 }}>
          <Button kind="gold" label={price ? t.buyPro(price) : t.buyProNoPrice} onPress={buy} busy={busy} />
          <T v="caption" style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 }}>{t.proOneTime}</T>
          <Button kind="ghost" label={t.restorePurchase} onPress={restore} style={{ marginTop: 4 }} />
        </View>
      )}
    </SafeAreaView>
  );
}
