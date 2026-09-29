import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
};

/**
 * Código numérico (ex.: 6 dígitos do e-mail). Um único campo invisível recebe o texto,
 * o que permite colar e o preenchimento automático do sistema ("one-time-code").
 */
export function CodeInput({ value, onChange, length = 6, error, autoFocus, onComplete }: CodeInputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={[styles.row, { gap: spacing.sm }]}>
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? '';
          const active = focused && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.danger : active ? colors.primary : colors.border,
                },
              ]}>
              <AppText variant="title2" tabular>
                {char}
              </AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, length);
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        accessibilityLabel={`Código de ${length} números`}
        caretHidden
        style={[typography.body, styles.hiddenInput]}
      />
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
