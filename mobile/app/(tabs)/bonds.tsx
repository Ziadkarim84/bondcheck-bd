import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

interface Bond { id: string; number: string; series?: string; addedVia: string; createdAt: string; }

export default function BondsScreen() {
  const lang = useAuthStore((s) => s.language);
  const t = strings[lang];
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [number, setNumber] = useState('');
  const [series, setSeries] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/bonds');
      setBonds(data);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!/^\d{7}$/.test(number)) {
      Alert.alert('Error', 'Enter a valid 7-digit bond number');
      return;
    }
    try {
      await api.post('/bonds', { number, series: series || undefined });
      setNumber('');
      setSeries('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Failed to add bond');
    }
  }

  async function handleDelete(id: string, num: string) {
    Alert.alert('Delete Bond', `Remove bond #${num}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/bonds/${id}`);
        load();
      }},
    ]);
  }

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={styles.screen}>
      <View style={styles.addSection}>
        <Text style={styles.label}>{t.addBond}</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="7-digit number"
            value={number}
            onChangeText={setNumber}
            keyboardType="number-pad"
            maxLength={7}
          />
          <TextInput
            style={[styles.input, { width: 80 }]}
            placeholder="Series"
            value={series}
            onChangeText={setSeries}
            maxLength={5}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.listHeader}>Your Bonds ({bonds.length})</Text>

      <FlatList
        data={bonds}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: b }) => (
          <View style={styles.bondCard}>
            <View>
              <Text style={styles.bondNum}>{b.number}</Text>
              <Text style={styles.bondMeta}>
                {b.addedVia === 'ocr' ? '📷' : '✏️'} {new Date(b.createdAt).toLocaleDateString()}
                {b.series ? ` · ${b.series}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(b.id, b.number)}>
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No bonds yet. Add your first bond above.</Text>}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  addSection: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  addBtn: { backgroundColor: '#0284c7', borderRadius: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  listHeader: { fontSize: 13, fontWeight: '600', color: '#64748b', padding: 16, paddingBottom: 4 },
  bondCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  bondNum: { fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
  bondMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  deleteBtn: { color: '#fca5a5', fontSize: 18, padding: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
