import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const FREE_FEATURES = [
  { label: 'Up to 50 bonds', ok: true },
  { label: 'Manual & range entry', ok: true },
  { label: 'Win notifications', ok: true },
  { label: 'Latest draw results', ok: true },
  { label: 'Unlimited bonds', ok: false },
  { label: 'Export bonds as CSV', ok: false },
  { label: 'Full prize analytics', ok: false },
  { label: 'Priority support', ok: false },
];

const PREMIUM_FEATURES = [
  { label: 'Everything in Free', ok: true },
  { label: 'Unlimited bonds', ok: true },
  { label: 'Export bonds as CSV', ok: true },
  { label: 'Full prize analytics', ok: true },
  { label: 'Priority support', ok: true },
  { label: 'Early access to new features', ok: true },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  if (user?.tier === 'premium') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>⭐ Premium Active</Text>
        </View>
        <Text style={styles.activeTitle}>You're on Premium!</Text>
        <Text style={styles.activeDesc}>Thank you for supporting BondCheck BD. You have access to all premium features.</Text>
        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.crown}>⭐</Text>
        <Text style={styles.headerTitle}>BondCheck BD Premium</Text>
        <Text style={styles.headerSub}>Unlock unlimited bonds & powerful features</Text>
      </View>

      {/* Comparison */}
      <View style={styles.comparisonRow}>
        {/* Free */}
        <View style={[styles.plan, styles.planFree]}>
          <Text style={styles.planTitle}>Free</Text>
          <Text style={styles.planPrice}>৳0</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={[styles.featureCheck, !f.ok && styles.featureCross]}>
                {f.ok ? '✓' : '✗'}
              </Text>
              <Text style={[styles.featureLabel, !f.ok && styles.featureDim]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Premium */}
        <View style={[styles.plan, styles.planPremium]}>
          <View style={styles.popularBadge}><Text style={styles.popularText}>POPULAR</Text></View>
          <Text style={[styles.planTitle, { color: '#fff' }]}>Premium</Text>
          <View style={styles.priceRow}>
            <Text style={styles.planPricePremium}>৳99</Text>
            <Text style={styles.planPriceUnit}>/mo</Text>
          </View>
          {PREMIUM_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: '#fde68a' }]}>✓</Text>
              <Text style={[styles.featureLabel, { color: '#fff' }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Yearly deal */}
      <View style={styles.yearlyCard}>
        <View>
          <Text style={styles.yearlyTitle}>Lifetime Plan</Text>
          <Text style={styles.yearlySub}>৳999 — pay once, own forever</Text>
        </View>
        <View style={styles.saveBadge}><Text style={styles.saveText}>BEST VALUE</Text></View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => Alert.alert('Coming Soon', 'In-app purchases will be available shortly. Stay tuned!')}
      >
        <Text style={styles.ctaBtnText}>Upgrade to Premium →</Text>
      </TouchableOpacity>

      <Text style={styles.note}>Payments via Google Play. Cancel anytime.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#0284c7', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  crown: { fontSize: 56, marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  headerSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6 },
  comparisonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  plan: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  planFree: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  planPremium: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  planPricePremium: { fontSize: 22, fontWeight: '800', color: '#fff' },
  planPriceUnit: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginLeft: 2 },
  popularBadge: { backgroundColor: '#fbbf24', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 },
  popularText: { fontSize: 10, fontWeight: '800', color: '#78350f' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  featureCheck: { color: '#16a34a', fontWeight: '700', marginRight: 6, fontSize: 13, width: 14 },
  featureCross: { color: '#cbd5e1' },
  featureLabel: { fontSize: 12, color: '#334155', flex: 1, lineHeight: 18 },
  featureDim: { color: '#94a3b8' },
  yearlyCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  yearlyTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  yearlySub: { fontSize: 13, color: '#16a34a', marginTop: 2 },
  saveBadge: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  saveText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  ctaBtn: { backgroundColor: '#0284c7', borderRadius: 14, padding: 18, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  note: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  activeBadge: { backgroundColor: '#fef9c3', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center', marginBottom: 16 },
  activeBadgeText: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  activeTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  activeDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  featureList: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
});
