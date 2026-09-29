import { useQuery } from '@tanstack/react-query';

import { expandOccurrences } from '@/features/events/domain/recurrence';
import { upcomingSpecialDates } from '@/features/special-dates/domain/presentation';
import { agendaKeys, requireAgendaRuntime, useAgendaStatus } from '@/features/sync/agenda-runtime';
import { useNow } from '@/shared/hooks/use-now';

export type CountdownItem = {
  key: string;
  title: string;
  emoji: string;
  date: Date;
  href: { pathname: '/event/[id]' | '/special-date/[id]'; params: Record<string, string> };
};

const DAY = 86_400_000;

/**
 * Contagem regressiva mais próxima: compromissos marcados com "Contagem regressiva"
 * (até 1 ano) ou datas especiais nos próximos 30 dias.
 */
export function useNextCountdown() {
  const ready = useAgendaStatus((s) => s.ready);
  const hour = Math.floor(useNow(3_600_000).getTime() / 3_600_000);
  return useQuery({
    queryKey: [...agendaKeys.all, 'countdown', hour],
    enabled: ready,
    queryFn: async (): Promise<CountdownItem | null> => {
      const { local } = requireAgendaRuntime();
      const now = new Date();
      const candidates: CountdownItem[] = [];

      const events = (await local.allActive('events')).filter((e) => e.showCountdown);
      for (const event of events) {
        const next = expandOccurrences(event, now, new Date(now.getTime() + 366 * DAY))[0];
        if (next)
          candidates.push({
            key: next.key,
            title: event.title,
            emoji: '⏳',
            date: next.start,
            href: { pathname: '/event/[id]', params: { id: event.id, date: next.localDate } },
          });
      }

      const special = upcomingSpecialDates(await local.allActive('special_dates'), now).filter(
        (s) => s.occurrence.getTime() - now.getTime() <= 30 * DAY,
      );
      for (const s of special) {
        candidates.push({
          key: s.key,
          title: s.item.title,
          emoji: '❤️',
          date: s.occurrence,
          href: { pathname: '/special-date/[id]', params: { id: s.item.id } },
        });
      }

      candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
      return candidates[0] ?? null;
    },
  });
}
