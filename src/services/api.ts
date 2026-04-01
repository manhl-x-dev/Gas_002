import i18n from '../lib/i18n';
import { hashPassword, cleanPhone } from '../lib/crypto';

const SUPABASE_URL = 'https://ykwpvtbyxtykaisaytxy.supabase.co/rest/v1';
const ANON_KEY = 'sb_publishable_wDKGB3CSnQ6788StakBM4Q_nUtefUgK';

async function supabaseRequest(table: string, options: {
  method?: string;
  body?: any;
  query?: string;
  headers?: Record<string, string>;
}) {
  const { method = 'GET', body, query = '', headers = {} } = options;
  const url = `${SUPABASE_URL}${table}${query}`;

  const res = await fetch(url, {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  const count = res.headers.get('content-range')?.split('/')[1];
  return { ok: res.ok, status: res.status, data, count: count ? Number(count) : null };
}

// ============================================================
// Helper: generate fingerprint
// ============================================================
function generateFingerprint(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'FAM-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================
// Register Family
// ============================================================
export async function registerFamily(form: {
  headName: string;
  bookNumber: string;
  phone: string;
  password: string;
}) {
  const phone = cleanPhone(form.phone);
  const passwordHash = await hashPassword(form.password);
  const fingerprint = generateFingerprint();

  const { ok, status, data } = await supabaseRequest('families', {
    method: 'POST',
    body: {
      book_number: form.bookNumber.trim(),
      head_name: form.headName.trim(),
      phone,
      password_hash: passwordHash,
      fingerprint,
    },
  });

  if (!ok) {
    const msg = data?.message || '';
    if (status === 409 || msg.includes('duplicate') || msg.includes('unique')) {
      if (msg.includes('phone')) throw new Error(i18n.t('error.phoneExists'));
      if (msg.includes('book_number')) throw new Error(i18n.t('error.bookExists'));
      throw new Error(i18n.t('error.dataExists'));
    }
    throw new Error(i18n.t('error.dbError'));
  }

  const record = Array.isArray(data) ? data[0] : data;
  return {
    id: record.id,
    fingerprint: record.fingerprint,
    headName: record.head_name,
  };
}

// ============================================================
// Register Single Request
// ============================================================
export async function registerSingle(form: {
  fullName: string;
  phone: string;
  password: string;
  notes?: string;
}) {
  const phone = cleanPhone(form.phone);
  const passwordHash = await hashPassword(form.password);

  const { ok, status, data } = await supabaseRequest('single_requests', {
    method: 'POST',
    body: {
      full_name: form.fullName.trim(),
      phone,
      password_hash: passwordHash,
      notes: form.notes?.trim() || null,
      status: 'pending',
    },
  });

  if (!ok) {
    const msg = data?.message || '';
    if (status === 409 || msg.includes('duplicate') || msg.includes('unique')) {
      if (msg.includes('phone')) throw new Error(i18n.t('error.phonePending'));
      throw new Error(i18n.t('error.dataExists'));
    }
    throw new Error(i18n.t('error.dbError'));
  }

  const record = Array.isArray(data) ? data[0] : data;
  return {
    id: record.id,
    fullName: record.full_name,
    status: record.status,
  };
}

// ============================================================
// Unified Login
// ============================================================
export async function unifiedLogin(identifier: string, password: string) {
  const passwordHash = await hashPassword(password);
  const trimmed = identifier.trim();
  const isPhone = /^[\d+]/.test(trimmed);
  const cleanedId = isPhone ? cleanPhone(trimmed) : trimmed;

  // 1. Search station_admins by username
  if (!isPhone) {
    const { data: admin } = await supabaseRequest('station_admins', {
      method: 'GET',
      query: `?username=eq.${cleanedId}&password_hash=eq.${passwordHash}&select=id,username,full_name,phone,station_id`,
    });
    if (admin && admin.length > 0) {
      const a = admin[0];
      // Fetch station name
      const { data: station } = await supabaseRequest('stations', {
        method: 'GET',
        query: `?id=eq.${a.station_id}&select=name,region_id`,
      });
      const st = station?.[0];
      return {
        role: 'station' as const,
        user: {
          id: a.id, username: a.username, fullName: a.full_name, phone: a.phone,
          stationId: a.station_id,
          stationName: st?.name || null,
          regionId: st?.region_id || null,
        },
      };
    }
  }

  // 2. Search families by phone
  if (isPhone) {
    const { data: family } = await supabaseRequest('families', {
      method: 'GET',
      query: `?phone=eq.${cleanedId}&password_hash=eq.${passwordHash}&select=id,head_name,phone,fingerprint,region_id`,
    });
    if (family && family.length > 0) {
      const f = family[0];
      return {
        role: 'citizen' as const,
        userType: 'family' as const,
        user: { id: f.id, type: 'family' as const, name: f.head_name, phone: f.phone, fingerprint: f.fingerprint, regionId: f.region_id },
      };
    }
  }

  // 3. Search singles by phone
  if (isPhone) {
    const { data: single } = await supabaseRequest('singles', {
      method: 'GET',
      query: `?phone=eq.${cleanedId}&password_hash=eq.${passwordHash}&select=id,full_name,phone,fingerprint,region_id`,
    });
    if (single && single.length > 0) {
      const s = single[0];
      return {
        role: 'citizen' as const,
        userType: 'single' as const,
        user: { id: s.id, type: 'single' as const, name: s.full_name, phone: s.phone, fingerprint: s.fingerprint, regionId: s.region_id },
      };
    }
  }

  // 4. Search single_requests (pending/rejected)
  if (isPhone) {
    const { data: pending } = await supabaseRequest('single_requests', {
      method: 'GET',
      query: `?phone=eq.${cleanedId}&password_hash=eq.${passwordHash}&select=id,full_name,status`,
    });
    if (pending && pending.length > 0) {
      const p = pending[0];
      if (p.status === 'pending') throw new Error('PENDING:' + i18n.t('station.pendingMsg'));
      if (p.status === 'rejected') throw new Error('REJECTED:' + i18n.t('station.rejectedMsg'));
    }
  }

  // 5. Search station_admins by phone
  if (isPhone) {
    const { data: admin } = await supabaseRequest('station_admins', {
      method: 'GET',
      query: `?phone=eq.${cleanedId}&password_hash=eq.${passwordHash}&select=id,username,full_name,phone,station_id`,
    });
    if (admin && admin.length > 0) {
      const a = admin[0];
      const { data: station } = await supabaseRequest('stations', {
        method: 'GET',
        query: `?id=eq.${a.station_id}&select=name,region_id`,
      });
      const st = station?.[0];
      return {
        role: 'station' as const,
        user: {
          id: a.id, username: a.username, fullName: a.full_name, phone: a.phone,
          stationId: a.station_id, stationName: st?.name || null,
          regionId: st?.region_id || null,
        },
      };
    }
  }

  throw new Error(i18n.t('error.invalidCredentials'));
}

// ============================================================
// Fetch Turn
// ============================================================
export async function fetchTurn(userId: string, beneficiaryType: string) {
  // Gas roles
  const { data: roles } = await supabaseRequest('gas_roles', {
    method: 'GET',
    query: `?beneficiary_id=eq.${userId}&beneficiary_type=eq.${beneficiaryType}&select=id,current_turn,projects(name,is_active,commodity_types(name,unit))`,
  });

  // Recent deliveries
  const { data: deliveries } = await supabaseRequest('delivery_logs', {
    method: 'GET',
    query: `?beneficiary_id=eq.${userId}&beneficiary_type=eq.${beneficiaryType}&select=delivered_at,projects(name)&order=delivered_at.desc&limit=5`,
  });

  return { roles: roles || [], lastDeliveries: deliveries || [] };
}

// ============================================================
// Station Stats
// ============================================================
export async function fetchStationStats(stationId: string) {
  const today = new Date().toISOString().split('T')[0];

  // Today's sessions
  const { data: sessions } = await supabaseRequest('distribution_sessions', {
    method: 'GET',
    query: `?station_id=eq.${stationId}&session_date=eq.${today}&select=id,quantity`,
  });

  const sessionIds = (sessions || []).map((s: any) => s.id);

  let todayCount = 0;
  let totalQuota = 0;

  if (sessionIds.length > 0) {
    // Count deliveries
    const orSessionIds = sessionIds.map((id: string) => `session_id.eq.${id}`).join('&or=');
    const { count } = await supabaseRequest('delivery_logs', {
      method: 'GET',
      query: `?${orSessionIds}&select=id`,
      headers: { 'Prefer': 'count=exact', 'Range': '0-0' },
    });
    todayCount = Number(count || 0);

    totalQuota = (sessions || []).reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
  }

  return {
    todayDeliveries: todayCount,
    totalQuota,
    remainingQuota: Math.max(0, totalQuota - todayCount),
    activeSessions: (sessions || []).length,
    sessionIds,
  };
}

// ============================================================
// Verify Beneficiary (Station)
// ============================================================
export async function verifyBeneficiary(beneficiaryId: string, beneficiaryType: string) {
  const table = beneficiaryType === 'family' ? 'families' : 'singles';
  const nameField = beneficiaryType === 'family' ? 'head_name' : 'full_name';

  const { ok, data } = await supabaseRequest(`${table}?id=eq.${beneficiaryId}&select=id,${nameField},phone,fingerprint`, {
    method: 'GET',
  });

  if (!ok || !data || data.length === 0) {
    throw new Error(i18n.t('error.beneficiaryNotFound'));
  }

  const record = data[0];

  // Gas roles
  const { data: roles } = await supabaseRequest('gas_roles', {
    method: 'GET',
    query: `?beneficiary_id=eq.${beneficiaryId}&beneficiary_type=eq.${beneficiaryType}&select=current_turn,projects(name,commodity_types(name,unit))`,
  });

  return {
    id: record.id,
    type: beneficiaryType,
    name: record[nameField],
    fingerprint: record.fingerprint || '',
    phone: record.phone,
    roles: roles || [],
  };
}

// ============================================================
// Confirm Delivery
// ============================================================
export async function confirmDelivery(params: {
  beneficiaryId: string;
  beneficiaryType: string;
  stationId: string;
  adminId: string;
}) {
  const today = new Date().toISOString().split('T')[0];

  // Find active session
  const { data: sessions } = await supabaseRequest('distribution_sessions', {
    method: 'GET',
    query: `?station_id=eq.${params.stationId}&session_date=eq.${today}&select=id,project_id,quantity`,
  });

  if (!sessions || sessions.length === 0) {
    throw new Error(i18n.t('error.noActiveSession'));
  }

  const session = sessions[0];

  // Check for duplicate delivery
  const { data: existing } = await supabaseRequest('delivery_logs', {
    method: 'GET',
    query: `?session_id=eq.${session.id}&beneficiary_id=eq.${params.beneficiaryId}&beneficiary_type=eq.${params.beneficiaryType}&select=id`,
  });

  if (existing && existing.length > 0) {
    throw new Error(i18n.t('error.alreadyDelivered'));
  }

  // Insert delivery log
  const { ok, data } = await supabaseRequest('delivery_logs', {
    method: 'POST',
    body: {
      project_id: session.project_id,
      beneficiary_type: params.beneficiaryType,
      beneficiary_id: params.beneficiaryId,
      session_id: session.id,
      delivered_by: params.adminId,
    },
  });

  if (!ok) {
    const msg = data?.message || '';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error(i18n.t('error.alreadyDeliveredShort'));
    }
    throw new Error(i18n.t('error.deliveryFailed'));
  }

  return { success: true, message: i18n.t('station.success') };
}
