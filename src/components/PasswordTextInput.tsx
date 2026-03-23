import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { colors } from '../theme/colors';

export type PasswordTextInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** `true` = senha oculta; `false` = mostrar texto (ícone de olho) */
  masked: boolean;
  onToggleMasked: () => void;
  placeholder?: string;
  accessibilityLabelToggle?: string;
  /** Afeta autofill / tipo no iOS (nova senha vs login) */
  variant?: 'login' | 'signup';
} & Pick<TextInputProps, 'testID'>;

/**
 * Campo de senha com máscara em iOS, Android e Web (Expo / react-native-web).
 * Mantenha `masked` iniciando em `true` no componente pai.
 */
export function PasswordTextInput({
  value,
  onChangeText,
  masked,
  onToggleMasked,
  placeholder = '••••••••',
  accessibilityLabelToggle = 'Alternar visibilidade da senha',
  testID,
  variant = 'login',
}: PasswordTextInputProps) {
  const iosContentType =
    variant === 'signup' ? ('newPassword' as const) : ('password' as const);

  return (
    <View style={styles.inputWrapper}>
      <Lock size={16} color={colors.mutedForeground} style={styles.inputIcon} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={styles.input}
        secureTextEntry={masked}
        multiline={false}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="default"
        returnKeyType="done"
        {...(Platform.OS === 'ios'
          ? {
              textContentType: iosContentType,
            }
          : {})}
        {...(Platform.OS === 'android'
          ? {
              autoComplete: variant === 'signup' ? 'password-new' : 'password',
              importantForAutofill: 'yes',
            }
          : {})}
        {...(Platform.OS === 'web'
          ? {
              // Navegador: reforça máscara quando `masked` (RN Web já usa type=password via secureTextEntry)
              autoComplete:
                variant === 'signup'
                  ? masked
                    ? 'new-password'
                    : 'off'
                  : masked
                    ? 'current-password'
                    : 'off',
            }
          : {})}
      />
      <TouchableOpacity
        onPress={onToggleMasked}
        style={styles.eyeBtn}
        accessibilityLabel={accessibilityLabelToggle}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {masked ? (
          <Eye size={16} color={colors.mutedForeground} />
        ) : (
          <EyeOff size={16} color={colors.mutedForeground} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  eyeBtn: { padding: 14 },
});
