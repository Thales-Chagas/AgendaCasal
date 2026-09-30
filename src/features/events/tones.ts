import { useMemo } from 'react';

import { personTone, useTheme } from '@/design-system';
import { usePeople } from '@/features/couple/hooks';

import { resolvePersonalColor } from './domain/person-color';
import type { Responsibility } from './domain/types';

export type ResponsibilityTone = { soft: string; strong: string };

/**
 * Cor de cada "dono": o que é do casal usa sempre o rosé do app; o que é pessoal usa a cor
 * que a pessoa escolheu em "Minha conta".
 */
export function useResponsibilityTones(): Record<Responsibility, ResponsibilityTone> {
  const { colors, scheme } = useTheme();
  const { me, partner } = usePeople();
  const myColor = resolvePersonalColor(me?.avatarColor, 'indigo');
  // Se os dois escolherem a mesma cor, o parceiro aparece com outra para dar para distinguir.
  const partnerColor = resolvePersonalColor(
    partner?.avatarColor === myColor ? undefined : partner?.avatarColor,
    myColor === 'teal' ? 'plum' : 'teal',
  );

  return useMemo(
    () => ({
      ours: { soft: colors.oursSoft, strong: colors.ours },
      mine: personTone(myColor, scheme),
      partner: personTone(partnerColor, scheme),
    }),
    [colors.ours, colors.oursSoft, myColor, partnerColor, scheme],
  );
}
