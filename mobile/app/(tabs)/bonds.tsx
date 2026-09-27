import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, TextInput, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/store';
import { findWins } from '../../src/results';
import { strings, num, taka, toLatinDigits } from '../../src/i18n';
import { usePalette, radius, fonts, cardShadow } from '../../src/theme';
import { Banner } from '../../src/ads';
import { T } from '../../src/ui/kit';
import { AddFab } from '../../src/ui/fab';

export default function Bonds() {
  const p = usePalette();
  const { bonds, lang, results, removeBond } = useApp();
  const t = strings[lang];
  const [q, setQ] = useState('');
  const won = useMemo(() => new Set(findWins(bonds, results).map((w) => w.bond)), [bonds, results]);
  const query = toLatinDigits(q).replace(/\D/g, '');
  const list = query ? bonds.filter((b) => b.includes(query)) : bonds;

  function confirmDelete(n: string) {
    Alert.alert(t.deleteBond, t.deleteBondBody(n), [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => removeBond(n) },
    ]);
  }

  async function copy(n: string) {
    await Clipboard.setStringAsync(n);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    ToastAndroid.show(t.copied, ToastAndroid.SHORT);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.ground }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <T v="display">{t.tabBonds}</T>
        <T v="caption">{`${t.bondsCount(num(lang, bonds.length))} · ${taka(lang, bonds.length * 100)}`}</T>
      </View>
      <View style={{ margin: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: p.surface, borderRadius: radius.md, paddingHorizontal: 16, height: 52, ...cardShadow(p) }}>
        <Ionicons name="search" size={20} color={p.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.searchBonds}
          placeholderTextColor={p.muted}
          keyboardType="number-pad"
          style={{ flex: 1, marginLeft: 12, fontFamily: fonts.num, fontSize: 16, color: p.ink }}
        />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={p.muted} /></Pressable> : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={(b) => b}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        ListEmptyComponent={<T v="body" style={{ textAlign: 'center', marginTop: 48 }}>{q ? t.noMatch : t.noBondsYet}</T>}
        ListFooterComponent={list.length ? <View style={{ marginTop: 12 }}><Banner /></View> : null}
        renderItem={({ item: b, index }) => {
          const first = index === 0;
          const last = index === list.length - 1;
          return (
            <Pressable
              onLongPress={() => copy(b)}
              delayLongPress={350}
              android_ripple={{ color: p.line }}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: p.surface, paddingHorizontal: 20, height: 60,
                borderTopLeftRadius: first ? radius.lg : 0, borderTopRightRadius: first ? radius.lg : 0,
                borderBottomLeftRadius: last ? radius.lg : 0, borderBottomRightRadius: last ? radius.lg : 0,
                borderTopWidth: first ? 0 : 1, borderTopColor: p.line,
              }}
            >
              <T v="bond" style={{ flex: 1 }}>{b}</T>
              {won.has(b) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: p.goldSoft, borderRadius: radius.pill, paddingHorizontal: 10, height: 28, marginRight: 8 }}>
                  <Ionicons name="trophy" size={14} color={p.goldInk} />
                  <T style={{ fontFamily: fonts.bnSemi, fontSize: 12, color: p.goldInk, marginLeft: 4 }}>{t.wonBadge}</T>
                </View>
              )}
              <Pressable onPress={() => confirmDelete(b)} hitSlop={12} accessibilityLabel={t.delete} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={20} color={p.muted} />
              </Pressable>
            </Pressable>
          );
        }}
      />
      <AddFab />
    </SafeAreaView>
  );
}
