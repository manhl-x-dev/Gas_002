import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// تشفير كلمة السر بـ SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'gas_distribution_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, password, notes } = body;

    // التحقق من الحقول المطلوبة
    if (!fullName?.trim() || !phone?.trim() || !password) {
      return NextResponse.json(
        { error: 'يرجى ملء جميع الحقول المطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من طول كلمة السر
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // التحقق من رقم الهاتف
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم هاتف صحيح' },
        { status: 400 }
      );
    }

    // تشفير كلمة السر
    const passwordHash = await hashPassword(password);

    // إدخال البيانات في جدول طلبات الأفراد
    const { data, error } = await supabase
      .from('single_requests')
      .insert({
        full_name: fullName.trim(),
        phone: cleanPhone,
        password_hash: passwordHash,
        notes: notes?.trim() || null,
        status: 'pending',
      })
      .select('id, full_name, status, created_at')
      .single();

    if (error) {
      // التعامل مع خطأ التكرار
      if (error.code === '23505') {
        if (error.message.includes('phone')) {
          return NextResponse.json(
            { error: 'رقم الهاتف مسجل مسبقاً، لديك طلب قيد المراجعة' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'بيانات مسجلة مسبقاً' },
          { status: 409 }
        );
      }

      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ في قاعدة البيانات' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'تم إرسال طلبك بنجاح وسيتم مراجعته من قبل الإدارة',
        data: {
          id: data.id,
          fullName: data.full_name,
          status: data.status,
          createdAt: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
