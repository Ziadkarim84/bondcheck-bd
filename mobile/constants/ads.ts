import { TestIds } from 'react-native-google-mobile-ads';

// Replace these with your real AdMob unit IDs after creating them in AdMob console
// Real IDs format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
const REAL_BANNER_ID       = 'ca-app-pub-1144671244479208/2473848269';
const REAL_INTERSTITIAL_ID = 'ca-app-pub-REPLACE_ME/REPLACE_ME'; // create interstitial ad unit in AdMob

export const AD_UNIT_IDS = {
  banner:       __DEV__ ? TestIds.ADAPTIVE_BANNER : REAL_BANNER_ID,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL     : REAL_INTERSTITIAL_ID,
};
