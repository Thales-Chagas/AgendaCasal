import { Avatar, CoupleAvatar } from '@/design-system';

import type { Person } from '../data/couple-repository';
import { useAvatarUri } from '../hooks';

/** Avatar de uma pessoa do casal: foto (se houver) ou iniciais na cor dela. */
export function PersonAvatar({ person, size, ring }: { person: Person; size?: number; ring?: boolean }) {
  const photoUri = useAvatarUri(person.avatarPath);
  return (
    <Avatar
      name={person.displayName}
      color={person.avatarColor}
      photoUri={photoUri}
      size={size}
      ring={ring}
    />
  );
}

/** Os dois avatares sobrepostos, com as fotos quando existirem. */
export function CouplePersonAvatar({
  me,
  partner,
  size,
}: {
  me: Person;
  partner?: Person | null;
  size?: number;
}) {
  const myPhoto = useAvatarUri(me.avatarPath);
  const partnerPhoto = useAvatarUri(partner?.avatarPath);
  return (
    <CoupleAvatar
      me={{ name: me.displayName, color: me.avatarColor, photoUri: myPhoto }}
      partner={
        partner ? { name: partner.displayName, color: partner.avatarColor, photoUri: partnerPhoto } : null
      }
      size={size}
    />
  );
}
