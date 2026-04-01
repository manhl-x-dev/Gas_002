import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId } = body;

    if (!stationId) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // عدد تسليمات اليوم لهذه المحطة
    const { count: todayDeliveries, error: delErr } = await supabase
      .from('delivery_logs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', '00000000-0000-0000-0000-000000000000') // placeholder
      .gte('delivered_at', `${today}T00:00:00`)
      .lt('delivered_at', `${today}T23:59:59`);

    // تسليمات اليوم عبر الجلسات
    const { data: sessions } = await supabase
      .from('distribution_sessions')
      .select('id, quantity')
      .eq('station_id', stationId)
      .eq('session_date', today);

    const sessionIds = (sessions || []).map((s) => s.id);

    let todayCount = 0;
    let totalQuota = 0;

    if (sessionIds.length > 0) {
      const { count } = await supabase
        .from('delivery_logs')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);

      todayCount = count || 0;
      totalQuota = (sessions || []).reduce((sum, s) => sum + Number(s.quantity), 0);
    }

    // آخر 5 تسليمات
    const { data: recentDeliveries } = await supabase
      .from('delivery_logs')
      .select(`
        id,
        delivered_at,
        beneficiary_type,
        delivery_logs_beneficiary_family:families!delivery_logs_beneficiary_id_fkey(head_name),
        delivery_logs_beneficiary_single:singles!delivery_logs_beneficiary_id_fkey(full_name)
      `)
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000'])
      .order('delivered_at', { ascending: false })
      .limit(5);

    // عدد جلسات التوزيع النشطة اليوم
    const activeSessions = (sessions || []).filter((s) => s.is_active !== false).length;

    return NextResponse.json({
      success: true,
      stats: {
        todayDeliveries: todayCount,
        totalQuota,
        remainingQuota: Math.max(0, totalQuota - todayCount),
        activeSessions,
        recentDeliveries: (recentDeliveries || []).map((d: any) => ({
          id: d.id,
          deliveredAt: d.delivered_at,
          beneficiaryType: d.beneficiary_type,
          beneficiaryName: d.beneficiary_type === 'family'
            ? d.delivery_logs_beneficiary_family?.head_name
            : d.delivery_logs_beneficiary_single?.full_name,
        })),
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
