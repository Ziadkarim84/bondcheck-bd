import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';
import { api } from '../../services/api';

export default function SettingsScreen() {
  const { user, language, setLanguage, logout } = useAuthStore();
  const t = strings[language] ?? strings.en;

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

  return (
    <View style={styles.screen}>
      {/* User info */}
      <View style={styles.card}>
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

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.infoText}>BondCheck BD v1.0.0</Text>
        <Text style={styles.infoText}>Bangladesh Prize Bond Checker</Text>
        <Text style={styles.infoText}>Data source: Bangladesh Bank (bb.org.bd)</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t.logout}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
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
  infoText: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginTop: 8 },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
