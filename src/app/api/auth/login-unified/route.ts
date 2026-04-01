import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, cleanPhone } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier?.trim() || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم / رقم الهاتف وكلمة السر' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const trimmed = identifier.trim();

    // هل هو رقم هاتف (يبدأ برقم أو +)؟
    const isPhone = /^[\d+]/.test(trimmed);
    const cleanedId = isPhone ? cleanPhone(trimmed) : trimmed;

    // =============================================
    // 1. البحث في station_admins (باسم المستخدم أو الهاتف)
    // =============================================
    if (!isPhone) {
      const { data: admin } = await supabase
        .from('station_admins')
        .select(`
          id, username, full_name, phone,
          station_id,
          stations (
            id, name, region_id
          )
        `)
        .eq('username', cleanedId)
        .eq('password_hash', passwordHash)
        .single();

      if (admin) {
        return NextResponse.json({
          success: true,
          role: 'station',
          user: {
            id: admin.id,
            username: admin.username,
            fullName: admin.full_name,
            phone: admin.phone,
            stationId: admin.station_id,
            stationName: admin.stations?.name,
            regionId: admin.stations?.region_id,
          },
        });
      }
    }

    // =============================================
    // 2. البحث في families (بالهاتف)
    // =============================================
    if (isPhone) {
      const { data: family } = await supabase
        .from('families')
        .select('id, head_name, phone, fingerprint, region_id')
        .eq('phone', cleanedId)
        .eq('password_hash', passwordHash)
        .single();

      if (family) {
        return NextResponse.json({
          success: true,
          role: 'citizen',
          userType: 'family',
          user: {
            id: family.id,
            type: 'family' as const,
            name: family.head_name,
            phone: family.phone,
            fingerprint: family.fingerprint,
            regionId: family.region_id,
          },
        });
      }
    }

    // =============================================
    // 3. البحث في singles (بالهاتف)
    // =============================================
    if (isPhone) {
      const { data: single } = await supabase
        .from('singles')
        .select('id, full_name, phone, fingerprint, region_id')
        .eq('phone', cleanedId)
        .eq('password_hash', passwordHash)
        .single();

      if (single) {
        return NextResponse.json({
          success: true,
          role: 'citizen',
          userType: 'single',
          user: {
            id: single.id,
            type: 'single' as const,
            name: single.full_name,
            phone: single.phone,
            fingerprint: single.fingerprint,
            regionId: single.region_id,
          },
        });
      }
    }

    // =============================================
    // 4. البحث في single_requests (لعرض حالة الطلب)
    // =============================================
    if (isPhone) {
      const { data: pending } = await supabase
        .from('single_requests')
        .select('id, full_name, status')
        .eq('phone', cleanedId)
        .eq('password_hash', passwordHash)
        .single();

      if (pending) {
        if (pending.status === 'pending') {
          return NextResponse.json(
            { error: 'طلبك لا يزال قيد المراجعة من قبل الإدارة', code: 'PENDING' },
            { status: 403 }
          );
        }
        if (pending.status === 'rejected') {
          return NextResponse.json(
            { error: 'تم رفض طلبك من قبل الإدارة', code: 'REJECTED' },
            { status: 403 }
          );
        }
      }
    }

    // =============================================
    // 5. أيضاً حاول البحث في station_admins بالهاتف
    // =============================================
    if (isPhone) {
      const { data: admin } = await supabase
        .from('station_admins')
        .select(`
          id, username, full_name, phone,
          station_id,
          stations (id, name, region_id)
        `)
        .eq('phone', cleanedId)
        .eq('password_hash', passwordHash)
        .single();

      if (admin) {
        return NextResponse.json({
          success: true,
          role: 'station',
          user: {
            id: admin.id,
            username: admin.username,
            fullName: admin.full_name,
            phone: admin.phone,
            stationId: admin.station_id,
            stationName: admin.stations?.name,
            regionId: admin.stations?.region_id,
          },
        });
      }
    }

    return NextResponse.json(
      { error: 'اسم المستخدم أو كلمة السر غير صحيحة' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Unified login error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
