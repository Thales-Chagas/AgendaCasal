import { StyleSheet, View } from 'react-native';

import type { Icon } from '../icons';
import type { ColorTokens } from '../tokens/colors';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

type ToneKey =
  'primary' | 'mine' | 'partner' | 'ours' | 'private' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneMap: Record<ToneKey, [fg: keyof ColorTokens, bg: keyof ColorTokens]> = {
  primary: ['onPrimarySoft', 'primarySoft'],
  mine: ['mine', 'mineSoft'],
  partner: ['partner', 'partnerSoft'],
  ours: ['ours', 'oursSoft'],
  private: ['private', 'privateSoft'],
  success: ['success', 'successSoft'],
  warning: ['warning', 'warningSoft'],
  danger: ['danger', 'dangerSoft'],
  info: ['info', 'infoSoft'],
  neutral: ['textSecondary', 'surfaceMuted'],
};

export type TagProps = {
  label: string;
  icon?: Icon;
  /** Emoji opcional antes do texto (ex.: ❤️). */
  emoji?: string;
  tone?: ToneKey;
};

/** Selo pequeno. Nunca depende só de cor: sempre tem texto (e, quando útil, ícone). */
export function Tag({ label, icon: IconComponent, emoji, tone = 'neutral' }: TagProps) {
  const { colors, radius, spacing } = useTheme();
  const [fg, bg] = toneMap[tone];
  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: colors[bg],
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm + 2,
          gap: spacing.xs,
        },
      ]}>
      {IconComponent ? <IconComponent size={13} color={colors[fg]} strokeWidth={2.4} /> : null}
      <AppText variant="caption" compact style={{ color: colors[fg] }} numberOfLines={1}>
        {emoji ? `${emoji} ${label}` : label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4 },
});
