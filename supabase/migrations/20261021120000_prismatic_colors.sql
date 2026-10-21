-- Seletor de cor prismático: mais opções de cor pessoal.
-- Só amplia a lista aceita em `profiles.avatar_color`; as cores já salvas continuam válidas e
-- nenhum dado muda. A lista espelha `src/design-system/tokens/person-colors.ts`.
alter table public.profiles drop constraint profiles_avatar_color_check;

alter table public.profiles add constraint profiles_avatar_color_check check (
  avatar_color in (
    'rose', 'plum', 'indigo', 'teal', 'amber', 'sage',
    'azure', 'cyan', 'emerald', 'lime', 'gold', 'bronze', 'coral', 'magenta', 'violet', 'slate'
  )
);
