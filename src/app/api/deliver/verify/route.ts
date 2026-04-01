import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beneficiaryId, beneficiaryType } = body;

    if (!beneficiaryId || !beneficiaryType) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    let beneficiaryName = '';
    let fingerprint = '';
    let phone = '';

    if (beneficiaryType === 'family') {
      const { data, error } = await supabase
        .from('families')
        .select('id, head_name, phone, fingerprint')
        .eq('id', beneficiaryId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'لم يتم العثور على بيانات العائلة' }, { status: 404 });
      }
      beneficiaryName = data.head_name;
      fingerprint = data.fingerprint;
      phone = data.phone;
    } else {
      const { data, error } = await supabase
        .from('singles')
        .select('id, full_name, phone, fingerprint')
        .eq('id', beneficiaryId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'لم يتم العثور على بيانات الفرد' }, { status: 404 });
      }
      beneficiaryName = data.full_name;
      fingerprint = data.fingerprint || '';
      phone = data.phone;
    }

    // الحصول على أدوار الغاز
    const { data: roles } = await supabase
      .from('gas_roles')
      .select(`
        current_turn,
        project_id,
        projects (name, is_active, commodity_types (name, unit))
      `)
      .eq('beneficiary_id', beneficiaryId)
      .eq('beneficiary_type', beneficiaryType);

    // آخر تسليم
    const { data: lastDelivery } = await supabase
      .from('delivery_logs')
      .select('delivered_at')
      .eq('beneficiary_id', beneficiaryId)
      .eq('beneficiary_type', beneficiaryType)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      beneficiary: {
        id: beneficiaryId,
        type: beneficiaryType,
        name: beneficiaryName,
        fingerprint,
        phone,
        roles: roles || [],
        lastDelivery: lastDelivery?.delivered_at || null,
      },
    });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
