import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, Linking, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';
import { api } from '../../services/api';

const APP_VERSION = '1.0.0';
const CONTACT_EMAIL = 'support@bondcheckbd.com';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, language, setLanguage, logout } = useAuthStore();
  const t = strings[language] ?? strings.en;
  const [referral, setReferral] = useState<{ referralCode: string; referralCount: number; bonusSlots: number; bondLimit: number; maxReferrals: number } | null>(null);

  useEffect(() => {
    api.get('/referrals').then((r) => setReferral(r.data)).catch(() => {});
  }, []);

  async function handleLogout() {
    Alert.alert(t.logout, 'Are you sure?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout, style: 'destructive', onPress: async () => {
          try { await api.post('/auth/logout'); } catch {}
          await logout();
        },
      },
    ]);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: 'Check your Bangladesh prize bond results instantly with BondCheck BD! Add your bonds and get notified when you win. 🎉\n\nhttps://play.google.com/store/apps/details?id=com.bondcheckbd.app',
        title: 'BondCheck BD',
      });
    } catch {}
  }

  async function handleShareReferral() {
    const code = referral?.referralCode ?? '';
    try {
      await Share.share({
        message: `${t.referralShareMsg}\n\n${t.referralShareCode} ${code}\n\nhttps://bondcheckbd.vercel.app/register?ref=${code}`,
      });
    } catch {}
  }

  async function handleCopyCode() {
    if (referral?.referralCode) {
      await Clipboard.setStringAsync(referral.referralCode);
      Alert.alert(t.referralCodeCopied);
    }
  }

  function handleContact() {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=BondCheck BD Feedback`);
  }

  return (
    <ScrollView style={styles.screen}>
      {/* User info */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? 'U')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.badge, user?.tier === 'premium' ? styles.badgePremium : styles.badgeFree]}>
          <Text style={styles.badgeText}>{user?.tier === 'premium' ? '⭐ Premium' : 'Free'}</Text>
        </View>
      </View>

      {/* Language toggle */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Language / ভাষা</Text>
        <View style={styles.langRow}>
          {(['bn', 'en'] as const).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLanguage(l)}
              style={[styles.langBtn, language === l && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, language === l && styles.langBtnTextActive]}>
                {l === 'bn' ? 'বাংলা' : 'English'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Premium */}
      {user?.tier !== 'premium' && (
        <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/premium')}>
          <Text style={styles.premiumIcon}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
            <Text style={styles.premiumSub}>Unlimited bonds, export CSV & more</Text>
          </View>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Referral */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.inviteFriends}</Text>
        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{t.referralDesc}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referral?.referralCode ?? '...'}</Text>
          </View>
          <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>{t.copyCode}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          {referral?.referralCount ?? 0} {t.referrals} = +{referral?.bonusSlots ?? 0} {t.bonusSlots}
        </Text>
        <TouchableOpacity style={styles.shareRefBtn} onPress={handleShareReferral}>
          <Text style={styles.shareRefBtnText}>{t.shareReferral}</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleShare}>
          <Text style={styles.rowIcon}>📤</Text>
          <Text style={styles.rowText}>{t.shareApp}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy')}>
          <Text style={styles.rowIcon}>🔒</Text>
          <Text style={styles.rowText}>{t.privacyPolicy}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={handleContact}>
          <Text style={styles.rowIcon}>✉️</Text>
          <Text style={styles.rowText}>{t.contactUs}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.about}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t.version}</Text>
          <Text style={styles.infoValue}>v{APP_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t.dataSource}</Text>
          <Text style={styles.infoValue}>Bangladesh Bank</Text>
        </View>
        <Text style={styles.infoDesc}>
          BondCheck BD automatically checks your prize bonds against official draw results from Bangladesh Bank (bb.org.bd).
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t.logout}</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, color: '#64748b', marginTop: 2 },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeFree: { backgroundColor: '#f1f5f9' },
  badgePremium: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f1f5f9' },
  langBtnActive: { backgroundColor: '#0284c7' },
  langBtnText: { fontWeight: '600', color: '#64748b' },
  langBtnTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  rowIcon: { fontSize: 18, marginRight: 12 },
  rowText: { flex: 1, fontSize: 15, color: '#334155', fontWeight: '500' },
  rowChevron: { fontSize: 20, color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 13, color: '#334155', fontWeight: '600' },
  infoDesc: { fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 18 },
  premiumCard: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a', flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumIcon: { fontSize: 24 },
  premiumTitle: { fontSize: 15, fontWeight: '700', color: '#92400e' },
  premiumSub: { fontSize: 12, color: '#b45309', marginTop: 2 },
  codeBox: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  codeText: { fontSize: 20, fontWeight: '800', letterSpacing: 4, color: '#0284c7' },
  copyBtn: { backgroundColor: '#e0f2fe', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  copyBtnText: { color: '#0284c7', fontWeight: '600', fontSize: 13 },
  shareRefBtn: { backgroundColor: '#0284c7', borderRadius: 10, padding: 12, alignItems: 'center' },
  shareRefBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginTop: 4 },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
