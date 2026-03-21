import { useEffect, useRef, useState } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { useAuthStore } from '../store/authStore';
import { AD_UNIT_IDS } from '../constants/ads';

/**
 * Shows an interstitial ad every `showEvery` calls to `maybeShow()`.
 * Silently skips for premium users.
 */
export function useInterstitialAd(showEvery = 3) {
  const tier = useAuthStore((s) => s.user?.tier);
  const countRef = useRef(0);
  const adRef = useRef<InterstitialAd | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tier === 'premium') return;
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
    adRef.current = ad;
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => setLoaded(true));
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // pre-load next
    });
    ad.load();
    return () => { unsubLoaded(); unsubClosed(); };
  }, [tier]);

  function maybeShow() {
    if (tier === 'premium') return;
    countRef.current += 1;
    if (countRef.current % showEvery === 0 && loaded && adRef.current) {
      adRef.current.show();
    }
  }

  return { maybeShow };
}
