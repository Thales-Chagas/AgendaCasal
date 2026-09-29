import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, EmptyState, IconButton, ListRow, Screen, ScreenHeader, useTheme } from '@/design-system';
import { Gift, Plus } from '@/design-system/icons';
import { daysUntilLabel, kindMeta, specialDateSubtitle } from '@/features/special-dates/domain/presentation';
import { useSpecialDates } from '@/features/special-dates/hooks';

export default function SpecialDatesScreen() {
  const { spacing } = useTheme();
  const { data = [], isLoading } = useSpecialDates();

  return (
    <Screen>
      <ScreenHeader
        title="Datas especiais"
        subtitle="Aniversários e momentos importantes de vocês."
        trailing={
          <IconButton
            icon={Plus}
            label="Adicionar data"
            tone="primary"
            onPress={() => router.push('/special-date/new')}
          />
        }
      />
      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhuma data ainda"
          message="Guarde aniversários, o dia em que se conheceram, o casamento…"
          action={{ label: '+ Adicionar data', onPress: () => router.push('/special-date/new') }}
        />
      ) : (
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            {data.map(({ item, occurrence, key }) => (
              <ListRow
                key={key}
                title={`${kindMeta[item.kind].emoji} ${item.title}`}
                subtitle={`${specialDateSubtitle(item, occurrence)} · ${daysUntilLabel(occurrence)}`}
                onPress={() => router.push({ pathname: '/special-date/[id]', params: { id: item.id } })}
              />
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
