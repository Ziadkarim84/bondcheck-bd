import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

const PRIZE_INFO: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: '🥇', color: '#92400e', bg: '#fef3c7' },
  2: { emoji: '🥈', color: '#374151', bg: '#f3f4f6' },
  3: { emoji: '🥉', color: '#78350f', bg: '#fef9c3' },
  4: { emoji: '🏅', color: '#1e40af', bg: '#eff6ff' },
  5: { emoji: '🎖️', color: '#166534', bg: '#f0fdf4' },
};

function DrawDetail({ draw }: { draw: any }) {
  const grouped: Record<number, any[]> = {};
  for (const r of draw.results ?? []) {
    (grouped[r.prizeRank] = grouped[r.prizeRank] ?? []).push(r);
  }

  return (
    <>
      {Object.entries(grouped).map(([rank, items]) => {
        const info = PRIZE_INFO[Number(rank)];
        const amount = (items as any[])[0].prizeAmount;
        return (
          <View key={rank} style={[styles.prizeSection, { borderColor: info.bg }]}>
            <Text style={[styles.prizeTitle, { color: info.color }]}>
              {info.emoji} Prize {rank} — ৳{amount.toLocaleString()}
            </Text>
            <View style={styles.numbersWrap}>
              {(items as any[]).map((r: any) => (
                <Text key={r.id} style={[styles.number, { backgroundColor: info.bg }]}>
                  {r.winningNumber}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

export default function ResultsScreen() {
  const [latest, setLatest] = useState<any>(null);
  const [draws, setDraws] = useState<any[]>([]);
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [latestRes, drawsRes] = await Promise.all([
        api.get('/results/latest').then((r) => r.data),
        api.get('/results').then((r) => r.data),
      ]);
      setLatest(latestRes);
      setDraws(drawsRes.draws ?? []);
    } catch {}
  }

  async function loadDraw(drawNumber: number) {
    if (drawNumber === latest?.drawNumber) { setSelectedDraw(null); setSelectedData(null); return; }
    setSelectedDraw(drawNumber);
    setLoadingSelected(true);
    try {
      const { data } = await api.get(`/results/${drawNumber}`);
      setSelectedData(data);
    } catch {} finally { setLoadingSelected(false); }
  }

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const shownDraw = selectedData ?? latest;
  const previousDraws = draws.filter((d) => d.drawNumber !== latest?.drawNumber);

  if (!latest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No draw results available yet.</Text>
        <Text style={styles.emptySubtext}>Results are published on the last day of Jan, Apr, Jul, Oct.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.drawTitle}>
          Draw #{shownDraw?.drawNumber}
          {selectedDraw === null && <Text style={styles.latestBadge}> Latest</Text>}
        </Text>
        <Text style={styles.drawDate}>
          {shownDraw?.drawDate
            ? new Date(shownDraw.drawDate).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })
            : ''}
        </Text>
      </View>

      {loadingSelected ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#0284c7" />
      ) : (
        <DrawDetail draw={shownDraw} />
      )}

      <Text style={styles.taxNote}>
        ⚠️ 20% source tax applies. Claim within 2 years.
      </Text>

      {/* Previous draws */}
      {previousDraws.length > 0 && (
        <View style={styles.prevCard}>
          <Text style={styles.prevTitle}>Previous Draws</Text>
          {previousDraws.map((d) => (
            <TouchableOpacity
              key={d.drawNumber}
              style={[styles.prevRow, selectedDraw === d.drawNumber && styles.prevRowActive]}
              onPress={() => loadDraw(d.drawNumber)}
            >
              <Text style={[styles.prevDrawNum, selectedDraw === d.drawNumber && styles.prevDrawNumActive]}>
                Draw #{d.drawNumber}
              </Text>
              <Text style={styles.prevDrawDate}>
                {new Date(d.drawDate).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
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
  latestBadge: { fontSize: 14, fontWeight: '500', color: '#bae6fd' },
  drawDate: { fontSize: 14, color: '#bae6fd', marginTop: 4 },
  prizeSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prizeTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  numbersWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  number: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  taxNote: { marginHorizontal: 16, marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  prevCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  prevTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  prevRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  prevRowActive: { backgroundColor: '#eff6ff' },
  prevDrawNum: { fontSize: 14, fontWeight: '600', color: '#334155' },
  prevDrawNumActive: { color: '#0284c7' },
  prevDrawDate: { fontSize: 12, color: '#94a3b8' },
});
