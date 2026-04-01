import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, cleanPhone } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone?.trim() || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم الهاتف وكلمة السر' },
        { status: 400 }
      );
    }

    const cleanPhoneNum = cleanPhone(phone);
    const passwordHash = await hashPassword(password);

    // البحث أولاً في جدول العائلات
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, head_name, phone, fingerprint, region_id')
      .eq('phone', cleanPhoneNum)
      .eq('password_hash', passwordHash)
      .single();

    if (family && !familyError) {
      return NextResponse.json({
        success: true,
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

    // البحث في جدول الأفراد المقبولين
    const { data: single, error: singleError } = await supabase
      .from('singles')
      .select('id, full_name, phone, fingerprint, region_id')
      .eq('phone', cleanPhoneNum)
      .eq('password_hash', passwordHash)
      .single();

    if (single && !singleError) {
      return NextResponse.json({
        success: true,
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

    // البحث في جدول طلبات الأفراد المعلّقة
    const { data: pendingRequest } = await supabase
      .from('single_requests')
      .select('id, full_name, phone, status')
      .eq('phone', cleanPhoneNum)
      .eq('password_hash', passwordHash)
      .single();

    if (pendingRequest) {
      if (pendingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'طلبك لا يزال قيد المراجعة من قبل الإدارة', code: 'PENDING' },
          { status: 403 }
        );
      }
      if (pendingRequest.status === 'rejected') {
        return NextResponse.json(
          { error: 'تم رفض طلبك من قبل الإدارة', code: 'REJECTED' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'رقم الهاتف أو كلمة السر غير صحيحة' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
