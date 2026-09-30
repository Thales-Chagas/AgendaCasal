import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';

import { Button, ErrorState, Screen, ScreenHeader, Skeleton, toast } from '@/design-system';
import { CircleCheck, Trash } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { BillForm } from '@/features/finance/components/BillForm';
import { dueLabel, formatCents, scopeLabels } from '@/features/finance/domain/presentation';
import { nextUnpaidDue } from '@/features/finance/domain/schedule';
import { deleteBillWithUndo, saveBill, toggleBillPaid, useBill } from '@/features/finance/hooks';
import { goBackOrHome } from '@/shared/navigation';

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerId = useSession((s) => s.userId) ?? '';
  const { data: bill, isLoading } = useBill(id);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <Skeleton height={48} />
      </Screen>
    );
  }
  if (!bill || bill.deletedAt) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState title="Conta não encontrada" message="Talvez ela tenha sido excluída." />
      </Screen>
    );
  }

  const next = nextUnpaidDue(bill);
  const scope = scopeLabels[bill.ownerScope];
  const subtitle = [
    `${scope.emoji} ${scope.short}`,
    bill.amountCents !== null ? formatCents(bill.amountCents) : null,
    next ? dueLabel(next.due, next.status) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <BillForm
      key={`${bill.id}:${bill.version}`}
      viewerId={viewerId}
      scopeLocked
      initial={{
        ownerScope: bill.ownerScope,
        ownerUserId: bill.ownerUserId,
        title: bill.title,
        category: bill.category,
        amountCents: bill.amountCents,
        frequency: bill.frequency,
        firstDueDate: bill.firstDueDate,
        reminderDays: bill.reminderDays,
        paidPeriods: bill.paidPeriods,
        notes: bill.notes,
      }}
      header={<ScreenHeader title={bill.title} subtitle={subtitle} />}
      submitLabel="Salvar alterações"
      onSubmit={async (fields) => {
        await saveBill(bill.id, fields);
        toast.success('Alterações salvas ✓');
        goBackOrHome();
      }}
      extraFooter={
        <>
          {next ? (
            <Button
              label={`Marcar como paga (vencimento ${format(next.due, 'dd/MM')})`}
              icon={CircleCheck}
              variant="secondary"
              onPress={async () => {
                await toggleBillPaid(bill, next.dueKey);
                toast.success(`${bill.title}: paga ✓`);
                goBackOrHome();
              }}
              testID="bill-mark-paid"
            />
          ) : null}
          <Button
            label="Excluir conta"
            icon={Trash}
            variant="ghost"
            onPress={() => {
              goBackOrHome();
              void deleteBillWithUndo(bill.id);
            }}
          />
        </>
      }
    />
  );
}
