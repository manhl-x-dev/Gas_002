'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const scannerId = 'qr-reader';
    let cancelled = false;

    async function startScanner() {
      try {
        if (isScanningRef.current) return;

        scannerRef.current = new Html5Qrcode(scannerId);

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!cancelled) {
              onScan(decodedText);
              // نوقف المسح بعد قراءة ناجحة
              stopScanner();
            }
          },
          () => {
            // تجاهل أخطاء عدم العثور على QR
          }
        );
        isScanningRef.current = true;
      } catch (err) {
        console.error('Scanner start error:', err);
        if (!cancelled && onError) {
          onError('لم يتم الوصول إلى الكاميرا. تأكد من السماح بالوصول.');
        }
      }
    }

    async function stopScanner() {
      if (scannerRef.current && isScanningRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        isScanningRef.current = false;
      }
    }

    // تأخير قصير لضمان وجود العنصر في DOM
    const timer = setTimeout(() => {
      if (!cancelled) startScanner();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isActive, onScan, onError]);

  return (
    <div className="relative">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ minHeight: 300 }}
      />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-56 h-56 border-4 border-white/60 rounded-3xl" />
      </div>
    </div>
  );
}
