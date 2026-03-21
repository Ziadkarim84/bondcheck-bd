import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🎫',
    title: 'Track Your Prize Bonds',
    body: 'Add all your Bangladesh Prize Bond numbers in one place. We keep them safe and organised.',
  },
  {
    emoji: '📷',
    title: 'Scan or Type',
    body: 'Type bond numbers manually, add a range at once (e.g. 0000010–0000100), or scan your bond certificate photo.',
  },
  {
    emoji: '🏆',
    title: 'Win Alerts — Instantly',
    body: 'Every draw, we automatically check your bonds against official Bangladesh Bank results and notify you the moment you win.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  async function finish() {
    await SecureStore.setItemAsync('onboarding_done', '1');
    router.replace('/(auth)/login');
  }

  function next() {
    if (index < SLIDES.length - 1) setIndex(index + 1);
    else finish();
  }

  const slide = SLIDES[index];

  return (
    <View style={styles.screen}>
      <View style={styles.skip}>
        {index < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.body}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>
          {index === SLIDES.length - 1 ? 'Get Started →' : 'Next →'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  skip: { width: '100%', alignItems: 'flex-end', paddingTop: 60 },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  body: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 24 },
  btn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, width: '100%', alignItems: 'center' },
  btnText: { color: '#0284c7', fontSize: 17, fontWeight: '700' },
});
