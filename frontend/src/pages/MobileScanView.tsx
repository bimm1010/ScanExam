import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, WifiOff, Wifi } from 'lucide-react';

type WsStatus = 'connecting' | 'connected' | 'error';
type CaptureStatus = 'idle' | 'processing' | 'success' | 'error';

export const MobileScanView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. WebSocket Connection
  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/scan/${sessionId}/`;
    console.log('[Phone WS] Connecting to:', wsUrl);

    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Phone WS] Connected ✅');
        setWsStatus('connected');
        // Notify desktop that phone is ready
        ws.send(JSON.stringify({ type: 'phone_ready', sessionId }));
      };
      ws.onerror = (e) => console.error('[Phone WS] Error:', e);
      ws.onclose = (e) => {
        console.warn('[Phone WS] Closed, code:', e.code, '— retry in 3s');
        setWsStatus('error');
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [sessionId]);

  // 2. Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
          console.log('[Phone Camera] Ready ✅');
        }
      } catch (err) {
        console.error('[Phone Camera] Error:', err);
      }
    };

    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  // 3. Capture → base64 → WS send
  const captureAndSend = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (captureStatus === 'processing') return;

    setCaptureStatus('processing');

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Scale down to max 1280px wide to keep blob size reasonable
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) { setCaptureStatus('idle'); return; }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // toDataURL strips the "data:image/jpeg;base64," prefix ourselves
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const imageBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'scan_result', imageBase64 }));
      console.log('[Phone] Sent image, base64 length:', imageBase64.length);
      setCaptureStatus('success');
    } else {
      console.warn('[Phone] WS not open, status:', ws?.readyState);
      setCaptureStatus('error');
    }

    setTimeout(() => setCaptureStatus('idle'), 2500);
  }, [captureStatus]);

  if (!sessionId) {
    return (
      <div className="p-10 text-center font-bold text-slate-800">
        Không tìm thấy mã kết nối (Session ID)
      </div>
    );
  }

  const wsIcon = wsStatus === 'connected'
    ? <Wifi className="w-4 h-4 text-emerald-400" />
    : <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />;

  const wsLabel = {
    connected: 'Đã kết nối',
    connecting: 'Đang kết nối...',
    error: 'Mất kết nối (thử lại...)',
  }[wsStatus];

  const captureDisabled = !cameraReady || captureStatus === 'processing';

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-[9999]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10">
        <h1 className="text-white font-bold text-base drop-shadow-md">SCANEXERCISE Mobile</h1>
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
          {wsIcon}
          <span className="text-white text-xs font-medium">{wsLabel}</span>
        </div>
      </div>

      {/* Camera */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline muted autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-[15%] border-2 border-dashed border-white/30 rounded-2xl">
            {(['tl','tr','bl','br'] as const).map(corner => (
              <div key={corner} className={`absolute w-8 h-8 border-emerald-400
                ${corner === 'tl' ? 'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl -translate-x-0.5 -translate-y-0.5' : ''}
                ${corner === 'tr' ? 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl translate-x-0.5 -translate-y-0.5' : ''}
                ${corner === 'bl' ? 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl -translate-x-0.5 translate-y-0.5' : ''}
                ${corner === 'br' ? 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl translate-x-0.5 translate-y-0.5' : ''}
              `} />
            ))}
          </div>
        </div>

        {/* Status Overlay */}
        {captureStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/30"
          >
            <div className="bg-slate-900/90 backdrop-blur-md px-8 py-5 rounded-3xl flex items-center gap-4 border border-slate-700/50">
              {captureStatus === 'processing' && (
                <>
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white font-bold text-lg">Đang gửi ảnh...</span>
                </>
              )}
              {captureStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <span className="text-white font-bold text-lg">Đã gửi lên máy tính!</span>
                </>
              )}
              {captureStatus === 'error' && (
                <>
                  <WifiOff className="w-7 h-7 text-rose-400" />
                  <span className="text-white font-bold text-lg">Chưa kết nối — thử lại!</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Shutter Button */}
      <div className="h-36 bg-black flex flex-col items-center justify-center gap-2 border-t border-slate-800">
        <button
          onClick={captureAndSend}
          disabled={captureDisabled}
          className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 disabled:opacity-40 flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_24px_rgba(255,255,255,0.25)]"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <Camera className="w-8 h-8 text-slate-800" />
          </div>
        </button>
        {!cameraReady && (
          <p className="text-slate-600 text-xs animate-pulse">Đang khởi động camera...</p>
        )}
      </div>
    </div>
  );
};
