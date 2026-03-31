import { useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';

type SendStatus = 'idle' | 'processing' | 'success' | 'error';

export const MobileScanView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sentCount, setSentCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compress image via Canvas then POST to server
  const uploadImage = useCallback(async (file: File) => {
    if (!sessionId) return;
    setSendStatus('processing');
    setErrorMsg('');

    try {
      // 1. Read file into Image
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      // 2. Resize via Canvas (max 1280px width)
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not found');
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 3. Convert to Blob (JPEG 75%)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          0.75
        );
      });

      // 4. POST to server via FormData (works on all browsers, all protocols)
      const formData = new FormData();
      formData.append('image', blob, `scan_${Date.now()}.jpg`);

      const resp = await fetch(`/api/scan-upload/${sessionId}/`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const result = await resp.json();
      console.log('[Phone] Upload OK:', result);
      setSendStatus('success');
      setSentCount(prev => prev + 1);
    } catch (err: any) {
      console.error('[Phone] Upload failed:', err);
      setErrorMsg(err.message || 'Lỗi gửi ảnh');
      setSendStatus('error');
    }

    setTimeout(() => setSendStatus('idle'), 2500);
  }, [sessionId]);

  const openCamera = () => inputRef.current?.click();

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="font-bold text-slate-800">Không tìm thấy mã kết nối (Session ID)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input — triggers native camera */}
      <input 
        ref={inputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          // Reset so same file can be selected again
          e.target.value = '';
        }}
      />

      {/* Main Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-white font-black text-2xl tracking-tight">SCANEXERCISE</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Quét bài thần tốc 📱</p>
        </div>

        {/* Camera Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openCamera}
          disabled={sendStatus === 'processing'}
          className="w-full bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 
                     disabled:opacity-50 text-white rounded-[28px] p-8 shadow-2xl shadow-rose-500/30
                     flex flex-col items-center gap-4 transition-all active:shadow-lg"
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Camera className="w-10 h-10" />
          </div>
          <div>
            <p className="font-black text-xl">CHỤP & GỬI</p>
            <p className="text-rose-100 text-sm font-medium mt-1">
              Nhấn để mở camera → Chụp → Gửi tự động
            </p>
          </div>
        </motion.button>

        {/* Status Messages */}
        <div className="mt-6 min-h-[80px]">
          {sendStatus === 'processing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-700/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-white font-bold">Đang nén & gửi ảnh...</span>
            </motion.div>
          )}

          {sendStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-emerald-500/30"
            >
              <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-100 font-bold">Đã gửi lên máy tính!</span>
            </motion.div>
          )}

          {sendStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-rose-500/30"
            >
              <AlertTriangle className="w-7 h-7 text-rose-400 flex-shrink-0" />
              <span className="text-rose-100 font-bold text-sm">{errorMsg || 'Lỗi — thử lại!'}</span>
            </motion.div>
          )}
        </div>

        {/* Sent count */}
        {sentCount > 0 && (
          <div className="text-center mt-4">
            <span className="bg-white/10 text-white/80 px-4 py-2 rounded-full text-sm font-bold">
              Đã gửi {sentCount} ảnh ✅
            </span>
          </div>
        )}

        {/* Gallery fallback */}
        <div className="mt-8 text-center">
          <label className="text-slate-500 text-xs font-medium cursor-pointer hover:text-slate-300 transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Hoặc chọn ảnh từ thư viện</span>
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
