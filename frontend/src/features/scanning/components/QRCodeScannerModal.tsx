import { forwardRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (text: string) => void;
}

export const QRCodeScannerModal = forwardRef<HTMLDivElement, QRCodeScannerModalProps>(
  ({ isOpen, onClose, onScanResult }, ref) => {
    const [sessionId, setSessionId] = useState<string>('');
    const [status, setStatus] = useState<'waiting' | 'connected'>('waiting');
    const [scanCount, setScanCount] = useState(0);
    const [serverIp, setServerIp] = useState<string>('');

    // Fetch real LAN IP — only needed for generating the QR code URL for the phone
    useEffect(() => {
      if (!isOpen) return;
      fetch(`/api/server-info/`)
        .then(r => r.json())
        .then(data => {
          if (data.local_ip) setServerIp(data.local_ip);
        })
        .catch(() => setServerIp(window.location.hostname));
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && !sessionId) {
        setSessionId(uuidv4().replace(/-/g, '').substring(0, 16));
        setScanCount(0);
        setStatus('waiting');
      }
    }, [isOpen, sessionId]);

    useEffect(() => {
      if (!sessionId || !isOpen) return;

      // Desktop WS: use same-origin (window.location.host = localhost:5173)
      // so the self-signed cert is valid. Only the QR URL uses LAN IP.
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/scan/${sessionId}/`;
      console.log('[Desktop WS] Connecting to:', wsUrl);

      let ws: WebSocket | null = null;

      const connect = () => {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Desktop WS] Connected ✅');
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Desktop WS] Received:', data.type);

            // Phone notifies it's ready → update status badge
            if (data.type === 'phone_ready') {
              setStatus('connected');
            }

            if (data.type === 'scan_result' && data.imageBase64) {
              // Phone sent a real image → convert base64 → File → dispatch
              const byteString = atob(data.imageBase64);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
              const blob = new Blob([ab], { type: 'image/jpeg' });
              const file = new File([blob], `mobile_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

              setScanCount(prev => prev + 1);
              // Dispatch custom event with the actual File for App.tsx to process
              window.dispatchEvent(new CustomEvent('mobileScanFile', { detail: { file } }));
              onScanResult('mobile');
            }
          } catch (e) {
            console.error('[Desktop WS] Parse error:', e);
          }
        };

        ws.onclose = (e) => {
          console.warn('[Desktop WS] Closed, code:', e.code, '— retrying in 3s');
          setStatus('waiting');
          setTimeout(connect, 3000);
        };

        ws.onerror = (e) => {
          console.error('[Desktop WS] Error:', e);
        };
      };

      connect();

      return () => {
        ws?.close();
      };
    }, [sessionId, isOpen, onScanResult]);

    if (!isOpen) return null;

    // QR URL uses LAN IP so phone can reach it; desktop WS uses localhost
    const phoneUrl = serverIp
      ? `https://${serverIp}:5173/scan/${sessionId}`
      : '';

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center pt-safe-top pb-safe-bottom" ref={ref}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm mx-4 bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden border border-white"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-[24px] flex items-center justify-center text-rose-500 mb-6">
                <Smartphone className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 mb-2">Quét Bài Bằng Điện Thoại</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Dùng camera điện thoại quét mã QR bên dưới.
              </p>

              <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 mb-6 relative group">
                {phoneUrl ? (
                  <>
                    <QRCodeSVG
                      value={phoneUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="Q"
                    />
                    <p className="mt-2 text-[10px] font-mono text-slate-400 break-all">{serverIp}:5173</p>
                  </>
                ) : (
                  <div className="w-[200px] h-[200px] bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">Đang lấy IP...</div>
                )}

                <div className="absolute inset-x-0 -bottom-4 flex justify-center">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border
                    ${status === 'connected'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                    }`}
                  >
                    {status === 'connected' ? 'Đã kết nối' : 'Đang chờ điện thoại...'}
                  </span>
                </div>
              </div>

              {scanCount > 0 && (
                <div className="mb-4 text-sm font-bold text-rose-500">
                  Đã nhận {scanCount} bài quét
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm uppercase px-6 py-4 rounded-[20px] transition-colors"
              >
                Đóng
              </button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/50 hover:bg-white rounded-full text-slate-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }
);

QRCodeScannerModal.displayName = 'QRCodeScannerModal';
