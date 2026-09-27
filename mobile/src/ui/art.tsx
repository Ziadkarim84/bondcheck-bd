// Illustrations drawn with plain views: a stylised prize bond with a gold seal,
// and a soft glow behind it. No emoji, no clip-art.
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme';
import { T } from './kit';

export function Glow({ color, size = 260, x = 0, y = 0, opacity = 0.35 }: { color: string; size?: number; x?: number; y?: number; opacity?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: opacity * 0.5, transform: [{ scale: 1.2 }] }}>
      <View style={{ flex: 1, margin: size * 0.15, borderRadius: size, backgroundColor: color, opacity: 0.6 }} />
    </View>
  );
}

export function BondArt({ number = '0786345', scale = 1 }: { number?: string; scale?: number }) {
  const w = 230 * scale;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Glow color="#16A06E" size={320 * scale} x={-160 * scale} y={-120 * scale} opacity={0.5} />
      <Glow color="#F2B233" size={220 * scale} x={40 * scale} y={-150 * scale} opacity={0.35} />
      <View style={{ width: w, height: w * 0.52, borderRadius: 14 * scale, backgroundColor: '#F7FBF8', padding: 14 * scale, transform: [{ rotate: '-6deg' }], shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
          <View style={{ width: 26 * scale, height: 26 * scale, borderRadius: 13 * scale, borderWidth: 3 * scale, borderColor: '#0B8457' }} />
          <View style={{ flex: 1, gap: 5 * scale }}>
            <View style={{ height: 6 * scale, width: '70%', borderRadius: 3, backgroundColor: '#0B8457', opacity: 0.8 }} />
            <View style={{ height: 5 * scale, width: '45%', borderRadius: 3, backgroundColor: '#0B8457', opacity: 0.35 }} />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <T style={{ fontFamily: fonts.numBold, fontSize: 24 * scale, letterSpacing: 3 * scale, color: '#0B2A1F' }}>{number}</T>
          <T style={{ fontFamily: fonts.num, fontSize: 10 * scale, color: '#46514B', letterSpacing: 1 }}>৳100 · PRIZE BOND</T>
        </View>
      </View>
      <View style={{ position: 'absolute', right: -6 * scale, top: -18 * scale, width: 56 * scale, height: 56 * scale, borderRadius: 28 * scale, backgroundColor: '#F2B233', alignItems: 'center', justifyContent: 'center', borderWidth: 4 * scale, borderColor: '#0B2A1F' }}>
        <Ionicons name="checkmark" size={28 * scale} color="#0B2A1F" />
      </View>
    </View>
  );
}
