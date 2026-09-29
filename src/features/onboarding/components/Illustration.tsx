import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design-system';
import type { Icon } from '@/design-system/icons';
import type { ColorTokens } from '@/design-system/tokens';

type Tone = keyof Pick<ColorTokens, 'primary' | 'private' | 'mine' | 'partner'>;
const softOf: Record<Tone, keyof ColorTokens> = {
  primary: 'primarySoft',
  private: 'privateSoft',
  mine: 'mineSoft',
  partner: 'partnerSoft',
};

export type IllustrationProps = {
  icon: Icon;
  tone?: Tone;
  /** Ícones menores orbitando o principal. */
  satellites?: { icon: Icon; tone: Tone }[];
};

/** Ilustração leve feita de formas e ícones (sem imagens pesadas). */
export function Illustration({ icon: MainIcon, tone = 'primary', satellites = [] }: IllustrationProps) {
  const { colors } = useTheme();
  const positions = [
    { top: 8, left: 6 },
    { bottom: 16, right: 0 },
    { top: 20, right: 10 },
  ];

  return (
    <View style={styles.wrapper} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.halo, { backgroundColor: colors[softOf[tone]], opacity: 0.55 }]} />
      <View style={[styles.core, { backgroundColor: colors[softOf[tone]] }]}>
        <MainIcon size={64} color={colors[tone]} strokeWidth={1.6} />
      </View>
      {satellites.slice(0, 3).map(({ icon: SatIcon, tone: satTone }, i) => (
        <View
          key={i}
          style={[
            styles.satellite,
            positions[i],
            { backgroundColor: colors.surface, borderColor: colors[softOf[satTone]] },
          ]}>
          <SatIcon size={24} color={colors[satTone]} strokeWidth={2} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 230, height: 230, borderRadius: 115 },
  core: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center' },
  satellite: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
