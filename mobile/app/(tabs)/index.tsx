import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

function getNextDrawDate(): Date {
  const now = new Date();
  const y = now.getFullYear();
  const candidates = [
    new Date(y, 0, 31),
    new Date(y, 3, 30),
    new Date(y, 6, 31),
    new Date(y, 9, 31),
    new Date(y + 1, 0, 31),
  ];
  return candidates.find((d) => d > now) ?? candidates[candidates.length - 1];
}

function drawCountdown(t: typeof strings.en): string {
  const next = getNextDrawDate();
  const diff = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t.today;
  if (diff === 1) return t.tomorrow;
  return `${diff} ${t.daysLeft}`;
}

function formatDrawDate(): string {
  return getNextDrawDate().toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getExpiryDays(drawDate: string): number {
  const expiry = new Date(drawDate);
  expiry.setFullYear(expiry.getFullYear() + 2);
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

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

  async function handleShareWin(m: any) {
    const prize = m.drawResult?.prizeAmount ?? 0;
    const afterTax = Math.floor(prize * 0.8);
    try {
      await Share.share({
        message: `🎉 I won ৳${prize.toLocaleString()} in Bangladesh Prize Bond Draw #${m.drawResult?.drawNumber}!\n\nBond #${m.bond?.number}\nAfter 20% tax: ৳${afterTax.toLocaleString()}\n\nCheck your bonds with BondCheck BD 📱`,
        title: 'BondCheck BD — I Won!',
      });
    } catch {}
  }

  const totalValue = (stats?.totalBonds ?? 0) * 100;
  const countdown = drawCountdown(t);

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>{t.greeting}, {user?.name} 👋</Text>
        {stats?.tier === 'free' && (
          <TouchableOpacity onPress={() => router.push('/premium')}>
            <Text style={styles.upgradePill}>⭐ Go Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats?.totalBonds ?? '—'}</Text>
          <Text style={styles.statLabel}>{t.totalBonds}</Text>
          {totalValue > 0 && <Text style={styles.statSub}>৳{totalValue.toLocaleString()}</Text>}
          {stats?.tier === 'free' && stats?.bondLimit && (
            <Text style={styles.statLimit}>{stats.totalBonds}/{stats.bondLimit} used</Text>
          )}
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{stats?.totalWins ?? '—'}</Text>
          <Text style={styles.statLabel}>{t.totalWins}</Text>
          {(stats?.afterTaxEarned ?? 0) > 0 && (
            <Text style={[styles.statSub, { color: '#16a34a' }]}>৳{stats.afterTaxEarned.toLocaleString()} net</Text>
          )}
        </View>
      </View>

      {/* Next draw countdown */}
      <View style={styles.countdownCard}>
        <View>
          <Text style={styles.countdownLabel}>{t.nextDraw}</Text>
          <Text style={styles.countdownDate}>{formatDrawDate()}</Text>
          <Text style={styles.countdownNote}>{t.drawCountdownNote}</Text>
        </View>
        <View style={styles.countdownBadge}>
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
      </View>

      {/* My Wins */}
      <View style={wins.length > 0 ? styles.winsCard : styles.winsCardEmpty}>
        <View style={styles.winsHeader}>
          <Text style={styles.sectionTitle}>🏆 {t.myWins}</Text>
          {wins.length > 5 && (
            <Text style={styles.seeAll}>{wins.length} total</Text>
          )}
        </View>
        {wins.length === 0 ? (
          <Text style={styles.winsEmpty}>{t.winsNoWins}</Text>
        ) : (
          wins.slice(0, 5).map((m: any) => {
            const prize = m.drawResult?.prizeAmount ?? 0;
            const drawDate = m.drawResult?.drawDate;
            const expiryDays = drawDate ? getExpiryDays(drawDate) : null;
            const expiringSoon = expiryDays !== null && expiryDays <= 90 && expiryDays > 0;
            return (
              <View key={m.id} style={styles.winRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.winBond}>#{m.bond?.number ?? '—'}</Text>
                  <Text style={styles.winDrawLabel}>Draw #{m.drawResult?.drawNumber}</Text>
                  {expiringSoon && (
                    <Text style={styles.expiryWarning}>⚠️ {expiryDays} {t.daysToExpiry}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.winPrize}>৳{prize.toLocaleString()}</Text>
                  <Text style={styles.winAfterTax}>৳{Math.floor(prize * 0.8).toLocaleString()} {t.afterTax}</Text>
                  <TouchableOpacity onPress={() => handleShareWin(m)}>
                    <Text style={styles.shareBtn}>Share 📤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Latest draw */}
      {latest && (
        <View style={styles.drawCard}>
          <Text style={styles.sectionTitle}>{t.latestDraw} #{latest.drawNumber}</Text>
          {latest.results?.slice(0, 6).map((r: any) => (
            <View key={r.id} style={styles.drawRow}>
              <Text style={styles.drawLabel}>Prize {r.prizeRank}</Text>
              <Text style={styles.drawNum}>{r.winningNumber}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/(tabs)/results')}>
            <Text style={styles.viewAll}>View all results →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(tabs)/scan')}>
          <Text style={styles.btnPrimaryText}>📷 {t.scanBond}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(tabs)/bonds')}>
          <Text style={styles.btnSecondaryText}>+ {t.addBond}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  greeting: { padding: 20, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingText: { fontSize: 20, fontWeight: '700' },
  upgradePill: { fontSize: 12, fontWeight: '700', color: '#92400e', backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statCard: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  statNum: { fontSize: 28, fontWeight: '700', color: '#0284c7' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statSub: { fontSize: 11, color: '#0284c7', marginTop: 4, fontWeight: '600' },
  statLimit: { fontSize: 10, color: '#f59e0b', marginTop: 2, fontWeight: '600' },
  countdownCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0284c7', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdownLabel: { fontSize: 12, color: '#bae6fd', fontWeight: '600', marginBottom: 2 },
  countdownDate: { fontSize: 15, color: '#fff', fontWeight: '700' },
  countdownNote: { fontSize: 11, color: '#bae6fd', marginTop: 2 },
  countdownBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, alignItems: 'center' },
  countdownNum: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  winsCard: { margin: 16, marginTop: 0, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  winsCardEmpty: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  winsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  winsEmpty: { fontSize: 13, color: '#94a3b8' },
  seeAll: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  drawCard: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontWeight: '600', fontSize: 15, marginBottom: 10 },
  winRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#dcfce7' },
  winBond: { fontFamily: 'monospace', fontSize: 14, fontWeight: '700' },
  winDrawLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  expiryWarning: { fontSize: 11, color: '#f59e0b', fontWeight: '600', marginTop: 2 },
  winPrize: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  winAfterTax: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  shareBtn: { fontSize: 11, color: '#0284c7', fontWeight: '600', marginTop: 4 },
  drawRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  drawLabel: { fontSize: 13, color: '#64748b' },
  drawNum: { fontFamily: 'monospace', fontSize: 14, fontWeight: '600' },
  viewAll: { fontSize: 12, color: '#0284c7', fontWeight: '600', marginTop: 10, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: '#0284c7', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  btnSecondaryText: { color: '#334155', fontWeight: '600', fontSize: 15 },
});
