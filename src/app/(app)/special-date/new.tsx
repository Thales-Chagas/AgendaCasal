import { ScreenHeader, toast } from '@/design-system';
import { toDateKey } from '@/features/events/domain/dates';
import { SpecialDateForm } from '@/features/special-dates/components/SpecialDateForm';
import { saveSpecialDate } from '@/features/special-dates/hooks';
import { goBackOrHome } from '@/shared/navigation';

export default function NewSpecialDateScreen() {
  return (
    <SpecialDateForm
      initial={{
        title: '',
        kind: 'birthday',
        date: toDateKey(new Date()),
        repeatsYearly: true,
        reminderDays: [0, 1],
      }}
      header={
        <ScreenHeader
          leading="close"
          title="Data especial"
          subtitle="Aparece para vocês dois, com lembrete."
        />
      }
      submitLabel="Salvar data"
      onSubmit={async (fields) => {
        await saveSpecialDate(null, fields);
        toast.success('Data salva ❤️');
        goBackOrHome();
      }}
    />
  );
}
