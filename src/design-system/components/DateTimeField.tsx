import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { CalendarDays, Clock } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { formatFieldValue } from './DateTimeField.shared';
import { PressableScale } from './PressableScale';

export type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  testID?: string;
};

export { formatFieldValue };

/**
 * Campo de data/hora com os seletores nativos do sistema (familiares para quem usa).
 * Android: diálogo nativo. iOS: folha inferior com calendário/roda.
 */
export function DateTimeField({ label, mode, value, onChange, minimumDate, testID }: DateTimeFieldProps) {
  const { colors, radius, spacing, scheme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const IconComponent = mode === 'date' ? CalendarDays : Clock;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate,
        onValueChange: (_event, date) => onChange(date),
      });
      return;
    }
    setDraft(value);
    setIosOpen(true);
  };

  return (
    <>
      <PressableScale
        testID={testID}
        onPress={open}
        accessibilityLabel={`${label}: ${formatFieldValue(mode, value)}`}
        accessibilityHint="Toque para alterar"
        style={[
          styles.field,
          {
            borderRadius: radius.md,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
          },
        ]}>
        <IconComponent size={18} color={colors.textSecondary} />
        <View style={styles.texts}>
          <AppText variant="caption" color="textSecondary">
            {label}
          </AppText>
          <AppText variant="bodyStrong" tabular>
            {formatFieldValue(mode, value)}
          </AppText>
        </View>
      </PressableScale>

      {Platform.OS === 'ios' ? (
        <BottomSheet visible={iosOpen} onClose={() => setIosOpen(false)} title={label}>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            locale="pt-BR"
            minimumDate={minimumDate}
            minuteInterval={5}
            accentColor={colors.primary}
            themeVariant={scheme}
            onValueChange={(_event, date) => setDraft(date)}
          />
          <Button
            label="Pronto"
            onPress={() => {
              onChange(draft);
              setIosOpen(false);
            }}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderWidth: 1.5, flex: 1 },
  texts: { flex: 1 },
});
