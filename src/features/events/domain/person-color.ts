import type { AvatarColor } from '@/design-system/components/Avatar';

/**
 * Cor pessoal efetiva. O rosé é reservado para o que é "do casal": quem ainda está com ele
 * (padrão antigo) ou ainda não carregou o perfil recebe a cor padrão.
 */
export function resolvePersonalColor(color: AvatarColor | undefined, fallback: AvatarColor): AvatarColor {
  return !color || color === 'rose' ? fallback : color;
}
