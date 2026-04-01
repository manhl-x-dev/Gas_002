import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beneficiaryId, beneficiaryType, stationId, adminId } = body;

    if (!beneficiaryId || !beneficiaryType || !stationId) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // البحث عن جلسة توزيع نشطة للمحطة اليوم
    const { data: activeSessions, error: sessErr } = await supabase
      .from('distribution_sessions')
      .select('id, project_id, quantity')
      .eq('station_id', stationId)
      .eq('session_date', today);

    if (sessErr) {
      console.error('Session query error:', sessErr);
      return NextResponse.json({ error: 'حدث خطأ في قاعدة البيانات' }, { status: 500 });
    }

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد جلسة توزيع نشطة لهذه المحطة اليوم' },
        { status: 400 }
      );
    }

    // نستخدم أول جلسة نشطة
    const session = activeSessions[0];

    // التحقق من أن المستفيد مسجل في المشروع
    const { data: gasRole, error: roleErr } = await supabase
      .from('gas_roles')
      .select('id, current_turn, project_id')
      .eq('project_id', session.project_id)
      .eq('beneficiary_type', beneficiaryType)
      .eq('beneficiary_id', beneficiaryId)
      .single();

    if (roleErr || !gasRole) {
      return NextResponse.json(
        { error: 'هذا المستفيد غير مسجل في مشروع التوزيع الحالي' },
        { status: 404 }
      );
    }

    // التحقق من عدم تسليم مكرر لهذه الجلسة
    const { data: existingDelivery } = await supabase
      .from('delivery_logs')
      .select('id')
      .eq('session_id', session.id)
      .eq('beneficiary_type', beneficiaryType)
      .eq('beneficiary_id', beneficiaryId)
      .maybeSingle();

    if (existingDelivery) {
      return NextResponse.json(
        { error: 'تم تسليم هذا المستفيد بالفعل في هذه الجلسة' },
        { status: 409 }
      );
    }

    // إدراج سجل التسليم
    const { data: delivery, error: delErr } = await supabase
      .from('delivery_logs')
      .insert({
        project_id: session.project_id,
        beneficiary_type: beneficiaryType,
        beneficiary_id: beneficiaryId,
        session_id: session.id,
        delivered_by: adminId || null,
      })
      .select('id, delivered_at')
      .single();

    if (delErr) {
      console.error('Delivery insert error:', delErr);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء تسجيل التسليم' },
        { status: 500 }
      );
    }

    // الحصول على بيانات المستفيد لعرضها
    let beneficiaryName = '';
    if (beneficiaryType === 'family') {
      const { data: fam } = await supabase.from('families').select('head_name').eq('id', beneficiaryId).single();
      beneficiaryName = fam?.head_name || '';
    } else {
      const { data: sng } = await supabase.from('singles').select('full_name').eq('id', beneficiaryId).single();
      beneficiaryName = sng?.full_name || '';
    }

    return NextResponse.json({
      success: true,
      message: 'تم تأكيد التسليم بنجاح',
      data: {
        deliveryId: delivery.id,
        deliveredAt: delivery.delivered_at,
        beneficiaryName,
        sessionProject: session.project_id,
      },
    });
  } catch (err) {
    console.error('Confirm delivery error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
