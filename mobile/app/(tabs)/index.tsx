import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

export default function HomeScreen() {
  const router = useRouter();
  const { user, language } = useAuthStore();
  const t = strings[language] ?? strings.en;
  const [latest, setLatest] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [wins, setWins] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [r, s, w] = await Promise.all([
        api.get('/results/latest').then((r) => r.data),
        api.get('/bonds/stats').then((r) => r.data),
        api.get('/matches').then((r) => r.data),
      ]);
      setLatest(r);
      setStats(s);
      setWins(w);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>স্বাগতম, {user?.name} 👋</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats?.totalBonds ?? '—'}</Text>
          <Text style={styles.statLabel}>{t.totalBonds}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{stats?.totalWins ?? '—'}</Text>
          <Text style={styles.statLabel}>{t.totalWins}</Text>
        </View>
      </View>

      <View style={wins.length > 0 ? styles.winsCard : styles.winsCardEmpty}>
        <Text style={styles.sectionTitle}>🏆 {t.myWins}</Text>
        {wins.length === 0 ? (
          <Text style={styles.winsEmpty}>No wins yet — add your bonds and we'll check automatically.</Text>
        ) : (
          <>
            {wins.slice(0, 5).map((m: any) => (
              <View key={m.id} style={styles.winRow}>
                <View>
                  <Text style={styles.winBond}>#{m.bond?.number ?? '—'}</Text>
                  <Text style={styles.winDrawLabel}>Draw #{m.drawResult?.drawNumber}</Text>
                </View>
                <Text style={styles.winPrize}>৳{(m.drawResult?.prizeAmount ?? 0).toLocaleString()}</Text>
              </View>
            ))}
            {wins.length > 5 && (
              <Text style={styles.winsMore}>+{wins.length - 5} more wins</Text>
            )}
          </>
        )}
      </View>

      {latest && (
        <View style={styles.drawCard}>
          <Text style={styles.sectionTitle}>{t.latestDraw} #{latest.drawNumber}</Text>
          {latest.results?.slice(0, 6).map((r: any) => (
            <View key={r.id} style={styles.drawRow}>
              <Text style={styles.drawLabel}>Prize {r.prizeRank}</Text>
              <Text style={styles.drawNum}>{r.winningNumber}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(tabs)/scan')}>
          <Text style={styles.btnPrimaryText}>📷 {t.scanBond}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(tabs)/bonds')}>
          <Text style={styles.btnSecondaryText}>+ {t.addBond}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  greeting: { padding: 20, paddingBottom: 0 },
  greetingText: { fontSize: 20, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statCard: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  statNum: { fontSize: 28, fontWeight: '700', color: '#0284c7' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  winsCard: { margin: 16, marginTop: 0, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  winsCardEmpty: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  winsEmpty: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  winDrawLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  winsMore: { fontSize: 12, color: '#16a34a', marginTop: 8, fontWeight: '600' },
  drawCard: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontWeight: '600', fontSize: 15, marginBottom: 10 },
  winRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  winBond: { fontFamily: 'monospace', fontSize: 14 },
  winPrize: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  drawRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  drawLabel: { fontSize: 13, color: '#64748b' },
  drawNum: { fontFamily: 'monospace', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  btnPrimary: { flex: 1, backgroundColor: '#0284c7', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  btnSecondaryText: { color: '#334155', fontWeight: '600', fontSize: 15 },
});
