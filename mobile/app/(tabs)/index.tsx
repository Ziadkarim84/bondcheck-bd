import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, ToastAndroid, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp, bondLimit, SLOTS_PER_AD, MAX_FREE_LIMIT } from '../../src/store';
import { findWins, fetchResults, daysUntil } from '../../src/results';
import { strings, num, taka, formatDate, ordinalDraw, rankLabel } from '../../src/i18n';
import { usePalette, radius, fonts } from '../../src/theme';
import { Banner, showRewarded } from '../../src/ads';
import { Button, Card, IconBadge, SectionTitle, T } from '../../src/ui/kit';
import { BondArt, Glow } from '../../src/ui/art';
import { AddFab } from '../../src/ui/fab';

export default function Home() {
  const router = useRouter();
  const p = usePalette();
  const s = useApp();
  const t = strings[s.lang];
  const L = s.lang;
  const [refreshing, setRefreshing] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const wins = useMemo(() => findWins(s.bonds, s.results), [s.bonds, s.results]);
  const totalAfterTax = wins.reduce((a, w) => a + w.afterTax, 0);
  const limit = bondLimit(s);
  const nextDays = daysUntil(s.results.nextDrawExpected);

  async function onRefresh() {
    setRefreshing(true);
    s.setResults(await fetchResults());
    setRefreshing(false);
  }

  function earnSlots() {
    if (s.bonusSlots + 30 >= MAX_FREE_LIMIT) return ToastAndroid.show(t.maxSlotsReached, ToastAndroid.LONG);
    const shown = showRewarded(() => {
      const st = useApp.getState();
      st.set({ bonusSlots: Math.min(st.bonusSlots + SLOTS_PER_AD, MAX_FREE_LIMIT - 30) });
      ToastAndroid.show(t.slotsEarned(num(L, SLOTS_PER_AD)), ToastAndroid.SHORT);
    });
    if (!shown) ToastAndroid.show(t.adNotReady, ToastAndroid.SHORT);
  }

  const empty = s.bonds.length === 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.ground }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[p.accent]} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 }}>
          <Logo />
          <T v="heading" style={{ fontFamily: fonts.numBold, fontSize: 18 }}>{t.appName}</T>
        </View>

        {/* Status hero: the one answer that matters */}
        <View style={{ backgroundColor: p.hero, borderRadius: radius.xl, padding: 24, marginTop: 8, overflow: 'hidden' }}>
          <Glow color={wins.length ? '#F2B233' : '#16A06E'} size={300} x={120} y={-140} opacity={0.45} />
          {empty ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ height: 150, justifyContent: 'center' }}><BondArt scale={0.8} /></View>
              <T v="title" style={{ color: p.onHero, textAlign: 'center', marginTop: 8 }}>{t.emptyTitle}</T>
              <T v="body" style={{ color: p.heroSoft, textAlign: 'center', marginTop: 6 }}>{t.emptyBody}</T>
            </View>
          ) : wins.length ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy" size={20} color={p.gold} />
                <T v="bodyStrong" style={{ color: p.gold }}>{t.winsTitle(num(L, wins.length))}</T>
              </View>
              <T v="figureLg" style={{ color: p.onHero, fontSize: 40, lineHeight: 48, marginTop: 8 }}>{taka(L, totalAfterTax)}</T>
              <T v="body" style={{ color: p.heroSoft }}>{t.totalAfterTax}</T>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#6FE0AE" />
                <T v="label" style={{ color: p.heroSoft }}>{t.checkedAgainst(num(L, s.results.draws.length))}</T>
              </View>
              <T v="title" style={{ color: p.onHero, marginTop: 8, fontSize: 26, lineHeight: 34 }}>{t.noWinsTitle}</T>
              <T v="body" style={{ color: p.heroSoft, marginTop: 4 }}>{t.noWinsBody(num(L, s.bonds.length))}</T>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            <HeroTile label={t.bondsLabel} value={num(L, s.bonds.length)} />
            <HeroTile label={t.valueLabel} value={taka(L, s.bonds.length * 100)} />
            <HeroTile
              label={t.nextDraw}
              value={formatDate(L, s.results.nextDrawExpected).split(' ').slice(0, 2).join(' ')}
              sub={nextDays > 0 ? t.inDays(num(L, nextDays)) : undefined}
            />
          </View>
        </View>

        {wins.length > 0 && (
          <>
            <SectionTitle title={t.yourWins} />
            <Card style={{ padding: 0, paddingVertical: 4 }}>
              {wins.map((w, i) => {
                const left = daysUntil(w.claimBy);
                return (
                  <View key={`${w.draw}:${w.bond}`} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: p.line }}>
                    <IconBadge name="trophy" tone="gold" />
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <T v="bond">{w.bond}</T>
                      <T v="caption">{`${ordinalDraw(L, w.draw)} · ${rankLabel(L, w.rank)}`}</T>
                      <T v="caption" style={{ color: left < 90 ? p.danger : p.muted }}>{left > 0 ? t.claimBy(formatDate(L, w.claimBy)) : t.claimExpired}</T>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <T v="figure" style={{ fontSize: 18, color: p.goldInk }}>{taka(L, w.amount)}</T>
                      <T v="caption">{t.afterTax(taka(L, w.afterTax))}</T>
                    </View>
                  </View>
                );
              })}
            </Card>
            <Card style={{ marginTop: 12 }} onPress={() => setClaimOpen(!claimOpen)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconBadge name="document-text" tone="accent" size={40} />
                <T v="bodyStrong" style={{ flex: 1, marginLeft: 16 }}>{t.howToClaim}</T>
                <Ionicons name={claimOpen ? 'chevron-up' : 'chevron-down'} size={20} color={p.muted} />
              </View>
              {claimOpen && <T v="body" style={{ marginTop: 12 }}>{t.howToClaimBody}</T>}
            </Card>
          </>
        )}

        {!s.isPro && !empty && (
          <>
            <SectionTitle title={t.slotsUsed(num(L, s.bonds.length), num(L, limit))} />
            <Card>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: p.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.min(100, (s.bonds.length / limit) * 100)}%`, backgroundColor: s.bonds.length >= limit ? p.danger : p.accent, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                {limit < MAX_FREE_LIMIT && (
                  <Button kind="secondary" icon="play-circle-outline" label={t.earnSlots(num(L, SLOTS_PER_AD))} onPress={earnSlots} style={{ flex: 1, height: 48, paddingHorizontal: 12 }} />
                )}
              </View>
              <Pressable onPress={() => router.push('/pro')} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }} hitSlop={8}>
                <Ionicons name="infinite" size={18} color={p.accent} />
                <T v="bodyStrong" style={{ color: p.accent, marginLeft: 6 }}>{t.getPro}</T>
              </Pressable>
            </Card>
          </>
        )}

        <View style={{ marginTop: 16 }}><Banner /></View>
      </ScrollView>
      <AddFab />
    </SafeAreaView>
  );
}

function HeroTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: p.heroTile, borderRadius: radius.md, padding: 12 }}>
      <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.numBold, fontSize: 17, color: p.onHero }}>{value}</T>
      <T v="caption" numberOfLines={1} style={{ color: p.heroSoft, fontSize: 12 }}>{sub ?? label}</T>
    </View>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#0B8457', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="checkmark-done" size={size * 0.6} color="#fff" />
    </View>
  );
}
