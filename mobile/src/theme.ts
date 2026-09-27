import { useColorScheme } from 'react-native';

// Design tokens. 60% neutral ground, 30% ink, 10% emerald accent; gold only for wins.
const light = {
  ground: '#F3F6F4',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF0EC',
  ink: '#0D1411',
  inkSoft: '#46514B',
  muted: '#68736D',
  line: '#E1E7E3',
  accent: '#0B8457',
  onAccent: '#FFFFFF',
  accentSoft: '#E2F3EA',
  hero: '#0B2A1F',
  onHero: '#FFFFFF',
  heroSoft: 'rgba(255,255,255,0.68)',
  heroTile: 'rgba(255,255,255,0.08)',
  gold: '#F2B233',
  goldInk: '#8A5B00',
  goldSoft: '#FDF1D6',
  danger: '#D93B3B',
  shadow: '#0B2A1F',
};
export type Palette = typeof light;

const dark: Palette = {
  ground: '#0A0F0C',
  surface: '#141A17',
  surfaceAlt: '#1C2420',
  ink: '#EEF3F0',
  inkSoft: '#C2CCC6',
  muted: '#8E9A93',
  line: '#24302A',
  accent: '#3DC48C',
  onAccent: '#06150F',
  accentSoft: '#16291F',
  hero: '#10261C',
  onHero: '#FFFFFF',
  heroSoft: 'rgba(255,255,255,0.68)',
  heroTile: 'rgba(255,255,255,0.07)',
  gold: '#F2B233',
  goldInk: '#F2C45A',
  goldSoft: '#2A2210',
  danger: '#FF6B6B',
  shadow: '#000000',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };
export const space = (n: number) => n * 4;

/** Font families. Noto Sans Bengali carries Bangla text; Manrope carries figures and Latin. */
export const fonts = {
  bn: 'NotoSansBengali-Medium',
  bnSemi: 'NotoSansBengali-SemiBold',
  bnBold: 'NotoSansBengali-Bold',
  num: 'Manrope-700',
  numBold: 'Manrope-800',
  latin: 'Manrope-500',
};

export function cardShadow(p: Palette) {
  return {
    shadowColor: p.shadow,
    shadowOpacity: p === dark ? 0 : 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: p === dark ? 0 : 2,
  };
}
