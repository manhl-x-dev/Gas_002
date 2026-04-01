import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius } from '../lib/theme';
import { unifiedLogin } from '../services/api';
import { useAuthStore } from '../stores/auth-store';
import { useStationAuthStore } from '../stores/station-auth-store';
import { RootStackParamList } from '../App';
import Toast from 'react-native-toast-message';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const setCitizenAuth = useAuthStore((s) => s.setAuth);
  const setStationAuth = useStationAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const isPhone = /^[\d+]/.test(identifier.trim());

  async function handleLogin() {
    setError('');
    if (!identifier.trim() || !password) {
      setError(t('login.noCredentials'));
      return;
    }
    setLoading(true);
    try {
      const result = await unifiedLogin(identifier, password);
      if (result.role === 'citizen') {
        Toast.show({
          type: 'success',
          text1: t('login.successTitle'),
          text2: `${t('login.welcome')} ${result.user.name}`,
        });
        setCitizenAuth(result.user);
      } else {
        Toast.show({
          type: 'success',
          text1: t('login.successTitle'),
          text2: `${t('login.welcome')} ${result.user.fullName}`,
        });
        setStationAuth(result.user);
      }
    } catch (err: any) {
      const msg = err.message || t('common.error');
      Toast.show({
        type: 'error',
        text1: t('login.failTitle'),
        text2: msg.startsWith('PENDING:') || msg.startsWith('REJECTED:') ? msg.split(':')[1] : msg,
      });
      if (msg.startsWith('PENDING:') || msg.startsWith('REJECTED:')) {
        setError(msg.split(':')[1]);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={s.logoContainer}>
            <View style={s.logo}>
              <Ionicons name="flame-outline" size={36} color="#fff" />
            </View>
            <Text style={s.title}>{t('app.name')}</Text>
            <Text style={s.subtitle}>{t('login.title')}</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            {/* Identifier field */}
            <Text style={s.label}>{t('login.phoneLabel')}</Text>
            <View style={s.inputContainer}>
              <Text style={s.inputIcon}>{isPhone ? '🇸🇾' : '🛡️'}</Text>
              <TextInput
                style={[s.input, isPhone && s.inputLtr]}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={t('login.phonePlaceholder')}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            <Text style={s.hint}>
              {isPhone ? t('login.searchCitizen') : t('login.searchAdmin')}
            </Text>

            {/* Password */}
            <Text style={[s.label, { marginTop: spacing.lg }]}>{t('login.passwordLabel')}</Text>
            <View style={s.inputContainer}>
              <TextInput
                ref={passwordRef}
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                {showPassword ? (
                  <Feather name="eye-off" size={18} color="#9ca3af" />
                ) : (
                  <Feather name="eye" size={18} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>{t('login.submit')}</Text>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={s.linkBtn}>
              <Text style={s.linkText}>{t('login.noAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffbeb' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: 60 },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryLight, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: spacing.lg, height: 50,
  },
  inputIcon: { fontSize: 16, marginStart: spacing.sm },
  input: { flex: 1, fontSize: 16, color: colors.text, textAlign: I18nManager.isRTL ? 'right' : 'left', height: '100%' },
  inputLtr: { textAlign: 'left' },
  hint: { fontSize: 12, color: colors.textLight, textAlign: I18nManager.isRTL ? 'right' : 'left', marginTop: spacing.xs },
  eyeBtn: { position: 'absolute', end: spacing.md },
  errorBox: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: radius.xl, padding: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, height: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryLight, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  linkBtn: { alignItems: 'center', marginTop: spacing.lg },
  linkText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
