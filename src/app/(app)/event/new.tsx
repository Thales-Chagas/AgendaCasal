import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ScreenHeader, toast } from '@/design-system';
import { usePeople } from '@/features/couple/hooks';
import { EventForm } from '@/features/events/components/EventForm';
import { formToFields, newEventForm } from '@/features/events/domain/form';
import { createEvent } from '@/features/events/hooks';
import {
  getPermissionState,
  requestPermission,
  scheduleRescheduling,
} from '@/features/notifications/notification-service';

export default function NewEventScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { viewerId, partnerId, partnerName } = usePeople();
  const [initial] = useState(() => newEventForm(date));

  return (
    <EventForm
      initial={initial}
      partnerName={partnerName}
      submitLabel="Salvar compromisso"
      header={<ScreenHeader leading="close" title="Novo compromisso" />}
      onSubmit={async (state) => {
        await createEvent(formToFields(state, { viewerId, partnerId }));
        toast.success(partnerId ? 'Compromisso salvo ✓ Já aparece para vocês dois' : 'Compromisso salvo ✓');
        router.back();
        // Pede permissão de notificação no momento em que ela faz sentido.
        if (state.reminders.length && (await getPermissionState()) === 'undetermined') {
          if ((await requestPermission()) === 'granted') scheduleRescheduling(0);
        }
      }}
    />
  );
}
