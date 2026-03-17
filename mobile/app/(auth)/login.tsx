import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<'password' | 'otp'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin() {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await setAuth(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    setLoading(true);
    try {
      await api.post('/auth/otp/send', { email });
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpLogin() {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { email, otp });
      await setAuth(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>BondCheck BD</Text>
      <Text style={styles.subtitle}>প্রাইজবন্ড চেকার</Text>

      <View style={styles.modeRow}>
        {(['otp', 'password'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'otp' ? 'Email OTP' : 'Password'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {mode === 'password' && (
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}

      {mode === 'otp' && otpSent && (
        <TextInput
          style={[styles.input, styles.otpInput]}
          placeholder="6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
      )}

      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 16 }} />
      ) : (
        <TouchableOpacity
          style={styles.btn}
          onPress={
            mode === 'password'
              ? handlePasswordLogin
              : otpSent
              ? handleOtpLogin
              : handleSendOtp
          }
        >
          <Text style={styles.btnText}>
            {mode === 'password' ? 'Sign In' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 16 }}>
        <Text style={styles.link}>No account? Register →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '700', color: '#0284c7', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  modeRow: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  modeBtnActive: { backgroundColor: '#0284c7' },
  modeBtnText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  modeBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#fff', marginBottom: 12 },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  btn: { backgroundColor: '#0284c7', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: { color: '#0284c7', textAlign: 'center', fontSize: 14 },
});
