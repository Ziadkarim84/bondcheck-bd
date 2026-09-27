// AdMob: consent first (UMP), then a banner on list screens, at most one
// interstitial per session after adding bonds, and an opt-in rewarded ad for
// extra bond slots. Pro users see none of it. Debug builds use Google's test IDs.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useApp } from './store';

const UNITS = {
  banner: __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-1144671244479208/2473848269',
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-1144671244479208/4486735681',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-1144671244479208/2613260398',
};

let ready = false;
let readyListeners: (() => void)[] = [];
let privacyOptionsRequired = false;

export async function initAds() {
  if (ready) return;
  try {
    const info = await AdsConsent.gatherConsent();
    privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
    if (!info.canRequestAds) return;
    await mobileAds().initialize();
    ready = true;
    readyListeners.forEach((l) => l());
    readyListeners = [];
    preloadInterstitial();
    preloadRewarded();
  } catch {
    // No ads is always an acceptable outcome.
  }
}

export const adsPrivacyRequired = () => privacyOptionsRequired;
export const showAdPrivacyOptions = () => AdsConsent.showPrivacyOptionsForm().catch(() => {});

function useAdsReady() {
  const [r, setR] = useState(ready);
  useEffect(() => {
    if (!r) readyListeners.push(() => setR(true));
  }, [r]);
  return r;
}

export function Banner() {
  const isPro = useApp((s) => s.isPro);
  const r = useAdsReady();
  const [failed, setFailed] = useState(false);
  if (isPro || !r || failed) return null;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <BannerAd unitId={UNITS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}

// Interstitial: at most once per app session, only after the user has added bonds.
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let interstitialShownThisSession = false;

function preloadInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(UNITS.interstitial);
  interstitial.addAdEventListener(AdEventType.LOADED, () => (interstitialLoaded = true));
  interstitial.addAdEventListener(AdEventType.ERROR, () => (interstitialLoaded = false));
  interstitial.load();
}

export function maybeShowInterstitial() {
  if (!ready || useApp.getState().isPro || interstitialShownThisSession || !interstitialLoaded || !interstitial) return;
  interstitialShownThisSession = true;
  interstitial.show().catch(() => {});
}

// Rewarded: the user chooses to watch one for extra bond slots.
let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;
let onReward: (() => void) | null = null;

function preloadRewarded() {
  rewardedLoaded = false;
  rewarded = RewardedAd.createForAdRequest(UNITS.rewarded);
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => (rewardedLoaded = true));
  rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    onReward?.();
    onReward = null;
  });
  rewarded.addAdEventListener(AdEventType.CLOSED, preloadRewarded);
  rewarded.addAdEventListener(AdEventType.ERROR, () => (rewardedLoaded = false));
  rewarded.load();
}

/** Shows a rewarded ad; resolves false when none is available. */
export function showRewarded(reward: () => void): boolean {
  if (!ready || !rewardedLoaded || !rewarded) {
    if (ready && !rewardedLoaded) preloadRewarded();
    return false;
  }
  onReward = reward;
  rewarded.show().catch(() => {});
  return true;
}
