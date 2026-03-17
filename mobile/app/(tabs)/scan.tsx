import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../constants/strings';

type Status = 'idle' | 'uploading' | 'processing' | 'confirm' | 'done';

export default function ScanScreen() {
  const router = useRouter();
  const lang = useAuthStore((s) => s.language);
  const t = strings[lang];
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [numbers, setNumbers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobId, setJobId] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const cameraRef = useRef<CameraView>(null);

  async function processImage(uri: string) {
    setPreviewUri(uri);
    setStatus('uploading');

    const formData = new FormData();
    formData.append('image', { uri, name: 'bond.jpg', type: 'image/jpeg' } as any);

    try {
      const { data } = await api.post('/bonds/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJobId(data.jobId);
      setStatus('processing');
      pollJob(data.jobId);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Upload failed');
      setStatus('idle');
    }
  }

  function pollJob(id: string) {
    const interval = setInterval(async () => {
      try {
        const { data: job } = await api.get(`/bonds/ocr/${id}`);
        if (job.status === 'done') {
          clearInterval(interval);
          const nums = (job.resultJson?.numbers ?? []) as string[];
          setNumbers(nums);
          setSelected(nums);
          setStatus('confirm');
        } else if (job.status === 'failed') {
          clearInterval(interval);
          Alert.alert('OCR Failed', job.error ?? 'Could not detect bond numbers. Try a clearer photo.');
          setStatus('idle');
        }
      } catch {
        clearInterval(interval);
        setStatus('idle');
      }
    }, 2000);
  }

  async function captureFromCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setShowCamera(true);
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (photo) {
      setShowCamera(false);
      processImage(photo.uri);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  }

  async function confirmSave() {
    try {
      await api.post(`/bonds/ocr/${jobId}/confirm`, { numbers: selected });
      setStatus('done');
      setTimeout(() => {
        setStatus('idle');
        setNumbers([]);
        setSelected([]);
        setPreviewUri('');
        router.replace('/(tabs)/bonds');
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Failed to save');
    }
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame} />
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (status === 'done') {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 60 }}>✅</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: '#16a34a' }}>
          {selected.length} bond(s) saved!
        </Text>
      </View>
    );
  }

  if (status === 'confirm') {
    return (
      <ScrollView contentContainerStyle={styles.confirmContainer}>
        {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}
        <Text style={styles.confirmTitle}>Found {numbers.length} bond number(s)</Text>
        <Text style={styles.confirmSub}>Select which to save:</Text>
        {numbers.length === 0 && (
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 16 }}>
            No 7-digit numbers detected. Try a clearer photo.
          </Text>
        )}
        {numbers.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setSelected((s) => s.includes(n) ? s.filter((x) => x !== n) : [...s, n])}
            style={[styles.numCard, selected.includes(n) && styles.numCardSelected]}
          >
            <Text style={styles.numText}>{n}</Text>
            <Text>{selected.includes(n) ? '✅' : '⬜'}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.btn, !selected.length && { opacity: 0.4 }]}
            onPress={confirmSave}
            disabled={!selected.length}
          >
            <Text style={styles.btnText}>{t.save} {selected.length} bond(s)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCancel} onPress={() => { setStatus('idle'); setNumbers([]); }}>
            <Text style={{ color: '#64748b' }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t.scanBond}</Text>
      <Text style={styles.subtitle}>Scan your prize bond to register the number automatically</Text>

      {previewUri && status !== 'idle' && (
        <Image source={{ uri: previewUri }} style={styles.preview} />
      )}

      {(status === 'uploading' || status === 'processing') && (
        <View style={styles.processingBox}>
          <ActivityIndicator color="#0284c7" size="large" />
          <Text style={styles.processingText}>
            {status === 'uploading' ? 'Uploading...' : '🔍 Reading bond number...'}
          </Text>
        </View>
      )}

      {status === 'idle' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.optionBtn} onPress={captureFromCamera}>
            <Text style={styles.optionEmoji}>📷</Text>
            <Text style={styles.optionLabel}>Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtn} onPress={pickFromGallery}>
            <Text style={styles.optionEmoji}>🖼️</Text>
            <Text style={styles.optionLabel}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.tip}>
        💡 Tip: Make sure the bond number is clearly visible and in focus. Both Bangla and English digits are supported.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  processingBox: { alignItems: 'center', gap: 12, padding: 24 },
  processingText: { color: '#0284c7', fontSize: 16, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  optionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  optionEmoji: { fontSize: 40, marginBottom: 8 },
  optionLabel: { fontSize: 14, fontWeight: '600', color: '#334155', textAlign: 'center' },
  tip: { position: 'absolute', bottom: 32, left: 24, right: 24, fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  confirmContainer: { padding: 24 },
  confirmTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  confirmSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  numCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  numCardSelected: { borderColor: '#0284c7', backgroundColor: '#eff6ff' },
  numText: { fontFamily: 'monospace', fontSize: 20, fontWeight: '700' },
  btn: { flex: 1, backgroundColor: '#0284c7', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnCancel: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, alignItems: 'center', paddingHorizontal: 20 },
  cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },
  cameraFrame: { position: 'absolute', top: '25%', left: '10%', right: '10%', height: 200, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 12 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  cancelBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
