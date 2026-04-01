import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { useStationAuthStore } from '../stores/station-auth-store';
import { useLocaleStore } from '../stores/locale-store';
import { fetchStationStats, verifyBeneficiary, confirmDelivery } from '../services/api';
import { colors, spacing, radius } from '../lib/theme';
import { Ionicons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import Toast from 'react-native-toast-message';

type Props = { navigation: any };
type ScanState = 'idle' | 'scanning' | 'verifying' | 'scanned' | 'confirmed';

interface Stats { todayDeliveries: number; totalQuota: number; remainingQuota: number; activeSessions: number }
interface ScannedBeneficiary { id: string; type: string; name: string; fingerprint: string; phone: string; roles: any[] }

export default function StationDashboard({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { admin, clearAuth } = useStationAuthStore();
  const { locale, setLocale } = useLocaleStore();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scannedData, setScannedData] = useState<ScannedBeneficiary | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const cameraRef = useRef<any>(null);
  const scanLock = useRef(false);

  const loadStats = useCallback(async () => {
    if (!admin) return;
    try {
      const data = await fetchStationStats(admin.stationId);
      setStats(data);
    } catch { /* silent */ }
  }, [admin]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ─── Language switch ───
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
                try {
                  const Updates = require('expo-updates');
                  Updates.reloadAsync();
                } catch {
                  // Fallback
                }
              },
            },
          ],
        );
      }, 300);
    }
  }

  // ─── QR Scanner ───
  async function handleBarCodeRead({ data }: { data: string; type: string }) {
    if (scanLock.current) return;
    scanLock.current = true;
    setTimeout(() => { scanLock.current = false; }, 2000);
    try {
      const parsed = JSON.parse(data);
      await doVerify(parsed.id, parsed.type);
    } catch {
      setScanState('idle');
      setConfirmError(t('station.invalidQR'));
      Toast.show({
        type: 'error',
        text1: t('toast.qrFail'),
        text2: t('station.invalidQR'),
      });
    }
  }

  async function doVerify(id: string, type: string) {
    setScanState('verifying');
    setConfirmError('');
    setConfirmSuccess('');
    try {
      const data = await verifyBeneficiary(id, type);
      setScannedData(data);
      setScanState('scanned');
    } catch (err: any) {
      setScanState('idle');
      setConfirmError(err.message || t('station.notFound'));
      Toast.show({
        type: 'error',
        text1: t('toast.verifyFail'),
        text2: err.message || t('station.notFound'),
      });
    }
  }

  async function handleManualSubmit() {
    if (!manualInput.trim()) return;
    try {
      const parsed = JSON.parse(manualInput.trim());
      await doVerify(parsed.id, parsed.type);
    } catch {
      setConfirmError(t('station.invalidFormat'));
    }
  }

  async function handleConfirm() {
    if (!scannedData || !admin) return;
    setConfirmLoading(true);
    setConfirmError('');
    setConfirmSuccess('');
    try {
      await confirmDelivery({
        beneficiaryId: scannedData.id,
        beneficiaryType: scannedData.type,
        stationId: admin.stationId,
        adminId: admin.id,
      });
      setConfirmSuccess(t('station.success'));
      setScanState('confirmed');
      loadStats();
    } catch (err: any) {
      setConfirmError(err.message || t('common.error'));
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleReset() {
    setScanState('idle');
    setScannedData(null);
    setConfirmError('');
    setConfirmSuccess('');
    setManualInput('');
    setShowManual(false);
  }

  function handleLogout() {
    Alert.alert(t('station.logout'), t('station.confirmExit'), [
      { text: t('station.cancelBtn'), style: 'cancel' },
      { text: t('station.exitBtn'), style: 'destructive', onPress: () => { clearAuth(); } },
    ]);
  }

  if (!admin) return null;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[s.avatar, { backgroundColor: colors.violet }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={s.userName}>{admin.fullName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: '#ede9fe' }]}>
                  <Text style={[s.badgeText, { color: colors.violet }]}>{t('station.title')}</Text>
                </View>
                {admin.stationName && <Text style={{ fontSize: 11, color: colors.textLight }}>{admin.stationName}</Text>}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={s.menuBtn}>
            <Feather name="settings" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings menu */}
        {showMenu && (
          <View style={s.menuDropdown}>
            <TouchableOpacity onPress={handleLanguageChange} style={s.menuItem}>
              <Feather name="globe" size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('station.language')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={s.menuItem}>
              <Feather name="log-out" size={16} color={colors.danger} />
              <Text style={{ fontSize: 14, color: colors.danger }}>{t('station.logout')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        {stats && (
          <View style={s.statsRow}>
            <View style={[s.statCard, { borderStartWidth: 4, borderStartColor: colors.success }]}>
              <View style={[s.statIcon, { backgroundColor: '#dcfce7' }]}><Feather name="truck" size={20} color={colors.success} /></View>
              <Text style={s.statNum}>{stats.todayDeliveries}</Text>
              <Text style={s.statLabel}>{t('station.todayDeliveries')}</Text>
            </View>
            <View style={[s.statCard, { borderStartWidth: 4, borderStartColor: colors.warning }]}>
              <View style={[s.statIcon, { backgroundColor: '#fef3c7' }]}><Feather name="package" size={20} color={colors.warning} /></View>
              <Text style={s.statNum}>{stats.remainingQuota}</Text>
              <Text style={s.statLabel}>{t('station.remaining')}</Text>
            </View>
            <View style={[s.statCard, { borderStartWidth: 4, borderStartColor: colors.info }]}>
              <View style={[s.statIcon, { backgroundColor: '#dbeafe' }]}><Feather name="bar-chart-2" size={20} color={colors.info} /></View>
              <Text style={s.statNum}>{stats.totalQuota}</Text>
              <Text style={s.statLabel}>{t('station.quota')}</Text>
            </View>
          </View>
        )}

        {/* Scanner Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="scan-outline" size={18} color={colors.violet} />
            <Text style={s.cardTitle}>{t('station.scanFingerprint')}</Text>
          </View>

          {/* idle */}
          {scanState === 'idle' && !confirmSuccess && (
            <View style={{ gap: spacing.md }}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => { setScanState('scanning'); setShowManual(false); }}
                style={[s.violetBtn, { shadowColor: colors.violetLight }]}>
                <Feather name="camera" size={20} color="#fff" />
                <Text style={s.btnText}>{t('station.openCamera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowManual(true)} style={s.outlineBtn}>
                <Feather name="type" size={18} color={colors.textSecondary} />
                <Text style={[s.outlineBtnText, { color: colors.textSecondary }]}>{t('station.manualInput')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* scanning */}
          {scanState === 'scanning' && (
            <View>
              <View style={s.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={s.camera}
                  facing="back"
                  onBarcodeScanned={handleBarCodeRead}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
                <View style={s.cameraOverlay} />
                <View style={s.cameraLabel}>
                  <Text style={{ fontSize: 13, color: '#fff' }}>{t('station.scanHint')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity onPress={() => setShowManual(true)} style={[s.outlineBtn, { flex: 1 }]}>
                  <Text style={s.outlineBtnText}>{t('station.manual')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleReset} style={[s.outlineBtn, { flex: 1 }]}>
                  <Text style={s.outlineBtnText}>{t('station.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* manual input */}
          {showManual && scanState === 'idle' && (
            <View style={{ gap: spacing.md }}>
              <TextInput style={[s.manualInput, { textAlign: I18nManager.isRTL ? 'right' : 'left', fontFamily: 'monospace' }]}
                value={manualInput} onChangeText={setManualInput}
                placeholder={t('station.enterFingerprint')} placeholderTextColor="#9ca3af"
                multiline numberOfLines={3} textAlignVertical="top" />
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity onPress={handleManualSubmit} style={[s.violetBtn, { flex: 1 }]}>
                  <Text style={s.btnText}>{t('station.search')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowManual(false)} style={[s.outlineBtn, { flex: 1 }]}>
                  <Text style={s.outlineBtnText}>{t('station.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* verifying */}
          {scanState === 'verifying' && (
            <View style={s.emptyState}>
              <Feather name="loader" size={36} color={colors.violet} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>{t('station.verifying')}</Text>
            </View>
          )}

          {/* scanned or confirmed */}
          {scannedData && (scanState === 'scanned' || scanState === 'confirmed') && (
            <View style={{ gap: spacing.md }}>
              <View style={s.resultBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 12, color: colors.textLight }}>{t('station.name')}</Text>
                    <Text style={s.resultName}>{scannedData.name}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: scannedData.type === 'family' ? '#fff7ed' : '#ecfdf5' }]}>
                    <Text style={[s.badgeText, { color: scannedData.type === 'family' ? '#ea580c' : '#059669' }]}>
                      {scannedData.type === 'family' ? t('dashboard.type.family') : t('dashboard.type.single')}
                    </Text>
                  </View>
                </View>
                <View style={s.resultRow}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('station.phone')}</Text>
                  <Text style={{ fontSize: 13, color: colors.text, fontFamily: 'monospace' }}>{scannedData.phone}</Text>
                </View>
                {scannedData.fingerprint ? (
                  <View style={s.resultRow}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('station.fingerprint')}</Text>
                    <Text style={{ fontSize: 12, color: colors.text, fontFamily: 'monospace' }}>{scannedData.fingerprint}</Text>
                  </View>
                ) : null}
                {scannedData.roles.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md }}>
                    <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: spacing.sm }}>{t('station.projects')}</Text>
                    {scannedData.roles.map((r: any, i: number) => (
                      <View key={i} style={s.roleRow}>
                        <Text style={{ fontSize: 13, color: colors.text }}>{r.projects?.name || '-'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.violet }}>{t('common.turn')} {r.current_turn}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {confirmError ? (
                <View style={s.errorBox}>
                  <Feather name="alert-circle" size={16} color={colors.danger} />
                  <Text style={s.errorText}>{confirmError}</Text>
                </View>
              ) : null}
              {confirmSuccess ? (
                <View style={s.successBox}>
                  <Feather name="check-circle" size={16} color={colors.success} />
                  <Text style={s.successText}>{confirmSuccess}</Text>
                </View>
              ) : null}

              {scanState === 'scanned' && (
                <TouchableOpacity activeOpacity={0.8} onPress={handleConfirm} disabled={confirmLoading}
                  style={[s.greenBtn, confirmLoading && { opacity: 0.6 }]}>
                  <Text style={s.btnText}>{confirmLoading ? t('station.confirming') : t('station.confirmDelivery')}</Text>
                </TouchableOpacity>
              )}
              {(scanState === 'confirmed' || confirmError) && (
                <TouchableOpacity onPress={handleReset} style={s.outlineBtn}>
                  <Text style={s.outlineBtnText}>{t('station.scanNew')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <Text style={s.footer}>{t('dashboard.footer')} &copy; {new Date().getFullYear()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffbeb' },
  scroll: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary },
  menuDropdown: {
    position: 'absolute', top: 50, end: spacing.xxl, zIndex: 10,
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, minWidth: 160,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  card: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.xl,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, marginBottom: spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  violetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet, borderRadius: radius.xl, height: 50,
    shadowColor: colors.violetLight, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  greenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.success, borderRadius: radius.xl, height: 50,
    shadowColor: '#bbf7d0', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, height: 50,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  cameraContainer: {
    height: 300, borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: '#111', position: 'relative',
  },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)', borderRadius: radius.xxl,
    margin: 50,
  },
  cameraLabel: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
    alignItems: 'center',
  },
  manualInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md, fontSize: 13, color: colors.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
  resultBox: {
    backgroundColor: colors.bgTertiary, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md,
  },
  resultName: { fontSize: 16, fontWeight: '700', color: colors.text },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: radius.xl, padding: spacing.md },
  errorText: { fontSize: 13, color: colors.danger, flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: radius.xl, padding: spacing.md },
  successText: { fontSize: 13, color: colors.success, flex: 1 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textLight, marginTop: spacing.xl },
});
