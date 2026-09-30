import { addMonths } from 'date-fns';

import { ScreenHeader, toast } from '@/design-system';
import { useSession } from '@/features/auth/session-store';
import { toDateKey } from '@/features/events/domain/dates';
import { BillForm } from '@/features/finance/components/BillForm';
import { saveBill } from '@/features/finance/hooks';
import { requestPermission } from '@/features/notifications/notification-service';
import { goBackOrHome } from '@/shared/navigation';

/** Próximo "dia 10" a partir de hoje (um vencimento que ainda não passou). */
function defaultDueDate(): string {
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), 10);
  return toDateKey(candidate >= new Date(today.toDateString()) ? candidate : addMonths(candidate, 1));
}

export default function NewBillScreen() {
  const viewerId = useSession((s) => s.userId) ?? '';

  return (
    <BillForm
      viewerId={viewerId}
      initial={{
        ownerScope: 'couple',
        ownerUserId: null,
        title: '',
        category: 'housing',
        amountCents: null,
        frequency: 'monthly',
        firstDueDate: defaultDueDate(),
        reminderDays: [0, 3],
        paidPeriods: [],
        notes: null,
      }}
      header={<ScreenHeader leading="close" title="Nova conta" subtitle="Avisamos antes de vencer." />}
      submitLabel="Salvar conta"
      onSubmit={async (fields) => {
        await saveBill(null, fields);
        toast.success('Conta salva ✓');
        goBackOrHome();
        if (fields.reminderDays.length) void requestPermission();
      }}
    />
  );
}
