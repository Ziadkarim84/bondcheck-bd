import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAuthStore } from '../store/authStore';
import { AD_UNIT_IDS } from '../constants/ads';

/**
 * Shows a banner ad only for free-tier users.
 * Premium users see nothing.
 */
export default function AdBanner() {
  const tier = useAuthStore((s) => s.user?.tier);
  if (tier === 'premium') return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
