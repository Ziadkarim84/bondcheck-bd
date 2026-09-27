import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, ToastAndroid, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp, bondLimit, rangeNumbers, MAX_RANGE, SLOTS_PER_AD, MAX_FREE_LIMIT, FREE_LIMIT } from '../src/store';
import { findWins } from '../src/results';
import { strings, num, toLatinDigits } from '../src/i18n';
import { usePalette, radius, fonts } from '../src/theme';
import { maybeShowInterstitial, showRewarded } from '../src/ads';
import { Button, Segmented, T } from '../src/ui/kit';

const clean = (s: string) => toLatinDigits(s).replace(/\D/g, '').slice(0, 7);

export default function Add() {
  const router = useRouter();
  const p = usePalette();
  const s = useApp();
  const t = strings[s.lang];
  const L = s.lang;
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [one, setOne] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [needSlots, setNeedSlots] = useState(0);
  const toRef = useRef<TextInput>(null);

  const limit = bondLimit(s);
  const free = limit - s.bonds.length;
  let error = '';
  let count = 0;
  if (mode === 'range' && from.length === 7 && to.length === 7) {
    const a = parseInt(from, 10), b = parseInt(to, 10);
    if (a > b) error = t.rangeOrder;
    else if (b - a + 1 > MAX_RANGE) error = t.rangeTooBig;
    else count = b - a + 1;
  }
  const canAdd = mode === 'single' ? one.length === 7 : count > 0 && !error;

  function add() {
    const numbers = mode === 'single' ? [one] : rangeNumbers(from, to);
    const fresh = numbers.filter((n) => !s.bonds.includes(n));
    if (mode === 'single' && !fresh.length) return ToastAndroid.show(t.alreadyAdded, ToastAndroid.SHORT);
    if (fresh.length > free) {
      setNeedSlots(fresh.length - Math.max(free, 0));
      return;
    }
    const { added } = s.addBonds(fresh);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const wins = findWins(fresh, s.results);
    ToastAndroid.show(wins.length ? t.foundWin(wins[0].bond) : t.added(num(L, added)), ToastAndroid.LONG);
    router.back();
    setTimeout(maybeShowInterstitial, 600);
  }

  function earn() {
    const shown = showRewarded(() => {
      const st = useApp.getState();
      st.set({ bonusSlots: Math.min(st.bonusSlots + SLOTS_PER_AD, MAX_FREE_LIMIT - FREE_LIMIT) });
      setNeedSlots((n) => Math.max(0, n - SLOTS_PER_AD));
      ToastAndroid.show(t.slotsEarned(num(L, SLOTS_PER_AD)), ToastAndroid.SHORT);
    });
    if (!shown) ToastAndroid.show(t.adNotReady, ToastAndroid.SHORT);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.ground }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 56 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 8 }} accessibilityLabel={t.cancel}>
            <Ionicons name="close" size={26} color={p.ink} />
          </Pressable>
          <T v="heading" style={{ marginLeft: 8, flex: 1 }}>{t.addTitle}</T>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
          <Segmented
            options={[{ key: 'single', label: t.single }, { key: 'range', label: t.range }]}
            value={mode}
            onChange={(k) => { setMode(k as 'single' | 'range'); setNeedSlots(0); }}
          />
          {mode === 'single' ? (
            <BigInput label={t.bondNumber} value={one} onChange={(v) => setOne(clean(v))} autoFocus onSubmit={() => canAdd && add()} />
          ) : (
            <>
              <BigInput label={t.from} value={from} onChange={(v) => { const c = clean(v); setFrom(c); if (c.length === 7) toRef.current?.focus(); }} autoFocus />
              <BigInput label={t.to} value={to} onChange={(v) => setTo(clean(v))} inputRef={toRef} onSubmit={() => canAdd && add()} />
              {(count > 0 || error) && (
                <T v="bodyStrong" style={{ marginTop: 12, color: error ? p.danger : p.accent }}>{error || t.rangeHint(num(L, count))}</T>
              )}
            </>
          )}

          {needSlots > 0 && (
            <View style={{ marginTop: 24, backgroundColor: p.goldSoft, borderRadius: radius.lg, padding: 20 }}>
              <T v="heading">{t.limitTitle}</T>
              <T v="body" style={{ marginTop: 4 }}>{t.limitBody(num(L, limit))}</T>
              <T v="bodyStrong" style={{ marginTop: 8, color: p.goldInk }}>{t.limitNeed(num(L, needSlots))}</T>
              {limit < MAX_FREE_LIMIT && (
                <Button kind="secondary" icon="play-circle-outline" label={t.earnSlots(num(L, SLOTS_PER_AD))} onPress={earn} style={{ marginTop: 16, backgroundColor: p.surface }} />
              )}
              <Button kind="gold" icon="infinite" label={t.getPro} onPress={() => router.push('/pro')} style={{ marginTop: 8 }} />
            </View>
          )}
        </ScrollView>
        <View style={{ padding: 24, paddingTop: 8 }}>
          <Button label={t.add} icon="add" onPress={add} disabled={!canAdd} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BigInput({ label, value, onChange, autoFocus, onSubmit, inputRef }: {
  label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; onSubmit?: () => void; inputRef?: React.Ref<TextInput>;
}) {
  const p = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginTop: 20 }}>
      <T v="label" style={{ marginBottom: 8, color: focus ? p.accent : p.muted }}>{label}</T>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        maxLength={7}
        placeholder="0000000"
        placeholderTextColor={p.line}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmit}
        style={{
          height: 72, borderRadius: radius.md, backgroundColor: p.surfaceAlt, paddingHorizontal: 20,
          fontFamily: fonts.numBold, fontSize: 32, letterSpacing: 6, color: p.ink,
          borderWidth: 2, borderColor: focus ? p.accent : 'transparent',
        }}
      />
    </View>
  );
}
