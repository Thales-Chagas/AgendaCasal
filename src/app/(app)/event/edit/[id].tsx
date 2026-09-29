import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { ErrorState, EventCardSkeleton, Screen, ScreenHeader, toast } from '@/design-system';
import { usePeople } from '@/features/couple/hooks';
import { EventForm } from '@/features/events/components/EventForm';
import { eventToForm, formToFields } from '@/features/events/domain/form';
import { updateEvent, useEvent } from '@/features/events/hooks';
import { goBackOrHome } from '@/shared/navigation';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { viewerId, partnerId, partnerName } = usePeople();
  const { data: event, isLoading } = useEvent(id);
  const initial = useMemo(() => (event ? eventToForm(event, viewerId) : null), [event, viewerId]);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader leading="close" title="Editar compromisso" />
        <EventCardSkeleton />
      </Screen>
    );
  }
  if (!event || !initial || event.deletedAt) {
    return (
      <Screen>
        <ScreenHeader leading="close" />
        <ErrorState title="Compromisso não encontrado" message="Talvez ele tenha sido excluído." />
      </Screen>
    );
  }

  return (
    <EventForm
      initial={initial}
      partnerName={partnerName}
      submitLabel="Salvar alterações"
      startExpanded={!!(event.location || event.description || event.recurrenceRule)}
      header={
        <ScreenHeader
          leading="close"
          title="Editar compromisso"
          subtitle={event.recurrenceRule ? 'As alterações valem para todas as repetições.' : undefined}
        />
      }
      onSubmit={async (state) => {
        const fields = formToFields(state, { viewerId, partnerId }, event.timezone);
        await updateEvent(event.id, { ...fields, recurrenceExdates: event.recurrenceExdates });
        toast.success('Alterações salvas ✓');
        goBackOrHome();
      }}
    />
  );
}
