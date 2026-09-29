import { useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, Screen, ScreenHeader, Skeleton, toast } from '@/design-system';
import { Trash } from '@/design-system/icons';
import { SpecialDateForm } from '@/features/special-dates/components/SpecialDateForm';
import { daysUntilLabel, nextOccurrence } from '@/features/special-dates/domain/presentation';
import { deleteSpecialDateWithUndo, saveSpecialDate, useSpecialDate } from '@/features/special-dates/hooks';
import { goBackOrHome } from '@/shared/navigation';

export default function SpecialDateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading } = useSpecialDate(id);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <Skeleton height={48} />
      </Screen>
    );
  }
  if (!item || item.deletedAt) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState title="Data não encontrada" message="Talvez ela tenha sido excluída." />
      </Screen>
    );
  }

  const next = nextOccurrence(item);

  return (
    <SpecialDateForm
      key={item.id}
      initial={{
        title: item.title,
        kind: item.kind,
        date: item.date,
        repeatsYearly: item.repeatsYearly,
        reminderDays: item.reminderDays,
      }}
      header={<ScreenHeader title={item.title} subtitle={next ? `${daysUntilLabel(next)} ❤️` : undefined} />}
      submitLabel="Salvar alterações"
      onSubmit={async (fields) => {
        await saveSpecialDate(item.id, fields);
        toast.success('Alterações salvas ✓');
        goBackOrHome();
      }}
      extraFooter={
        <Button
          label="Excluir data"
          icon={Trash}
          variant="ghost"
          onPress={() => {
            goBackOrHome();
            void deleteSpecialDateWithUndo(item.id);
          }}
        />
      }
    />
  );
}
