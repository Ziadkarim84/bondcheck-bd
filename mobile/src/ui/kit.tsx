import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text as RNText, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow, fonts, radius, usePalette, type Palette } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'figure' | 'figureLg' | 'bond';

const variants = (p: Palette): Record<Variant, TextStyle> => ({
  display: { fontFamily: fonts.bnBold, fontSize: 30, lineHeight: 40, color: p.ink },
  title: { fontFamily: fonts.bnBold, fontSize: 22, lineHeight: 30, color: p.ink },
  heading: { fontFamily: fonts.bnSemi, fontSize: 17, lineHeight: 24, color: p.ink },
  body: { fontFamily: fonts.bn, fontSize: 15, lineHeight: 23, color: p.inkSoft },
  bodyStrong: { fontFamily: fonts.bnSemi, fontSize: 15, lineHeight: 22, color: p.ink },
  caption: { fontFamily: fonts.bn, fontSize: 13, lineHeight: 19, color: p.muted },
  label: { fontFamily: fonts.bnSemi, fontSize: 13, lineHeight: 18, color: p.muted },
  figure: { fontFamily: fonts.numBold, fontSize: 22, lineHeight: 28, color: p.ink, fontVariant: ['tabular-nums'] },
  figureLg: { fontFamily: fonts.numBold, fontSize: 34, lineHeight: 40, color: p.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  bond: { fontFamily: fonts.numBold, fontSize: 18, lineHeight: 24, color: p.ink, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
});

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  // 'simple' line breaking avoids Android clipping the last word with custom Bangla fonts.
  return <RNText textBreakStrategy="simple" {...rest} style={[variants(p)[v], style]} />;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const p = usePalette();
  const base = [{ backgroundColor: p.surface, borderRadius: radius.lg, padding: 20 }, cardShadow(p), style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]} android_ripple={{ color: p.line }}>
      {children}
    </Pressable>
  );
}

export function Button({
  label, onPress, kind = 'primary', icon, disabled, busy, style,
}: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'gold' | 'ghost'; icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const bg = { primary: p.accent, secondary: p.surfaceAlt, gold: p.gold, ghost: 'transparent' }[kind];
  const fg = { primary: p.onAccent, secondary: p.ink, gold: '#2A1C00', ghost: p.accent }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        kind === 'ghost' && { height: 44 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
          <RNText style={{ fontFamily: fonts.bnSemi, fontSize: 16, color: fg }}>{label}</RNText>
        </>
      )}
    </Pressable>
  );
}

export type Tone = 'accent' | 'gold' | 'neutral' | 'danger';
export function IconBadge({ name, tone = 'accent', size = 44 }: { name: keyof typeof Ionicons.glyphMap; tone?: Tone; size?: number }) {
  const p = usePalette();
  const [bg, fg] = {
    accent: [p.accentSoft, p.accent],
    gold: [p.goldSoft, p.goldInk],
    neutral: [p.surfaceAlt, p.inkSoft],
    danger: [p.surfaceAlt, p.danger],
  }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={fg} />
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <View style={styles.section}>
      <T v="heading" style={{ flex: 1 }}>{title}</T>
      {action && (
        <Pressable onPress={onAction} hitSlop={12}>
          <RNText style={{ fontFamily: fonts.bnSemi, fontSize: 14, color: p.accent }}>{action}</RNText>
        </Pressable>
      )}
    </View>
  );
}

export function Row({ icon, tone, title, subtitle, right, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; tone?: Tone; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={!onPress} android_ripple={{ color: p.line }} style={styles.row}>
      <IconBadge name={icon} tone={tone ?? 'neutral'} size={40} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <T v="bodyStrong">{title}</T>
        {subtitle ? <T v="caption">{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={p.muted} /> : null)}
    </Pressable>
  );
}

export function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center',
        backgroundColor: active ? p.ink : p.surface, borderWidth: 1, borderColor: active ? p.ink : p.line,
      }}
    >
      <RNText style={{ fontFamily: fonts.bnSemi, fontSize: 14, color: active ? p.surface : p.ink }}>{label}</RNText>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: p.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[{ flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }, on && { backgroundColor: p.surface }, on && cardShadow(p)]}>
            <RNText style={{ fontFamily: fonts.bnSemi, fontSize: 14, color: on ? p.ink : p.muted }}>{o.label}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden' },
  section: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginTop: 28, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
});
