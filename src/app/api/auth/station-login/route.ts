import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم وكلمة السر' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { data: admin, error } = await supabase
      .from('station_admins')
      .select(`
        id, username, full_name, phone,
        station_id,
        stations (
          id, name, region_id,
          regions (name)
        )
      `)
      .eq('username', username.trim())
      .eq('password_hash', passwordHash)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة السر غير صحيحة' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        phone: admin.phone,
        stationId: admin.station_id,
        stationName: admin.stations?.name,
        regionId: admin.stations?.region_id,
        regionName: (admin.stations as any)?.regions?.name,
      },
    });
  } catch (err) {
    console.error('Station login error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
