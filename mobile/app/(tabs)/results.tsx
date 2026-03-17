import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { api } from '../../services/api';

const PRIZE_INFO: Record<number, { emoji: string; color: string }> = {
  1: { emoji: '🥇', color: '#ca8a04' },
  2: { emoji: '🥈', color: '#64748b' },
  3: { emoji: '🥉', color: '#92400e' },
  4: { emoji: '🏅', color: '#1d4ed8' },
  5: { emoji: '🎖️', color: '#15803d' },
};

export default function ResultsScreen() {
  const [latest, setLatest] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/results/latest');
      setLatest(data);
    } catch {}
  }

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!latest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No draw results available yet.</Text>
        <Text style={styles.emptySubtext}>Results are published on the last day of Jan, Apr, Jul, Oct.</Text>
      </View>
    );
  }

  // Group results by prizeRank
  const grouped: Record<number, any[]> = {};
  for (const r of latest.results ?? []) {
    (grouped[r.prizeRank] = grouped[r.prizeRank] ?? []).push(r);
  }

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.drawTitle}>Draw #{latest.drawNumber}</Text>
        <Text style={styles.drawDate}>
          {new Date(latest.drawDate).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {Object.entries(grouped).map(([rank, items]) => {
        const info = PRIZE_INFO[Number(rank)];
        const amount = items[0].prizeAmount;
        return (
          <View key={rank} style={styles.prizeSection}>
            <Text style={[styles.prizeTitle, { color: info.color }]}>
              {info.emoji} Prize {rank} — ৳{amount.toLocaleString()}
            </Text>
            <View style={styles.numbersRow}>
              {items.map((r: any) => (
                <Text key={r.id} style={styles.number}>{r.winningNumber}</Text>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.taxNote}>
        ⚠️ 20% source tax applies to all prizes under Income Tax Act 2023. Claim within 2 years.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  header: { backgroundColor: '#0284c7', padding: 20, paddingTop: 24 },
  drawTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  drawDate: { fontSize: 14, color: '#bae6fd', marginTop: 4 },
  prizeSection: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  prizeTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  numbersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  number: { fontFamily: 'monospace', fontSize: 15, fontWeight: '700', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  taxNote: { margin: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
});
