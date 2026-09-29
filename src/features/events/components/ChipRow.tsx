import { ScrollView, View } from 'react-native';

import { Chip, useTheme } from '@/design-system';

export type ChipOption<T extends string | number> = { value: T; label: string; emoji?: string };

type Props<T extends string | number> = {
  options: readonly ChipOption<T>[];
  isSelected: (value: T) => boolean;
  onToggle: (value: T) => void;
  /** Rolagem horizontal (listas longas) ou quebra de linha. */
  scroll?: boolean;
  testIDPrefix?: string;
};

export function ChipRow<T extends string | number>({
  options,
  isSelected,
  onToggle,
  scroll,
  testIDPrefix,
}: Props<T>) {
  const { spacing } = useTheme();
  const chips = options.map((o) => (
    <Chip
      key={String(o.value)}
      label={o.label}
      emoji={o.emoji}
      selected={isSelected(o.value)}
      onPress={() => onToggle(o.value)}
      testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
    />
  ));

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xl }}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{chips}</View>;
}
