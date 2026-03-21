import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.subtitle}>BondCheck BD</Text>
      <Text style={styles.date}>Last updated: March 2026</Text>

      <Section title="1. Information We Collect">
        We collect the following information when you use BondCheck BD:{'\n\n'}
        • <B>Account information:</B> Your name and email address when you register.{'\n'}
        • <B>Bond numbers:</B> Prize bond numbers you add to the app for checking.{'\n'}
        • <B>Device token:</B> A push notification token to send you win alerts.{'\n'}
        • <B>Images (optional):</B> Photos of bond certificates you upload for OCR scanning.
      </Section>

      <Section title="2. How We Use Your Information">
        • To check your bonds against official Bangladesh Bank draw results.{'\n'}
        • To send you push notifications and email alerts when you win a prize.{'\n'}
        • To maintain your account and provide customer support.{'\n'}
        • We do NOT sell, rent, or share your personal data with third parties.
      </Section>

      <Section title="3. Data Storage">
        Your data is stored securely on Railway-hosted servers. Bond numbers and account information are stored in an encrypted database. Images uploaded for OCR are stored on Cloudinary and may be deleted after processing.
      </Section>

      <Section title="4. Third-Party Services">
        We use the following third-party services:{'\n\n'}
        • <B>Bangladesh Bank (bb.org.bd):</B> Source of official prize bond draw results.{'\n'}
        • <B>Firebase (Google):</B> Push notification delivery.{'\n'}
        • <B>Cloudinary:</B> Image storage for OCR uploads.{'\n'}
        • <B>Resend:</B> Email delivery for OTP and win notifications.
      </Section>

      <Section title="5. Data Retention">
        Your bond data and account information are retained as long as your account is active. You may delete your bonds at any time from within the app. To delete your account entirely, contact us at support@bondcheckbd.com.
      </Section>

      <Section title="6. Security">
        We use industry-standard security practices including HTTPS encryption, JWT authentication with short expiry times, and secure token storage on your device.
      </Section>

      <Section title="7. Children's Privacy">
        BondCheck BD is not directed at children under 13. We do not knowingly collect personal information from children.
      </Section>

      <Section title="8. Changes to This Policy">
        We may update this Privacy Policy from time to time. Changes will be posted in the app. Continued use of the app after changes constitutes acceptance.
      </Section>

      <Section title="9. Contact Us">
        If you have any questions about this Privacy Policy, please contact us:{'\n\n'}
        📧 support@bondcheckbd.com
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

function B({ children }: { children: string }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#0284c7', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 4 },
  date: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  body: { fontSize: 14, color: '#334155', lineHeight: 22 },
});
