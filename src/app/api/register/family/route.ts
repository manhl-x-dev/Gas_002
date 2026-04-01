import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// توليد بصمة فريدة: FAM-XXXXXXXXXXXX
function generateFingerprint(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'FAM-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
    const { headName, bookNumber, phone, password } = body;

    // التحقق من الحقول المطلوبة
    if (!headName?.trim() || !bookNumber?.trim() || !phone?.trim() || !password) {
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

    // توليد البصمة
    const fingerprint = generateFingerprint();

    // إدخال البيانات في جدول العائلات
    const { data, error } = await supabase
      .from('families')
      .insert({
        book_number: bookNumber.trim(),
        head_name: headName.trim(),
        phone: cleanPhone,
        password_hash: passwordHash,
        fingerprint,
      })
      .select('id, fingerprint, head_name, created_at')
      .single();

    if (error) {
      // التعامل مع خطأ التكرار
      if (error.code === '23505') {
        if (error.message.includes('phone')) {
          return NextResponse.json(
            { error: 'رقم الهاتف مسجل مسبقاً' },
            { status: 409 }
          );
        }
        if (error.message.includes('book_number')) {
          return NextResponse.json(
            { error: 'رقم دفتر العائلة مسجل مسبقاً' },
            { status: 409 }
          );
        }
        if (error.message.includes('fingerprint')) {
          // في حال نادرة تكررت البصمة، نعيد المحاولة
          return NextResponse.json(
            { error: 'حدث خطأ غير متوقع، حاول مجدداً' },
            { status: 500 }
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
        message: 'تم تسجيل العائلة بنجاح',
        data: {
          id: data.id,
          fingerprint: data.fingerprint,
          headName: data.head_name,
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
