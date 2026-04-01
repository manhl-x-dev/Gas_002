import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, beneficiaryType } = body;

    if (!userId || !beneficiaryType) {
      return NextResponse.json(
        { error: 'بيانات غير مكتملة' },
        { status: 400 }
      );
    }

    // البحث في جميع أدوار الغاز للمستخدم
    const { data: roles, error } = await supabase
      .from('gas_roles')
      .select(`
        id,
        current_turn,
        project_id,
        projects (
          id,
          name,
          is_active,
          commodity_types (
            name,
            unit
          )
        )
      `)
      .eq('beneficiary_id', userId)
      .eq('beneficiary_type', beneficiaryType);

    if (error) {
      console.error('Turn query error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ في قاعدة البيانات' },
        { status: 500 }
      );
    }

    // الحصول على آخر تسليم من جدول delivery_logs
    const { data: lastDeliveries } = await supabase
      .from('delivery_logs')
      .select(`
        delivered_at,
        project_id,
        projects (name)
      `)
      .eq('beneficiary_id', userId)
      .eq('beneficiary_type', beneficiaryType)
      .order('delivered_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      roles: roles || [],
      lastDeliveries: lastDeliveries || [],
    });
  } catch (err) {
    console.error('Turn check error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
