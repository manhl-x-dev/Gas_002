import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth-store';
import { useLocaleStore } from '../stores/locale-store';
import { fetchTurn } from '../services/api';
import { colors, spacing, radius } from '../lib/theme';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

export default function CitizenDashboard({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const { locale, setLocale } = useLocaleStore();
  const [copied, setCopied] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [turnData, setTurnData] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);

  const qrValue = JSON.stringify({ id: user?.id, type: user?.type, fingerprint: user?.fingerprint, name: user?.name });

  const fetchTurnData = useCallback(async () => {
    if (!user) return;
    setTurnLoading(true);
    try {
      const data = await fetchTurn(user.id, user.type);
      setTurnData(data);
    } catch { /* silent */ }
    finally { setTurnLoading(false); }
  }, [user]);

  function handleLogout() {
    Alert.alert(t('dashboard.logout'), t('dashboard.confirmExit'), [
      { text: t('dashboard.cancel'), style: 'cancel' },
      { text: t('dashboard.exit'), style: 'destructive', onPress: () => { clearAuth(); setShowMenu(false); } },
    ]);
  }

  function handleLanguageChange() {
    setShowMenu(false);
    Alert.alert(
      t('settings.language'),
      undefined,
      [
        {
          text: `${t('settings.arabic')}${locale === 'ar' ? ' ✓' : ''}`,
          onPress: () => changeLanguage('ar'),
        },
        {
          text: `${t('settings.english')}${locale === 'en' ? ' ✓' : ''}`,
          onPress: () => changeLanguage('en'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  }

  function changeLanguage(newLocale: 'ar' | 'en') {
    const prevLocale = locale;
    i18n.changeLanguage(newLocale);
    setLocale(newLocale);

    // If RTL direction changed, prompt restart
    const needsRtlChange = (newLocale === 'ar') !== (prevLocale === 'ar');
    if (needsRtlChange) {
      setTimeout(() => {
        Alert.alert(
          t('settings.restartRequired'),
          t('settings.restartMessage'),
          [
            { text: t('settings.later'), style: 'cancel' },
            {
              text: t('settings.restartNow'),
              style: 'default',
              onPress: () => {
                // Restart the app by reloading
                if (typeof __DEV__ !== 'undefined' && __DEV__) {
                  // In development, just log
                  console.log('App restart required for RTL change');
                }
                // On real devices, we'd use Updates.reloadAsync from expo-updates
                try {
                  const Updates = require('expo-updates');
                  Updates.reloadAsync();
                } catch {
                  // Fallback: just inform user to manually restart
                }
              },
            },
          ],
        );
      }, 300);
    }
  }

  async function handleCopy(text: string) {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) return null;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={turnLoading} onRefresh={fetchTurnData} tintColor={colors.primary} />}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={s.avatar}>
              <Ionicons name="flame-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={s.userName}>{user.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: user.type === 'family' ? '#fff7ed' : '#ecfdf5' }]}>
                  <Text style={[s.badgeText, { color: user.type === 'family' ? '#ea580c' : '#059669' }]}>
                    {user.type === 'family' ? t('dashboard.type.family') : t('dashboard.type.single')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={s.menuBtn}>
            <Feather name="settings" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings dropdown */}
        {showMenu && (
          <View style={s.menuDropdown}>
            <TouchableOpacity onPress={handleLanguageChange} style={s.menuItem}>
              <Feather name="globe" size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('dashboard.language')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={s.menuItem}>
              <Feather name="log-out" size={16} color={colors.danger} />
              <Text style={{ fontSize: 14, color: colors.danger }}>{t('dashboard.logout')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={s.cardTitle}>{t('dashboard.digitalFingerprint')}</Text>
          </View>
          {user.fingerprint ? (
            <View style={s.qrSection}>
              <View style={s.qrBox}>
                <QRCode value={qrValue} size={170} color="#1a1a1a" backgroundColor="#ffffff" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.fingerprintText}>{user.fingerprint}</Text>
                <TouchableOpacity onPress={() => handleCopy(user.fingerprint!)} style={s.copyBtn}>
                  {copied ? (
                    <Feather name="check" size={14} color={colors.success} />
                  ) : (
                    <Feather name="copy" size={14} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 11, color: colors.textLight, textAlign: 'center' }}>{t('dashboard.showCodeHint')}</Text>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Feather name="x-circle" size={36} color="#d1d5db" />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>{t('dashboard.noFingerprint')}</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>{t('dashboard.awaitingApproval')}</Text>
            </View>
          )}
        </View>

        {/* Turn Card */}
        <View style={s.card}>
          <View style={[s.cardHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="rotate-ccw" size={18} color={colors.info} />
              <Text style={s.cardTitle}>{t('dashboard.currentTurn')}</Text>
            </View>
            <TouchableOpacity onPress={fetchTurnData} disabled={turnLoading} style={s.smallBtn}>
              <Text style={s.smallBtnText}>{turnLoading ? '...' : t('common.query')}</Text>
            </TouchableOpacity>
          </View>

          {!turnData ? (
            <View style={s.emptyState}>
              <Feather name="info" size={28} color={colors.info} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>{t('dashboard.pressQuery')}</Text>
            </View>
          ) : turnData.roles.length === 0 ? (
            <View style={s.emptyState}>
              <Feather name="package" size={28} color="#d1d5db" />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>{t('dashboard.notRegistered')}</Text>
            </View>
          ) : (
            turnData.roles.map((role: any) => (
              <View key={role.id} style={[s.roleItem, role.projects?.is_active ? s.roleActive : {}]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleName}>{role.projects?.name || '-'}</Text>
                  <Text style={s.roleDetail}>{role.projects?.commodity_types?.name || ''} - {role.projects?.commodity_types?.unit || ''}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.turnNumber}>{role.current_turn}</Text>
                  <Text style={{ fontSize: 11, color: colors.textLight }}>{t('dashboard.turnLabel')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Deliveries */}
        {turnData && turnData.lastDeliveries.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Feather name="clock" size={18} color={colors.purple} />
              <Text style={s.cardTitle}>{t('dashboard.lastDeliveries')}</Text>
            </View>
            {turnData.lastDeliveries.map((d: any, i: number) => (
              <View key={i} style={s.deliveryItem}>
                <Text style={s.deliveryName}>{d.projects?.name || '-'}</Text>
                <Text style={s.deliveryDate}>{new Date(d.delivered_at).toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-US')}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer}>{t('dashboard.footer')} &copy; {new Date().getFullYear()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffbeb' },
  scroll: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary },
  menuDropdown: {
    position: 'absolute', top: 50, end: spacing.xxl, zIndex: 10,
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    minWidth: 160,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md },
  card: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.xl,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    marginBottom: spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  qrSection: { alignItems: 'center' },
  qrBox: { padding: spacing.md, backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  fingerprintText: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: 'monospace', letterSpacing: 1 },
  copyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgTertiary },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  roleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgSecondary, marginBottom: spacing.md },
  roleActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  roleName: { fontSize: 14, fontWeight: '600', color: colors.text },
  roleDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  turnNumber: { fontSize: 24, fontWeight: '700', color: colors.text },
  deliveryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderRadius: radius.xl, backgroundColor: '#faf5ff', marginBottom: spacing.sm },
  deliveryName: { fontSize: 14, fontWeight: '500', color: colors.text },
  deliveryDate: { fontSize: 12, color: colors.textLight },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textLight, marginTop: spacing.xl },
});
