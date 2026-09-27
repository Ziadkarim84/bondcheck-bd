import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/store';
import { fetchResults, findWins } from '../../src/results';
import { strings, num, taka, formatDate, ordinalDraw, rankLabel, toLatinDigits } from '../../src/i18n';
import { usePalette, radius, fonts } from '../../src/theme';
import { Banner } from '../../src/ads';
import { Button, Card, Pill, T } from '../../src/ui/kit';

export default function Results() {
  const p = usePalette();
  const { results, lang: L, bonds, offline, setResults } = useApp();
  const t = strings[L];
  const [selected, setSelected] = useState(results.draws[0].draw);
  const [q, setQ] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const draw = results.draws.find((d) => d.draw === selected) ?? results.draws[0];
  const mine = useMemo(() => new Set(bonds), [bonds]);
  const checkWins = checked ? findWins([checked], results) : [];

  async function onRefresh() {
    setRefreshing(true);
    setResults(await fetchResults());
    setRefreshing(false);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.ground }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[p.accent]} />} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <T v="display">{t.resultsTitle}</T>
          <T v="caption">{offline ? t.offline : t.updated(formatDate(L, results.updatedAt))}</T>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 16 }}>
          {results.draws.map((d) => (
            <Pill key={d.draw} label={ordinalDraw(L, d.draw)} active={d.draw === draw.draw} onPress={() => setSelected(d.draw)} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            <T v="heading">{t.checkNumber}</T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TextInput
                value={q}
                onChangeText={(v) => { setQ(toLatinDigits(v).replace(/\D/g, '').slice(0, 7)); setChecked(null); }}
                keyboardType="number-pad"
                maxLength={7}
                placeholder="0000000"
                placeholderTextColor={p.line}
                onSubmitEditing={() => q.length === 7 && setChecked(q)}
                style={{ flex: 1, height: 56, borderRadius: radius.md, backgroundColor: p.surfaceAlt, paddingHorizontal: 16, fontFamily: fonts.numBold, fontSize: 22, letterSpacing: 3, color: p.ink }}
              />
              <Button label={t.check} onPress={() => setChecked(q)} disabled={q.length !== 7} style={{ height: 56, paddingHorizontal: 20 }} />
            </View>
            {checked && (
              <View style={{ marginTop: 12, borderRadius: radius.md, padding: 14, backgroundColor: checkWins.length ? p.goldSoft : p.surfaceAlt }}>
                {checkWins.length ? checkWins.map((w) => (
                  <T key={w.draw} v="bodyStrong" style={{ color: p.goldInk }}>{t.checkWin(ordinalDraw(L, w.draw), rankLabel(L, w.rank), taka(L, w.amount))}</T>
                )) : <T v="body">{t.checkNone(num(L, results.draws.length))}</T>}
              </View>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <T v="label">{formatDate(L, draw.date)}</T>
            <T v="title">{`${ordinalDraw(L, draw.draw)} ${L === 'bn' ? 'ড্র' : 'draw'}`}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Ionicons name="information-circle-outline" size={16} color={p.muted} />
              <T v="caption">{t.sameAllSeries}</T>
            </View>
            {draw.prizes.map((pr) => {
              const big = pr.rank <= 2;
              return (
                <View key={pr.rank} style={{ borderTopWidth: 1, borderTopColor: p.line, marginTop: 16, paddingTop: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <T v="bodyStrong" style={{ flex: 1, marginRight: 12 }}>{rankLabel(L, pr.rank)}</T>
                    <T style={{ fontFamily: fonts.numBold, fontSize: 16, color: big ? p.goldInk : p.accent }}>{taka(L, pr.amount)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {pr.numbers.map((n) => {
                      const own = mine.has(n);
                      return (
                        <View key={n} style={{ borderRadius: 10, paddingHorizontal: big ? 14 : 10, paddingVertical: big ? 8 : 5, backgroundColor: own ? p.gold : big ? p.goldSoft : p.surfaceAlt }}>
                          <T style={{ fontFamily: fonts.numBold, fontSize: big ? 20 : 15, letterSpacing: 1, color: own ? '#2A1C00' : p.ink, fontVariant: ['tabular-nums'] }}>{n}</T>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Card>
          <View style={{ marginTop: 16 }}><Banner /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
