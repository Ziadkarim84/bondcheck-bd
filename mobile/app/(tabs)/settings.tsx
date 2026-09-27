import { Linking, ScrollView, Share, Switch, ToastAndroid, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useApp } from '../../src/store';
import { SITE_URL } from '../../src/results';
import { strings, num } from '../../src/i18n';
import { usePalette } from '../../src/theme';
import { adsPrivacyRequired, showAdPrivacyOptions } from '../../src/ads';
import { askNotificationPermission } from '../../src/notify';
import { Card, Row, Segmented, T } from '../../src/ui/kit';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.bondcheckbd.app';
const CONTACT = 'zklab@hundredships.com';

export default function Settings() {
  const router = useRouter();
  const p = usePalette();
  const s = useApp();
  const t = strings[s.lang];

  async function backup() {
    const f = new File(Paths.cache, `bondcheck-backup-${new Date().toISOString().slice(0, 10)}.json`);
    f.write(JSON.stringify({ app: 'bondcheck-bd', version: 1, bonds: s.bonds }));
    await Sharing.shareAsync(f.uri, { mimeType: 'application/json' });
  }

  async function restore() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    try {
      const data = JSON.parse(new File(res.assets[0].uri).textSync());
      const bonds = (Array.isArray(data) ? data : data.bonds).map(String).filter((b: string) => /^\d{7}$/.test(b));
      const { added } = s.addBonds(bonds);
      ToastAndroid.show(t.restored(num(s.lang, added)), ToastAndroid.LONG);
    } catch {
      ToastAndroid.show(t.restoreFailed, ToastAndroid.LONG);
    }
  }

  async function toggleNotifications(on: boolean) {
    if (on && !(await askNotificationPermission())) return;
    s.set({ notifications: on });
  }

  const group = (children: React.ReactNode) => <Card style={{ padding: 0, paddingVertical: 4, marginTop: 12 }}>{children}</Card>;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.ground }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <T v="display" style={{ paddingHorizontal: 8, marginBottom: 8 }}>{t.settingsTitle}</T>

        {group(
          <Row icon={s.isPro ? 'checkmark-circle' : 'infinite'} tone="accent" title={s.isPro ? t.proActive : t.pro} subtitle={s.isPro ? undefined : t.getPro} onPress={s.isPro ? undefined : () => router.push('/pro')} />,
        )}

        <T v="label" style={{ marginTop: 24, marginLeft: 8 }}>{t.language}</T>
        <View style={{ marginTop: 8 }}>
          <Segmented options={[{ key: 'bn', label: 'বাংলা' }, { key: 'en', label: 'English' }]} value={s.lang} onChange={(k) => s.set({ lang: k as 'bn' | 'en' })} />
        </View>

        {group(
          <Row
            icon="notifications-outline"
            tone="accent"
            title={t.notifications}
            subtitle={t.notificationsHint}
            right={<Switch value={s.notifications} onValueChange={toggleNotifications} trackColor={{ true: p.accent, false: p.line }} thumbColor="#fff" />}
          />,
        )}

        {group(
          <>
            <Row icon="cloud-upload-outline" tone="accent" title={t.backup} subtitle={t.backupHint} onPress={backup} />
            <Row icon="cloud-download-outline" tone="accent" title={t.restore} subtitle={t.restoreHint} onPress={restore} />
          </>,
        )}

        {group(
          <>
            <Row icon="share-social-outline" title={t.shareApp} onPress={() => Share.share({ message: `${t.shareMessage}\n${PLAY_URL}` })} />
            <Row icon="globe-outline" title={t.resultsWebsite} onPress={() => Linking.openURL(SITE_URL)} />
            <Row icon="lock-closed-outline" title={t.privacy} onPress={() => Linking.openURL(`${SITE_URL}/privacy/`)} />
            {adsPrivacyRequired() && !s.isPro && <Row icon="shield-outline" title={t.adPrivacy} onPress={showAdPrivacyOptions} />}
            <Row icon="mail-outline" title={t.contact} subtitle={CONTACT} onPress={() => Linking.openURL(`mailto:${CONTACT}?subject=BondCheck BD`)} />
          </>,
        )}

        <T v="caption" style={{ textAlign: 'center', marginTop: 24 }}>{`${t.appName} · ${t.version} ${Constants.expoConfig?.version ?? ''}`}</T>
      </ScrollView>
    </SafeAreaView>
  );
}
