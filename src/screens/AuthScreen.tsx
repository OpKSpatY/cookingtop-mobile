import React, { useState } from 'react';
import {
  View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { loginApi, registerApi, AuthApiError } from '../services/authApi';
import { colors } from '../theme/colors';

type AuthMode = 'login' | 'signup';

interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Número', test: (p: string) => /\d/.test(p) },
  { label: 'Caractere especial', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const AuthScreen = () => {
  const { setSession } = useAuth();
  const { showSuccess, showError } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signup, setSignup] = useState<SignupData>({
    name: '', email: '', password: '', confirmPassword: '', acceptTerms: false,
  });

  const updateSignup = (field: keyof SignupData, value: string | boolean) =>
    setSignup((prev) => ({ ...prev, [field]: value }));

  const isPasswordStrong = PASSWORD_RULES.every((r) => r.test(signup.password));

  const handleGoogleLogin = () => {
    showSuccess('Em breve', 'A entrada com Google será habilitada nas próximas versões.');
  };

  const handleEmailLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showError('Informe email e senha para continuar.', 'Campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      const firstName = res.user.name?.trim().split(/\s+/)[0] ?? 'Chef';
      showSuccess('Login realizado com sucesso!', `Olá, ${firstName}! Redirecionando…`);
      await new Promise((r) => setTimeout(r, 1400));
      await setSession({ accessToken: res.access_token, user: res.user });
    } catch (e) {
      const message =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível entrar. Verifique sua conexão e tente novamente.';
      showError(message, 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signup.name.trim() || !signup.email.trim() || !signup.password || !signup.confirmPassword) {
      showError('Preencha nome, email, senha e confirmação.', 'Campos obrigatórios');
      return;
    }
    if (!isPasswordStrong) {
      showError('Use maiúscula, minúscula, número e caractere especial (mín. 8 caracteres).', 'Senha fraca');
      return;
    }
    if (signup.password !== signup.confirmPassword) {
      showError('Digite a mesma senha nos dois campos.', 'Senhas diferentes');
      return;
    }
    if (!signup.acceptTerms) {
      showError('Marque a caixa para aceitar os termos e a política de privacidade.', 'Termos de uso');
      return;
    }
    setLoading(true);
    try {
      const res = await registerApi({
        name: signup.name.trim(),
        email: signup.email.trim().toLowerCase(),
        password: signup.password,
      });
      showSuccess('Conta criada com sucesso!', 'Bem-vindo ao CookingTop! Redirecionando…');
      await new Promise((r) => setTimeout(r, 1400));
      await setSession({ accessToken: res.access_token, user: res.user });
    } catch (e) {
      const message =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível criar a conta. Tente novamente.';
      showError(message, 'Não foi possível cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        enableAutomaticScroll
        /** Espaço extra acima do teclado ao focar input (cadastro com vários campos + regras de senha) */
        extraScrollHeight={Platform.OS === 'android' ? 160 : 56}
        extraHeight={Platform.OS === 'android' ? 120 : 80}
        keyboardOpeningTime={Platform.OS === 'android' ? 0 : 250}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        enableResetScrollToCoords={false}
      >
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Sua comunidade de receitas favorita</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setMode('login')}
              style={[styles.tab, mode === 'login' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('signup')}
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Cadastrar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
            <Text style={styles.googleBtnText}>Continuar com Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {mode === 'login' ? (
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} color={colors.mutedForeground} /> : <Eye size={16} color={colors.mutedForeground} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleEmailLogin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Entrar</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Nome completo</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Seu nome"
                    placeholderTextColor={colors.mutedForeground}
                    value={signup.name}
                    onChangeText={(t) => updateSignup('name', t)}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={signup.email}
                    onChangeText={(t) => updateSignup('email', t)}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={255}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    value={signup.password}
                    onChangeText={(t) => updateSignup('password', t)}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} color={colors.mutedForeground} /> : <Eye size={16} color={colors.mutedForeground} />}
                  </TouchableOpacity>
                </View>

                {signup.password.length > 0 && (
                  <View style={styles.rulesContainer}>
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(signup.password);
                      return (
                        <View key={rule.label} style={styles.ruleRow}>
                          <View style={[styles.ruleDot, passed && styles.ruleDotPassed]} />
                          <Text style={[styles.ruleText, passed && styles.ruleTextPassed]}>{rule.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View>
                <Text style={styles.label}>Confirmar senha</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    value={signup.confirmPassword}
                    onChangeText={(t) => updateSignup('confirmPassword', t)}
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    {showConfirmPassword ? <EyeOff size={16} color={colors.mutedForeground} /> : <Eye size={16} color={colors.mutedForeground} />}
                  </TouchableOpacity>
                </View>
                {signup.confirmPassword.length > 0 && signup.password !== signup.confirmPassword && (
                  <Text style={styles.errorText}>As senhas não coincidem</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => updateSignup('acceptTerms', !signup.acceptTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, signup.acceptTerms && styles.checkboxChecked]}>
                  {signup.acceptTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  Ao me cadastrar, concordo com os{' '}
                  <Text style={styles.termsLink}>Termos de Uso</Text> e a{' '}
                  <Text style={styles.termsLink}>Política de Privacidade</Text>.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSignup} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Criar conta</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {mode === 'login' ? (
            <Text style={styles.footerText}>
              Não tem uma conta?{' '}
              <Text style={styles.footerLink} onPress={() => setMode('signup')}>Cadastre-se</Text>
            </Text>
          ) : (
            <Text style={styles.footerText}>
              Já tem uma conta?{' '}
              <Text style={styles.footerLink} onPress={() => setMode('login')}>Entrar</Text>
            </Text>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  /** flexGrow + padding inferior para o scroll cobrir todo o cadastro acima do teclado */
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 200, height: 80 },
  tagline: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginTop: -4 },
  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  tabs: {
    flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 14, padding: 4, marginBottom: 20,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  tabTextActive: { color: colors.foreground },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, marginBottom: 16,
  },
  googleBtnText: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.mutedForeground },
  form: { gap: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: colors.foreground },
  eyeBtn: { padding: 14 },
  forgotText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rulesContainer: { marginTop: 8, gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mutedForeground + '50' },
  ruleDotPassed: { backgroundColor: colors.success },
  ruleText: { fontSize: 12, color: colors.mutedForeground },
  ruleTextPassed: { color: colors.success },
  errorText: { fontSize: 12, color: colors.destructive, marginTop: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { fontSize: 12, fontWeight: '700', color: '#fff' },
  termsText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.mutedForeground },
  termsLink: { fontWeight: '600', color: colors.primary, textDecorationLine: 'underline' },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { fontSize: 13, color: colors.mutedForeground },
  footerLink: { fontWeight: '700', color: colors.primary },
});

export default AuthScreen;
