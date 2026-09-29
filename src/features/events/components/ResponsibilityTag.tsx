import { Tag } from '@/design-system';
import { Heart, User, UserRound } from '@/design-system/icons';

import { responsibilityText } from '../domain/presentation';
import type { Responsibility } from '../domain/types';

const icons = { mine: User, partner: UserRound, ours: Heart } as const;

/** "👤 Meu", "👤 De Ana", "❤️ Nosso": ícone + texto + cor (nunca só cor). */
export function ResponsibilityTag({
  responsibility,
  partnerName,
}: {
  responsibility: Responsibility;
  partnerName?: string | null;
}) {
  return (
    <Tag
      tone={responsibility}
      icon={icons[responsibility]}
      label={responsibilityText(responsibility, partnerName)}
    />
  );
}
