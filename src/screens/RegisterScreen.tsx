import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius } from '../lib/theme';
import { registerFamily, registerSingle } from '../services/api';
import { RootStackParamList } from '../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };
type Step = 'choose' | 'form' | 'success';
type BType = 'family' | 'single';

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('choose');
  const [type, setType] = useState<BType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successFingerprint, setSuccessFingerprint] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [familyForm, setFamilyForm] = useState({ headName: '', bookNumber: '', phone: '', password: '' });
  const [singleForm, setSingleForm] = useState({ fullName: '', phone: '', password: '', notes: '' });

  function chooseType(bt: BType) { setType(bt); setError(''); setStep('form'); }

  function goBack() {
    setError('');
    if (step === 'form') { setStep('choose'); setType(null); }
    else { navigation.goBack(); }
  }

  function validate(): boolean {
    if (type === 'family') {
      if (!familyForm.headName.trim()) { setError(t('register.errorHeadName')); return false; }
      if (!familyForm.bookNumber.trim()) { setError(t('register.errorBookNumber')); return false; }
      if (familyForm.phone.replace(/[^\d+]/g, '').length < 10) { setError(t('register.errorPhone')); return false; }
      if (familyForm.password.length < 6) { setError(t('register.errorPassword')); return false; }
      return true;
    }
    if (!singleForm.fullName.trim()) { setError(t('register.errorFullName')); return false; }
    if (singleForm.phone.replace(/[^\d+]/g, '').length < 10) { setError(t('register.errorPhone')); return false; }
    if (singleForm.password.length < 6) { setError(t('register.errorPassword')); return false; }
    return true;
  }

  async function handleSubmit() {
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      if (type === 'family') {
        const res = await registerFamily(familyForm);
        setSuccessFingerprint(res.fingerprint);
        setSuccessMessage(`${t('login.welcome')} ${res.headName}! ${t('register.familySuccess')}`);
      } else {
        const res = await registerSingle(singleForm);
        setSuccessMessage(`${t('login.welcome')} ${res.fullName}! ${t('register.singleSuccess')}`);
      }
      setStep('success');
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string) {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffbeb' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('register.back')}</Text>
            <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {step === 'choose' && (
            <>
              <Text style={s.screenTitle}>{t('register.createTitle')}</Text>
              {/* Type selection */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => chooseType('family')} style={[s.typeCard, s.familyCard]}>
                <View style={[s.typeIcon, { backgroundColor: '#fff7ed' }]}>
                  <Feather name="users" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.typeTitle}>{t('register.family')}</Text>
                  <Text style={s.typeDesc}>{t('register.familyDesc')}</Text>
                </View>
                <Feather name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#d1d5db" />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} onPress={() => chooseType('single')} style={[s.typeCard, s.singleCard]}>
                <View style={[s.typeIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Feather name="user" size={24} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.typeTitle}>{t('register.single')}</Text>
                  <Text style={s.typeDesc}>{t('register.singleDesc')}</Text>
                </View>
                <Feather name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#d1d5db" />
              </TouchableOpacity>
            </>
          )}

          {step === 'form' && type && (
            <View style={{ gap: spacing.md }}>
              <Text style={s.screenTitle}>{type === 'family' ? t('register.familyTitle') : t('register.singleTitle')}</Text>

              {type === 'family' ? (
                <>
                  <View>
                    <Text style={s.label}>{t('register.headName')} <Text style={{ color: colors.danger }}>*</Text></Text>
                    <TextInput style={s.input} value={familyForm.headName} onChangeText={(v) => setFamilyForm({ ...familyForm, headName: v })} placeholder={t('register.headNamePlaceholder')} placeholderTextColor="#9ca3af" />
                  </View>
                  <View>
                    <Text style={s.label}>{t('register.bookNumber')} <Text style={{ color: colors.danger }}>*</Text></Text>
                    <TextInput style={s.input} value={familyForm.bookNumber} onChangeText={(v) => setFamilyForm({ ...familyForm, bookNumber: v })} placeholder={t('register.bookNumberPlaceholder')} placeholderTextColor="#9ca3af" />
                  </View>
                </>
              ) : (
                <View>
                  <Text style={s.label}>{t('register.fullName')} <Text style={{ color: colors.danger }}>*</Text></Text>
                  <TextInput style={s.input} value={singleForm.fullName} onChangeText={(v) => setSingleForm({ ...singleForm, fullName: v })} placeholder={t('register.fullNamePlaceholder')} placeholderTextColor="#9ca3af" />
                </View>
              )}

              <View>
                <Text style={s.label}>{t('register.phone')} <Text style={{ color: colors.danger }}>*</Text></Text>
                <View style={[s.inputContainer, { position: 'relative' }]}>
                  <Text style={{ position: 'absolute', start: 12, top: 15, fontSize: 14, color: colors.textLight }}>🇸🇾</Text>
                  <TextInput style={[s.input, { paddingEnd: 44 }]} value={type === 'family' ? familyForm.phone : singleForm.phone}
                    onChangeText={(v) => {
                      const cleaned = v.replace(/[^\d+]/g, '').slice(0, 13);
                      type === 'family' ? setFamilyForm({ ...familyForm, phone: cleaned }) : setSingleForm({ ...singleForm, phone: cleaned });
                    }}
                    placeholder={t('register.phonePlaceholder')} placeholderTextColor="#9ca3af" keyboardType="phone-pad" textContentType="telephoneNumber" />
                </View>
              </View>

              <View>
                <Text style={s.label}>{t('register.password')} <Text style={{ color: colors.danger }}>*</Text></Text>
                <View style={s.inputContainer}>
                  <TextInput style={{ flex: 1, fontSize: 16, color: colors.text, height: '100%' }}
                    value={type === 'family' ? familyForm.password : singleForm.password}
                    onChangeText={(v) => {
                      type === 'family' ? setFamilyForm({ ...familyForm, password: v }) : setSingleForm({ ...singleForm, password: v });
                    }}
                    placeholder={t('register.passwordPlaceholder')} placeholderTextColor="#9ca3af" secureTextEntry={!showPw} />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ position: 'absolute', end: 12 }}>
                    {showPw ? <Feather name="eye-off" size={18} color="#9ca3af" /> : <Feather name="eye" size={18} color="#9ca3af" />}
                  </TouchableOpacity>
                </View>
              </View>

              {type === 'single' && (
                <View>
                  <Text style={s.label}>{t('register.notes')} <Text style={{ color: colors.textLight, fontSize: 12 }}>{t('register.notesOptional')}</Text></Text>
                  <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} value={singleForm.notes} onChangeText={(v) => setSingleForm({ ...singleForm, notes: v })} placeholder={t('register.notesPlaceholder')} placeholderTextColor="#9ca3af" multiline numberOfLines={3} />
                </View>
              )}

              {error ? (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={16} color={colors.danger} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity activeOpacity={0.8} onPress={handleSubmit} disabled={loading}
                style={[s.submitBtn, type === 'family' ? { backgroundColor: colors.primary } : { backgroundColor: '#059669' }, loading && { opacity: 0.6 }]}>
                {loading ? <Text style={s.submitBtnText}>{t('register.submitting')}</Text> :
                  <Text style={s.submitBtnText}>{type === 'family' ? t('register.submitFamily') : t('register.submitSingle')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>{t('register.hasAccount')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'success' && (
            <View style={{ alignItems: 'center' }}>
              <View style={s.successIcon}>
                <Feather name="check-circle" size={40} color={colors.success} />
              </View>
              <Text style={s.successTitle}>{t('register.successTitle')}</Text>
              <Text style={s.successMsg}>{successMessage}</Text>

              {successFingerprint ? (
                <View style={s.fingerprintBox}>
                  <Text style={s.fpLabel}>{t('register.fingerprint')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={s.fingerprint}>{successFingerprint}</Text>
                    <TouchableOpacity onPress={() => handleCopy(successFingerprint)} style={s.copyBtn}>
                      {copied ? <Feather name="check" size={16} color={colors.success} /> : <Feather name="copy" size={16} color={colors.warning} />}
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: '#92400e', marginTop: 8 }}>{t('register.keepFingerprint')}</Text>
                </View>
              ) : (
                <View style={[s.fingerprintBox, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                  <Text style={{ fontSize: 14, color: '#059669' }}>{t('register.pendingReview')}</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.backToLoginBtn}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>{t('register.backToLogin')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screenTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    padding: spacing.xl, borderRadius: radius.xxl,
    borderWidth: 1.5, borderColor: colors.borderLight,
    backgroundColor: '#fff', marginBottom: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  familyCard: { borderColor: '#fed7aa', backgroundColor: '#fffbf5' },
  singleCard: { borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },
  typeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  typeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: spacing.lg, height: 50,
    fontSize: 16, color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, height: 50, overflow: 'hidden',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: radius.xl, padding: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.danger, flex: 1 },
  submitBtn: {
    borderRadius: radius.xl, height: 50,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  successMsg: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  fingerprintBox: {
    width: '100%', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center',
    marginBottom: spacing.xl,
  },
  fpLabel: { fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: spacing.md },
  fingerprint: {
    fontSize: 20, fontWeight: '700', color: '#78350f',
    fontFamily: 'monospace', letterSpacing: 2,
  },
  copyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
  },
  backToLoginBtn: {
    marginTop: spacing.xl, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, borderRadius: radius.xl,
    backgroundColor: colors.bgTertiary,
  },
});
