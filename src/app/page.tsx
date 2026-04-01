'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Users,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Settings,
  QrCode,
  RotateCcw,
  Package,
  Clock,
  ChevronLeft,
  AlertCircle,
  XCircle,
  Info,
  ScanLine,
  ShieldCheck,
  BarChart3,
  Camera,
  Keyboard,
  Truck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, type BeneficiaryType } from '@/stores/auth-store';
import { useStationAuthStore } from '@/stores/station-auth-store';
import { Html5Qrcode } from 'html5-qrcode';

// ============================================================
// أنواع
// ============================================================
type AppView = 'login' | 'register' | 'dashboard';
type RegisterStep = 'choose' | 'form' | 'success';
type ScannerState = 'idle' | 'scanning' | 'scanned' | 'verifying' | 'confirmed';

interface TurnResponse {
  success: boolean;
  roles: { id: string; current_turn: number; projects: { name: string; is_active: boolean; commodity_types: { name: string; unit: string } | null } | null }[];
  lastDeliveries: { delivered_at: string; projects: { name: string } | null }[];
}

interface ScannedBeneficiary {
  id: string;
  type: string;
  name: string;
  fingerprint: string;
  phone: string;
  roles: { current_turn: number; projects: { name: string; commodity_types: { name: string; unit: string } | null } | null }[];
  lastDelivery: string | null;
}

interface StatsData {
  todayDeliveries: number;
  totalQuota: number;
  remainingQuota: number;
  activeSessions: number;
  recentDeliveries: { id: string; deliveredAt: string; beneficiaryType: string; beneficiaryName: string | null }[];
}

