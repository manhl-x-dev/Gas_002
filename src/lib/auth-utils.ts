// تشفير كلمة السر بـ SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'gas_distribution_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// تنظيف رقم الهاتف
export function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
