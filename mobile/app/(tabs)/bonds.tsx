import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, RefreshControl, Clipboard } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

interface Bond { id: string; number: string; series?: string; addedVia: string; createdAt: string; }

export default function BondsScreen() {
  const lang = useAuthStore((s) => s.language);
  const t = strings[lang] ?? strings.en;
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [rangeMode, setRangeMode] = useState(false);
  const [number, setNumber] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [series, setSeries] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/bonds');
      setBonds(data);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (rangeMode) {
      if (!/^\d{7}$/.test(rangeFrom) || !/^\d{7}$/.test(rangeTo)) {
        Alert.alert('Error', 'Enter valid 7-digit numbers for both From and To');
        return;
      }
      if (parseInt(rangeFrom, 10) > parseInt(rangeTo, 10)) {
        Alert.alert('Error', '"From" must be ≤ "To"');
        return;
      }
      const count = parseInt(rangeTo, 10) - parseInt(rangeFrom, 10) + 1;
      if (count > 1000) { Alert.alert('Error', 'Range too large — max 1000 bonds at once'); return; }
      setAdding(true);
      try {
        const { data } = await api.post('/bonds/range', { from: rangeFrom, to: rangeTo, series: series || undefined });
        Alert.alert('Done', `Added ${data.added} bond${data.added !== 1 ? 's' : ''}`);
        setRangeFrom(''); setRangeTo(''); setSeries('');
        load();
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error ?? 'Failed to add range');
      } finally { setAdding(false); }
    } else {
      if (!/^\d{7}$/.test(number)) {
        Alert.alert('Error', 'Enter a valid 7-digit bond number');
        return;
      }
      setAdding(true);
      try {
        await api.post('/bonds', { number, series: series || undefined });
        setNumber(''); setSeries('');
        load();
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error ?? 'Failed to add bond');
      } finally { setAdding(false); }
    }
  }

  async function handleDelete(id: string, num: string) {
    Alert.alert('Delete Bond', `Remove bond #${num}?`, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: async () => {
        await api.delete(`/bonds/${id}`);
        load();
      }},
    ]);
  }

  function handleLongPress(num: string) {
    Clipboard.setString(num);
    Alert.alert('', t.copyNumber);
  }

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = search.trim()
    ? bonds.filter((b) =>
        b.number.includes(search.trim()) ||
        (b.series ?? '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : bonds;

  const totalValue = bonds.length * 100;

  return (
    <View style={styles.screen}>
      <View style={styles.addSection}>
        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !rangeMode && styles.modeBtnActive]}
            onPress={() => setRangeMode(false)}
          >
            <Text style={[styles.modeBtnText, !rangeMode && styles.modeBtnTextActive]}>Single</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, rangeMode && styles.modeBtnActive]}
            onPress={() => setRangeMode(true)}
          >
            <Text style={[styles.modeBtnText, rangeMode && styles.modeBtnTextActive]}>Range</Text>
          </TouchableOpacity>
        </View>

        {rangeMode ? (
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="From (0000010)"
              value={rangeFrom}
              onChangeText={setRangeFrom}
              keyboardType="number-pad"
              maxLength={7}
            />
            <Text style={styles.rangeDash}>–</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="To (0000100)"
              value={rangeTo}
              onChangeText={setRangeTo}
              keyboardType="number-pad"
              maxLength={7}
            />
            <TextInput
              style={[styles.input, { width: 72 }]}
              placeholder="Series"
              value={series}
              onChangeText={setSeries}
              maxLength={5}
            />
            <TouchableOpacity style={[styles.addBtn, adding && { opacity: 0.5 }]} onPress={handleAdd} disabled={adding}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
            <TouchableOpacity style={[styles.addBtn, adding && { opacity: 0.5 }]} onPress={handleAdd} disabled={adding}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search + summary */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={t.searchBonds}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.listHeader}>
          {search ? `${filtered.length} / ${bonds.length}` : bonds.length} bonds
        </Text>
        {totalValue > 0 && (
          <Text style={styles.valueText}>৳{totalValue.toLocaleString()} · {t.bondValueNote}</Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: b }) => (
          <TouchableOpacity
            style={styles.bondCard}
            onLongPress={() => handleLongPress(b.number)}
            delayLongPress={400}
          >
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
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'No bonds match your search.' : t.noBondsYet + ' ' + t.addBond + ' above.'}
          </Text>
        }
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  addSection: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modeRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 10 },
  modeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  modeBtnTextActive: { color: '#0284c7' },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rangeDash: { fontSize: 16, color: '#94a3b8', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  addBtn: { backgroundColor: '#0284c7', borderRadius: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  searchBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  listHeader: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  valueText: { fontSize: 11, color: '#0284c7', fontWeight: '600' },
  bondCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  bondNum: { fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
  bondMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  deleteBtn: { color: '#fca5a5', fontSize: 18, padding: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