// ============================================================
// حركات
// ============================================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ============================================================
// الشاشة الرئيسية - راوتر تلقائي
// ============================================================
export default function AppPage() {
  const { isAuthenticated: citizenAuth } = useAuthStore();
  const { isAuthenticated: stationAuth } = useStationAuthStore();

  const isLoggedIn = citizenAuth || stationAuth;
  const [view, setView] = useState<AppView>(isLoggedIn ? 'dashboard' : 'login');
  const [prevCitizenAuth, setPrevCitizenAuth] = useState(citizenAuth);
  const [prevStationAuth, setPrevStationAuth] = useState(stationAuth);

  if (citizenAuth !== prevCitizenAuth) {
    setPrevCitizenAuth(citizenAuth);
    if (citizenAuth) setView('dashboard');
  }
  if (stationAuth !== prevStationAuth) {
    setPrevStationAuth(stationAuth);
    if (stationAuth) setView('dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {view === 'login' && !isLoggedIn && (
            <UnifiedLoginScreen key="login" onGoRegister={() => setView('register')} />
          )}
          {view === 'register' && !isLoggedIn && (
            <motion.div key="reg" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
              <button onClick={() => setView('login')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> رجوع
              </button>
              <RegisterScreen onGoLogin={() => setView('login')} />
            </motion.div>
          )}
          {isLoggedIn && <AutoDashboard key="dash" onLogout={() => setView('login')} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// شاشة تسجيل الدخول الموحّدة
// ============================================================
function UnifiedLoginScreen({ onGoRegister }: { onGoRegister: () => void }) {
  const setCitizenAuth = useAuthStore((s) => s.setAuth);
  const setStationAuth = useStationAuthStore((s) => s.setAuth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!identifier.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم / رقم الهاتف وكلمة السر');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }

      if (data.role === 'citizen') {
        setCitizenAuth(data.user);
      } else if (data.role === 'station') {
        setStationAuth(data.user);
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  const isPhone = /^[\d+]/.test(identifier.trim());

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl shadow-lg shadow-orange-200 mb-4">
          <Flame className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">نظام توزيع الغاز</h1>
        <p className="text-sm text-gray-500 mt-1">تسجيل الدخول</p>
      </motion.div>

      <motion.div variants={fadeInUp} initial="initial" animate="animate" exit="exit">
        <Card className="border-0 shadow-xl shadow-gray-200/50">
          <CardContent className="pt-6 space-y-5">
            {/* حقل واحد ذكي */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-700 font-medium">
                رقم الهاتف أو اسم المستخدم
              </Label>
              <div className="relative">
                {!isPhone && identifier.trim().length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
                {isPhone && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                    🇸🇾
                  </span>
                )}
                <Input
                  id="identifier"
                  placeholder="09XXXXXXXX أو اسم المستخدم"
                  dir={isPhone ? 'ltr' : 'rtl'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`h-12 rounded-xl border-gray-200 text-base ${isPhone ? 'pr-12 text-left' : 'pr-11'}`}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <p className="text-xs text-gray-400">
                {isPhone ? 'سيتم البحث كحساب مواطن (عائلة / فردي)' : 'سيتم البحث كحساب معتمد'}
              </p>
            </div>

            {/* كلمة السر */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">كلمة السر</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة السر"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 text-base pl-12"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* خطأ */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* زر الدخول */}
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-bold shadow-lg bg-gradient-to-l from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>

            {/* رابط التسجيل */}
            <div className="text-center">
              <button
                onClick={onGoRegister}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                ليس لديك حساب؟ سجّل الآن
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

// ============================================================
// التوجيه التلقائي للوحة التحكم الصحيحة
// ============================================================
function AutoDashboard({ onLogout }: { onLogout: () => void }) {
  const citizenAuth = useAuthStore((s) => s.isAuthenticated);
  const stationAuth = useStationAuthStore((s) => s.isAuthenticated);

  if (stationAuth) return <StationDashboard onLogout={onLogout} />;
  if (citizenAuth) return <CitizenDashboard onLogout={onLogout} />;
  return null;
}

// ============================================================
// لوحة تحكم المواطن
// ============================================================
function CitizenDashboard({ onLogout }: { onLogout: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [turnData, setTurnData] = useState<TurnResponse | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const fetchTurn = useCallback(async () => {
    if (!user) return;
    setTurnLoading(true);
    try {
      const res = await fetch('/api/auth/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, beneficiaryType: user.type }) });
      const data = await res.json();
      if (res.ok) setTurnData(data);
    } catch { /* silent */ }
    finally { setTurnLoading(false); }
  }, [user]);

  if (!user) return null;
  const qrValue = JSON.stringify({ id: user.id, type: user.type, fingerprint: user.fingerprint, name: user.name });

  function handleLogout() { clearAuth(); onLogout(); }

  return (
    <>
      {/* الهيدر */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-md"><Flame className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{user.name}</h1>
            <div className="flex items-center gap-2">
              <Badge className={user.type === 'family' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                {user.type === 'family' ? 'عائلة' : 'فردي'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} className="rounded-xl"><Settings className="w-5 h-5 text-gray-500" /></Button>
          <AnimatePresence>{showMenu && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-10 left-0 z-50 bg-white rounded-xl shadow-xl border p-2 min-w-[140px]">
              <button onClick={() => { handleLogout(); setShowMenu(false); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 text-right">
                <LogOut className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600">تسجيل الخروج</span>
              </button>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </motion.div>

      {/* بطاقة QR */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-lg mb-4">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2 mb-4"><QrCode className="w-5 h-5 text-orange-500" /><h2 className="font-bold text-gray-800">البصمة الرقمية</h2></div>
            <div className="flex flex-col items-center">
              {user.fingerprint ? (
                <>
                  <div className="bg-white p-4 rounded-2xl border shadow-sm mb-4"><QRCodeSVG value={qrValue} size={180} level="H" fgColor="#1a1a1a" bgColor="#ffffff" /></div>
                  <div dir="ltr" className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-gray-800 tracking-wider">{user.fingerprint}</span>
                    <button onClick={() => { navigator.clipboard.writeText(user.fingerprint!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6"><XCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">لم تُعطَ بصمة تسجيل بعد</p></div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* بطاقة الدور */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-0 shadow-lg mb-4">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-blue-500" /><h2 className="font-bold text-gray-800">الدور الحالي</h2></div>
              <Button variant="outline" size="sm" onClick={fetchTurn} disabled={turnLoading} className="rounded-xl text-xs gap-1.5">
                {turnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} استعلام
              </Button>
            </div>
            {!turnData ? (
              <div className="text-center py-4"><Info className="w-7 h-7 text-blue-400 mx-auto mb-2" /><p className="text-sm text-gray-500">اضغط &quot;استعلام&quot; لمعرفة دورك</p></div>
            ) : turnData.roles.length === 0 ? (
              <div className="text-center py-4"><Package className="w-7 h-7 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">لم يتم تسجيلك في مشروع بعد</p></div>
            ) : (
              <div className="space-y-3">
                {turnData.roles.map((role) => (
                  <div key={role.id} className={`p-4 rounded-xl border ${role.projects?.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium text-gray-800 text-sm">{role.projects?.name || '-'}</p><p className="text-xs text-gray-500 mt-1">{role.projects?.commodity_types?.name || ''} - {role.projects?.commodity_types?.unit || ''}</p></div>
                      <div className="text-left"><p className="text-2xl font-bold text-gray-800">{role.current_turn}</p><p className="text-xs text-gray-500">دور</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {turnData && turnData.lastDeliveries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg mb-4">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-purple-500" /><h2 className="font-bold text-gray-800">آخر التسليمات</h2></div>
              <div className="space-y-2">
                {turnData.lastDeliveries.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50">
                    <p className="text-sm font-medium text-gray-700">{d.projects?.name || '-'}</p>
                    <span className="text-xs text-gray-400">{new Date(d.delivered_at).toLocaleDateString('ar-SY')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6 pb-2">نظام توزيع الغاز &copy; {new Date().getFullYear()}</p>
    </>
  );
}

// ============================================================
// لوحة تحكم المعتمد
// ============================================================
function StationDashboard({ onLogout }: { onLogout: () => void }) {
  const { admin, clearAuth } = useStationAuthStore();
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [scannedData, setScannedData] = useState<ScannedBeneficiary | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!admin) return;
    try {
      const res = await fetch('/api/deliver/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: admin.stationId }) });
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch { /* silent */ }
  }, [admin]);

  // جلب الإحصائيات عند التحميل
  const statsFetched = useRef(false);
  if (admin && !statsFetched.current) {
    statsFetched.current = true;
    fetchStats();
  }

  function handleLogout() { clearAuth(); onLogout(); statsFetched.current = false; }

  const scanCallbackRef = useRef<(data: string) => void>(() => {});
  scanCallbackRef.current = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      await verifyBeneficiary(parsed.id, parsed.type);
    } catch {
      setScannerState('idle');
      setConfirmError('كود QR غير صالح');
    }
  };

  const stableOnScan = useCallback((data: string) => { scanCallbackRef.current(data); }, []);

  async function handleManualSubmit() {
    if (!manualInput.trim()) return;
    try {
      const parsed = JSON.parse(manualInput.trim());
      await verifyBeneficiary(parsed.id, parsed.type);
    } catch {
      setConfirmError('صيغة البيانات غير صحيحة');
    }
  }

  async function verifyBeneficiary(id: string, type: string) {
    setScannerState('verifying');
    setConfirmError('');
    setConfirmSuccess('');
    try {
      const res = await fetch('/api/deliver/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ beneficiaryId: id, beneficiaryType: type }) });
      const data = await res.json();
      if (!res.ok) { setScannerState('idle'); setConfirmError(data.error || 'لم يتم العثور على المستفيد'); return; }
      setScannedData(data.beneficiary);
      setScannerState('scanned');
    } catch { setScannerState('idle'); setConfirmError('خطأ في الاتصال'); }
  }

  async function handleConfirmDelivery() {
    if (!scannedData || !admin) return;
    setConfirmLoading(true);
    setConfirmError('');
    setConfirmSuccess('');
    try {
      const res = await fetch('/api/deliver/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryId: scannedData.id, beneficiaryType: scannedData.type, stationId: admin.stationId, adminId: admin.id }),
      });
      const data = await res.json();
      if (!res.ok) { setConfirmError(data.error || 'حدث خطأ'); return; }
      setConfirmSuccess(data.message);
      setScannerState('confirmed');
      fetchStats();
    } catch { setConfirmError('خطأ في الاتصال'); }
    finally { setConfirmLoading(false); }
  }

  function handleReset() {
    setScannerState('idle');
    setScannedData(null);
    setConfirmError('');
    setConfirmSuccess('');
    setManualInput('');
    setShowManualInput(false);
  }

  if (!admin) return null;

  return (
    <>
      {/* الهيدر */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-md"><ShieldCheck className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{admin.fullName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">معتمد</Badge>
              {admin.stationName && <span className="text-xs text-gray-500">{admin.stationName}</span>}
            </div>
          </div>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} className="rounded-xl"><Settings className="w-5 h-5 text-gray-500" /></Button>
          <AnimatePresence>{showMenu && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-10 left-0 z-50 bg-white rounded-xl shadow-xl border p-2 min-w-[140px]">
              <button onClick={() => { handleLogout(); setShowMenu(false); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 text-right">
                <LogOut className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600">تسجيل الخروج</span>
              </button>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </motion.div>

      {/* إحصائيات */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl mb-2"><Truck className="w-5 h-5 text-green-600" /></div>
              <p className="text-2xl font-bold text-gray-800">{stats.todayDeliveries}</p>
              <p className="text-xs text-gray-500">تسليم اليوم</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl mb-2"><Package className="w-5 h-5 text-amber-600" /></div>
              <p className="text-2xl font-bold text-gray-800">{stats.remainingQuota}</p>
              <p className="text-xs text-gray-500">متبقي</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl mb-2"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
              <p className="text-2xl font-bold text-gray-800">{stats.totalQuota}</p>
              <p className="text-xs text-gray-500">الحصة</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* الماسح */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-lg mb-4">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2 mb-4"><ScanLine className="w-5 h-5 text-violet-500" /><h2 className="font-bold text-gray-800">مسح البصمة</h2></div>

            <AnimatePresence mode="wait">
              {/* انتظار */}
              {scannerState === 'idle' && !confirmSuccess && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                  <div className="space-y-3">
                    <Button onClick={() => { setScannerState('scanning'); setShowManualInput(false); }}
                      className="w-full h-12 rounded-xl text-base font-medium bg-gradient-to-l from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200">
                      <Camera className="w-5 h-5 ml-2" /> فتح الكاميرا
                    </Button>
                    <Button onClick={() => setShowManualInput(true)} variant="outline" className="w-full h-12 rounded-xl text-base font-medium">
                      <Keyboard className="w-5 h-5 ml-2" /> إدخال يدوي
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* مسح */}
              {scannerState === 'scanning' && (
                <motion.div key="scanning" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <div className="bg-gray-900 rounded-2xl overflow-hidden mb-3 relative" style={{ minHeight: 300 }}>
                    <QRScannerWrapper onScan={stableOnScan} isActive={true} />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-52 h-52 border-4 border-white/30 rounded-3xl" />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-center">
                      <p className="text-sm text-white/80 bg-black/50 rounded-lg py-2 px-3 inline-block">وجّه الكاميرا نحو كود QR</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowManualInput(true)} variant="outline" className="flex-1 h-10 rounded-xl text-sm"><Keyboard className="w-4 h-4 ml-1" /> يدوي</Button>
                    <Button onClick={handleReset} variant="outline" className="flex-1 h-10 rounded-xl text-sm">إلغاء</Button>
                  </div>
                </motion.div>
              )}

              {/* إدخال يدوي */}
              {showManualInput && scannerState === 'idle' && (
                <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="space-y-3">
                    <textarea placeholder="أدخل بصمة المستفيد أو بيانات JSON" value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)} rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-200" dir="ltr" />
                    <div className="flex gap-2">
                      <Button onClick={handleManualSubmit} className="flex-1 h-10 rounded-xl bg-violet-500 text-white text-sm">بحث</Button>
                      <Button onClick={() => setShowManualInput(false)} variant="outline" className="flex-1 h-10 rounded-xl text-sm">إلغاء</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* التحقق */}
              {scannerState === 'verifying' && (
                <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" /><p className="text-sm text-gray-500">جاري التحقق...</p>
                </motion.div>
              )}

              {/* النتيجة */}
              {scannedData && (scannerState === 'scanned' || scannerState === 'confirmed') && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs text-gray-500">الاسم</p><p className="font-bold text-gray-800">{scannedData.name}</p></div>
                      <Badge className={scannedData.type === 'family' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                        {scannedData.type === 'family' ? 'عائلة' : 'فردي'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">الهاتف</span>
                      <span dir="ltr" className="text-gray-700">{scannedData.phone}</span>
                    </div>
                    {scannedData.fingerprint && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">البصمة</span>
                        <span dir="ltr" className="font-mono text-gray-700 text-xs">{scannedData.fingerprint}</span>
                      </div>
                    )}
                    {scannedData.roles.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500">المشاريع</p>
                        {scannedData.roles.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-white rounded-lg p-2">
                            <span className="text-gray-700">{r.projects?.name || '-'}</span>
                            <span className="font-bold text-violet-600">دور {r.current_turn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>{confirmError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-600">{confirmError}</p></div>
                    </motion.div>
                  )}</AnimatePresence>
                  <AnimatePresence>{confirmSuccess && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /><p className="text-sm text-green-600">{confirmSuccess}</p></div>
                    </motion.div>
                  )}</AnimatePresence>

                  {scannerState === 'scanned' && (
                    <Button onClick={handleConfirmDelivery} disabled={confirmLoading}
                      className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-l from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200">
                      {confirmLoading ? <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> جاري التأكيد...</span> : 'تأكيد التسليم'}
                    </Button>
                  )}
                  {(scannerState === 'confirmed' || confirmError) && (
                    <Button onClick={handleReset} variant="outline" className="w-full h-12 rounded-xl text-base mt-2">مسح بصمة جديدة</Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* آخر التسليمات */}
      {stats && stats.recentDeliveries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg mb-4">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-purple-500" /><h2 className="font-bold text-gray-800">آخر التسليمات</h2></div>
                <Button variant="ghost" size="sm" onClick={fetchStats} className="rounded-xl text-xs gap-1"><RefreshCw className="w-3 h-3" /> تحديث</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.recentDeliveries.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50">
                    <div><p className="text-sm font-medium text-gray-700">{d.beneficiaryName || '-'}</p>
                      <Badge variant="outline" className="text-xs mt-1">{d.beneficiaryType === 'family' ? 'عائلة' : 'فردي'}</Badge></div>
                    <span className="text-xs text-gray-400">{new Date(d.deliveredAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6 pb-2">نظام توزيع الغاز &copy; {new Date().getFullYear()}</p>
    </>
  );
}

// ============================================================
// شاشة التسجيل
// ============================================================
function RegisterScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const [step, setStep] = useState<RegisterStep>('choose');
  const [beneficiaryType, setBeneficiaryType] = useState<BeneficiaryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [familyForm, setFamilyForm] = useState({ headName: '', bookNumber: '', phone: '', password: '' });
  const [singleForm, setSingleForm] = useState({ fullName: '', phone: '', password: '', notes: '' });
  const [successData, setSuccessData] = useState<{ type: BeneficiaryType; fingerprint?: string; message: string } | null>(null);

  function handleChooseType(type: BeneficiaryType) { setBeneficiaryType(type); setError(''); setStep('form'); }
  function handleBack() {
    setError('');
    if (step === 'form') { setStep('choose'); setBeneficiaryType(null); }
    else { setStep('choose'); setBeneficiaryType(null); setSuccessData(null); setFamilyForm({ headName: '', bookNumber: '', phone: '', password: '' }); setSingleForm({ fullName: '', phone: '', password: '', notes: '' }); }
  }

  function validate(): boolean {
    if (beneficiaryType === 'family') {
      if (!familyForm.headName.trim()) { setError('يرجى إدخال اسم رب الأسرة'); return false; }
      if (!familyForm.bookNumber.trim()) { setError('يرجى إدخال رقم دفتر العائلة'); return false; }
      if (familyForm.phone.replace(/[^\d+]/g, '').length < 10) { setError('يرجى إدخال رقم هاتف صحيح'); return false; }
      if (familyForm.password.length < 6) { setError('كلمة السر يجب أن تكون 6 أحرف على الأقل'); return false; }
      return true;
    }
    if (!singleForm.fullName.trim()) { setError('يرجى إدخال الاسم الكامل'); return false; }
    if (singleForm.phone.replace(/[^\d+]/g, '').length < 10) { setError('يرجى إدخال رقم هاتف صحيح'); return false; }
    if (singleForm.password.length < 6) { setError('كلمة السر يجب أن تكون 6 أحرف على الأقل'); return false; }
    return true;
  }

  async function handleSubmit() {
    setError(''); if (!validate()) return; setLoading(true);
    try {
      const endpoint = beneficiaryType === 'family' ? '/api/register/family' : '/api/register/single';
      const form = beneficiaryType === 'family' ? familyForm : singleForm;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); return; }
      if (beneficiaryType === 'family') setSuccessData({ type: 'family', fingerprint: data.data.fingerprint, message: `مرحباً ${data.data.headName}! تم تسجيل عائلتك بنجاح` });
      else setSuccessData({ type: 'single', message: `مرحباً ${data.data.fullName}! تم إرسال طلبك وسيتم مراجعته` });
      setStep('success');
    } catch { setError('حدث خطأ في الاتصال بالخادم'); }
    finally { setLoading(false); }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">إنشاء حساب جديد</h1>
      </motion.div>
      <AnimatePresence mode="wait">
        {step === 'choose' && (
          <motion.div key="choose" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
            <Card className="border-0 shadow-xl shadow-gray-200/50">
              <CardHeader className="text-center pb-4"><CardTitle className="text-xl text-gray-800">اختر نوع الحساب</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleChooseType('family')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-right">
                  <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl shrink-0"><Users className="w-7 h-7 text-orange-600" /></div>
                  <div><h3 className="font-bold text-gray-800 text-lg">عائلة</h3><p className="text-sm text-gray-500">تسجيل بعنوان دفتر العائلة</p></div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 mr-auto" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleChooseType('single')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-right">
                  <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl shrink-0"><User className="w-7 h-7 text-emerald-600" /></div>
                  <div><h3 className="font-bold text-gray-800 text-lg">عازب</h3><p className="text-sm text-gray-500">تقديم طلب تسجيل فردي</p></div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 mr-auto" />
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {step === 'form' && beneficiaryType && (
          <motion.div key="form" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
            <Card className="border-0 shadow-xl shadow-gray-200/50">
              <CardHeader className="pb-4">
                <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"><ChevronLeft className="w-4 h-4" /> رجوع</button>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${beneficiaryType === 'family' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                    {beneficiaryType === 'family' ? <Users className="w-6 h-6 text-orange-600" /> : <User className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <div><CardTitle className="text-xl text-gray-800">{beneficiaryType === 'family' ? 'تسجيل عائلة' : 'تسجيل فردي'}</CardTitle></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {beneficiaryType === 'family' ? (<>
                    <div className="space-y-2"><Label className="text-gray-700 font-medium">اسم رب الأسرة <span className="text-red-500">*</span></Label>
                      <Input placeholder="مثال: أحمد محمد" value={familyForm.headName} onChange={(e) => setFamilyForm({ ...familyForm, headName: e.target.value })} className="h-12 rounded-xl border-gray-200" /></div>
                    <div className="space-y-2"><Label className="text-gray-700 font-medium">رقم دفتر العائلة <span className="text-red-500">*</span></Label>
                      <Input placeholder="مثال: 12345" value={familyForm.bookNumber} onChange={(e) => setFamilyForm({ ...familyForm, bookNumber: e.target.value })} className="h-12 rounded-xl border-gray-200" /></div>
                  </>) : (
                    <div className="space-y-2"><Label className="text-gray-700 font-medium">الاسم الكامل <span className="text-red-500">*</span></Label>
                      <Input placeholder="مثال: محمد أحمد" value={singleForm.fullName} onChange={(e) => setSingleForm({ ...singleForm, fullName: e.target.value })} className="h-12 rounded-xl border-gray-200" /></div>
                  )}
                  <div className="space-y-2"><Label className="text-gray-700 font-medium">رقم الهاتف <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🇸🇾</span>
                      <Input dir="ltr" placeholder="09XXXXXXXX" value={beneficiaryType === 'family' ? familyForm.phone : singleForm.phone}
                        onChange={(e) => { const v = e.target.value.replace(/[^\d+]/g, '').slice(0, 13); if (beneficiaryType === 'family') setFamilyForm({ ...familyForm, phone: v }); else setSingleForm({ ...singleForm, phone: v }); }}
                        className="h-12 rounded-xl border-gray-200 pr-12 text-left" />
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-gray-700 font-medium">كلمة السر <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="6 أحرف على الأقل" value={beneficiaryType === 'family' ? familyForm.password : singleForm.password}
                        onChange={(e) => { if (beneficiaryType === 'family') setFamilyForm({ ...familyForm, password: e.target.value }); else setSingleForm({ ...singleForm, password: e.target.value }); }}
                        className="h-12 rounded-xl border-gray-200 pl-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {beneficiaryType === 'single' && (
                    <div className="space-y-2"><Label className="text-gray-700 font-medium">ملاحظات <span className="text-gray-400 text-xs">(اختياري)</span></Label>
                      <textarea placeholder="ملاحظات إضافية..." value={singleForm.notes} onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })} rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200" /></div>
                  )}
                  <AnimatePresence>{error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-600">{error}</p></div>
                    </motion.div>)}</AnimatePresence>
                  <Button onClick={handleSubmit} disabled={loading}
                    className={`w-full h-12 rounded-xl text-base font-bold shadow-lg ${beneficiaryType === 'family' ? 'bg-gradient-to-l from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-200' : 'bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200'}`}>
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> جاري التسجيل...</span> : beneficiaryType === 'family' ? 'تسجيل العائلة' : 'إرسال الطلب'}
                  </Button>
                  <div className="text-center"><button onClick={onGoLogin} className="text-sm text-orange-600 hover:text-orange-700 font-medium">لديك حساب؟ سجّل دخولك</button></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {step === 'success' && successData && (
          <motion.div key="success" variants={fadeInUp} initial="initial" animate="animate" exit="exit">
            <Card className="border-0 shadow-xl shadow-gray-200/50">
              <CardContent className="pt-8 pb-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"><CheckCircle2 className="w-10 h-10 text-green-500" /></motion.div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">تم بنجاح!</h2>
                <p className="text-gray-500 mb-6">{successData.message}</p>
                {successData.type === 'family' && successData.fingerprint && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                    <p className="text-sm text-amber-700 font-medium mb-3">بصمة التسجيل</p>
                    <div className="flex items-center justify-center gap-3">
                      <div dir="ltr" className="text-2xl font-mono font-bold text-amber-800 tracking-wider bg-white px-4 py-2 rounded-xl border border-amber-200">{successData.fingerprint}</div>
                      <button onClick={() => { navigator.clipboard.writeText(successData.fingerprint!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200">
                        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-amber-700" />}
                      </button>
                    </div>
                  </div>
                )}
                {successData.type === 'single' && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6"><p className="text-sm text-emerald-700">طلبك قيد المراجعة</p></div>}
                <Button onClick={onGoLogin} variant="outline" className="rounded-xl h-12 text-base px-8">العودة لتسجيل الدخول</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// مكون الماسح
// ============================================================
function QRScannerWrapper({ onScan, isActive }: { onScan: (data: string) => void; isActive: boolean }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isActive) return;
    const scannerId = 'gas-qr-reader';
    let cancelled = false;

    async function start() {
      try {
        const el = document.getElementById(scannerId);
        if (!el || cancelled) return;
        scannerRef.current = new Html5Qrcode(scannerId);
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (text) => { if (!cancelled) { onScan(text); scannerRef.current?.stop().catch(() => {}); } },
          () => { /* ignore */ }
        );
      } catch (err) {
        console.error('QR scanner error:', err);
      }
    }

    const timer = setTimeout(start, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch { /* */ }
        try { scannerRef.current.clear(); } catch { /* */ }
      }
    };
  }, [isActive, onScan]);

  return <div id="gas-qr-reader" className="w-full" style={{ minHeight: 300 }} />;
}
