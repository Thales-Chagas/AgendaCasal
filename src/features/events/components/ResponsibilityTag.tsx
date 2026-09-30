import { Tag, useTheme } from '@/design-system';
import { Heart, User, UserRound } from '@/design-system/icons';

import { responsibilityText } from '../domain/presentation';
import type { Responsibility } from '../domain/types';
import { useResponsibilityTones } from '../tones';

const icons = { mine: User, partner: UserRound, ours: Heart } as const;

/** "👤 Meu", "👤 De Ana", "❤️ Nosso": ícone + texto + cor (nunca só cor). */
export function ResponsibilityTag({
  responsibility,
  partnerName,
  onTinted,
}: {
  responsibility: Responsibility;
  partnerName?: string | null;
  /** Fundo atrás do selo (num card já colorido, o selo fica sobre a superfície). */
  onTinted?: boolean;
}) {
  const { colors } = useTheme();
  const tone = useResponsibilityTones()[responsibility];
  return (
    <Tag
      customColors={{ fg: tone.strong, bg: onTinted ? colors.surface : tone.soft }}
      icon={icons[responsibility]}
      label={responsibilityText(responsibility, partnerName)}
    />
  );
}
