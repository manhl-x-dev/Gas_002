import * as Crypto from 'expo-crypto';

export async function hashPassword(password: string): Promise<string> {
  const data = password + 'gas_distribution_salt_2024';
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
