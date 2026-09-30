import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { BottomSheet, ListRow, useTheme } from '@/design-system';
import { CalendarClock, Gift, NotebookPen, Wallet } from '@/design-system/icons';

type Props = { visible: boolean; onClose: () => void };

/** Ações do botão "+": só o essencial, com textos claros. */
export function CreateSheet({ visible, onClose }: Props) {
  const { spacing } = useTheme();
  const go = (href: Href) => {
    onClose();
    router.push(href);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="O que você quer criar?" testID="create-sheet">
      <View style={{ gap: spacing.xs }}>
        <ListRow
          icon={CalendarClock}
          iconTone="primary"
          title="Novo compromisso"
          subtitle="Aparece para vocês dois"
          onPress={() => go('/event/new')}
          testID="create-event"
        />
        <ListRow
          icon={Wallet}
          iconTone="primary"
          title="Nova conta a pagar"
          subtitle="Do casal ou só sua, com lembrete"
          onPress={() => go('/bill/new')}
          testID="create-bill"
        />
        <ListRow
          icon={NotebookPen}
          iconTone="private"
          title="Nova nota"
          subtitle="🔒 Privada, só neste celular"
          onPress={() => go('/note/new')}
          testID="create-note"
        />
        <ListRow
          icon={Gift}
          iconTone="primary"
          title="Data especial"
          subtitle="Aniversários e datas importantes"
          onPress={() => go('/special-date/new')}
          testID="create-special-date"
        />
      </View>
    </BottomSheet>
  );
}
