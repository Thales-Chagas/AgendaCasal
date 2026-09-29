import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Eye, EyeOff, type Icon } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  helper?: string;
  icon?: Icon;
  /** Mostra o botão de mostrar/ocultar senha. */
  password?: boolean;
  multilineHeight?: number;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, helper, icon: IconComponent, password, multilineHeight, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const message = error ?? helper;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color="textSecondary" importantForAccessibility="no">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            minHeight: multilineHeight ?? 52,
            alignItems: multilineHeight ? 'flex-start' : 'center',
            paddingVertical: multilineHeight ? spacing.md : 0,
          },
        ]}>
        {IconComponent ? <IconComponent size={20} color={colors.textTertiary} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          secureTextEntry={password ? hidden : inputProps.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            typography.body,
            styles.input,
            { color: colors.textPrimary },
            // Na web, o contorno de foco do navegador é substituído pela nossa borda.
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
            multilineHeight
              ? { minHeight: multilineHeight - spacing.md * 2, textAlignVertical: 'top' }
              : null,
          ]}
          {...inputProps}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={12}>
            {hidden ? (
              <Eye size={20} color={colors.textSecondary} />
            ) : (
              <EyeOff size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <AppText
          variant="caption"
          color={error ? 'danger' : 'textSecondary'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
});
