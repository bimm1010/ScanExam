import { motion } from 'framer-motion';
import { ScanLine, ImagePlus, Camera, FileSpreadsheet, Trash2, MessageSquareQuote, Smartphone } from 'lucide-react';

interface ScanningStepProps {
  scannedImagesCount: number;
  studentsWithScoresCount: number;
  isProcessing: boolean;
  batchProgress: { total: number; current: number };
  aiStatusMsg?: string | null;
  onCameraClick: () => void;
  onGalleryClick: () => void;
  onShowGallery: () => void;
  onShowRemarkConfig: () => void;
  onClearData: () => void;
  onBack: () => void;
  backendExcelFilename: string | null;
  expectedSubject: string | null;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  galleryInputRef: React.RefObject<HTMLInputElement>;
  onImageCapture: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onMobileScanResult: (text: string) => void;
}

import { useState } from 'react';
import { QRCodeScannerModal } from './QRCodeScannerModal';
import { ExcelPreviewModal } from './ExcelPreviewModal';

const ScanningStep = ({
  scannedImagesCount,
  studentsWithScoresCount,
  isProcessing,
  batchProgress,
  aiStatusMsg,
  onCameraClick,
  onGalleryClick,
  onShowGallery,
  onShowRemarkConfig,
  onClearData,
  onBack,
  backendExcelFilename,
  expectedSubject,
  cameraInputRef,
  galleryInputRef,
  onImageCapture,
  onDownload,
  onMobileScanResult
}: ScanningStepProps) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleScanResult = (text: string) => {
    onMobileScanResult(text);
  };

  return (
    <motion.div key="scan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-3 rounded-[40px] text-left max-w-4xl">
      <div className="w-full rounded-[32px] bg-slate-50/30 border border-white/40 min-h-[300px] flex flex-col p-6 md:p-10 relative overflow-hidden">
        <div className="flex items-center space-x-5 mb-10">
          <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 text-rose-500 shrink-0"><ScanLine className="w-7 h-7" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Thu thập Bài Thi</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base italic">Vui lòng cung cấp hình ảnh bài kiểm tra:</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => setShowPreviewModal(true)}
              disabled={!backendExcelFilename}
              className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 transition-all group ${!backendExcelFilename ? 'opacity-50 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-emerald-500 hover:border-emerald-200'}`}
              title="Xem trước dữ liệu Excel"
            >
              <FileSpreadsheet className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={onShowRemarkConfig}
              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all group"
              title="Cấu hình lời phê"
            >
              <MessageSquareQuote className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
        
        <input id="camera-capture-input" type="file" ref={cameraInputRef} onChange={onImageCapture} accept="image/*" capture="environment" multiple className="hidden" />
        <input id="gallery-pick-input" type="file" ref={galleryInputRef} onChange={onImageCapture} accept="image/*" multiple className="hidden" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative">
           <button onClick={() => setShowQRModal(true)} aria-label="Quét điện thoại" className="flex flex-col items-center justify-center p-8 bg-white/60 rounded-[32px] border border-white/80 hover:border-emerald-200 hover:bg-emerald-50/50 active:scale-[0.98] transition-all group">
             <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-center text-emerald-500 mb-4 group-hover:-translate-y-2 transition-transform duration-500">
               <Smartphone className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-1">Dùng Điện Thoại</h3>
             <p className="text-slate-500 text-xs text-center font-medium opacity-70">Camera từ xa cực nhanh</p>
           </button>
           
           <button onClick={onCameraClick} aria-label="Mở camera chụp ảnh" className="flex flex-col items-center justify-center p-8 bg-white/60 rounded-[32px] border border-white/80 hover:border-rose-200 hover:bg-rose-50/50 active:scale-[0.98] transition-all group">
             <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 mb-4 group-hover:-translate-y-2 transition-transform duration-500">
               <Camera className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-1">Chụp Máy Tính</h3>
             <p className="text-slate-500 text-xs text-center font-medium opacity-70">Sử dụng webcam</p>
           </button>
           
           <button onClick={onGalleryClick} aria-label="Chọn ảnh từ thư viện" className="flex flex-col items-center justify-center p-8 bg-white/60 rounded-[32px] border border-white/80 hover:border-slate-300 hover:bg-slate-100/50 active:scale-[0.98] transition-all group">
             <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 mb-4 group-hover:-translate-y-2 transition-transform duration-500">
               <ImagePlus className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-1">Thư viện ảnh</h3>
             <p className="text-slate-500 text-xs text-center font-medium opacity-70">Chọn từ bộ nhớ máy</p>
           </button>
        </div>

        {isProcessing && (
          <div className="mb-8 bg-white/80 backdrop-blur-md p-5 rounded-[28px] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">
                  {aiStatusMsg || "Trí tuệ nhân tạo đang phân tích..."}
                </span>
             </div>
             
             {batchProgress.total > 0 && (
               <div className="w-full h-10 bg-slate-100 rounded-2xl overflow-hidden relative shadow-inner border border-slate-200/60">
                  <motion.div 
                     className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 absolute left-0 top-0 rounded-r-2xl" 
                     initial={{ width: 0 }}
                     animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                     transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  <motion.div 
                     className="h-full bg-white/20 absolute inset-0 w-[200%] mix-blend-overlay" 
                     animate={{ x: ["-50%", "0%"] }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                     <div className="w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12" />
                  </motion.div>
                  
                  <div className="absolute inset-0 flex items-center justify-center z-10 w-full h-full">
                    <span className="text-[13px] font-black tracking-widest text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                       ĐÃ XỬ LÝ {batchProgress.current}/{batchProgress.total} ẢNH ({Math.round((batchProgress.current / batchProgress.total) * 100)}%)
                    </span>
                  </div>
               </div>
             )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 py-6 bg-white/40 rounded-[24px] border border-white/60 mb-10">
          <div className="text-center px-8 border-r border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đã nạp</p>
            <p className="text-2xl font-black text-slate-900">{scannedImagesCount} <span className="text-xs text-slate-400">Ảnh</span></p>
          </div>
          <div className="text-center px-8">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Đã chấm</p>
            <p className="text-2xl font-black text-rose-600">{studentsWithScoresCount} <span className="text-xs text-rose-300">Điểm</span></p>
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-6">
            {scannedImagesCount > 0 && (
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {backendExcelFilename && (
                  <button
                    onClick={onDownload}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-3 text-white font-black text-sm uppercase py-4 px-8 bg-slate-900 rounded-[20px] shadow-xl hover:bg-slate-800 transition-all disabled:opacity-70 disabled:grayscale"
                  >
                    <FileSpreadsheet className={`w-5 h-5 ${isProcessing ? 'animate-bounce' : 'text-rose-400'}`} /> 
                    {isProcessing ? 'Đang cập nhật dữ liệu...' : 'TẢI FILE EXCEL'}
                  </button>
                )}
                <button onClick={onShowGallery} className="flex-1 secondary-btn py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 min-w-[160px]">
                  <Trash2 className="w-4 h-4" /> Chi tiết ảnh
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-8">
              <button aria-label="Quay lại bước trước" onClick={onBack} className="p-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Quay lại</button>
              <button aria-label="Xóa và làm mới toàn bộ dữ liệu" onClick={onClearData} className="p-4 text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest transition-colors">Làm mới dữ liệu</button>
            </div>
        </div>
      </div>
      <QRCodeScannerModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)}
        onScanResult={handleScanResult} 
      />
      <ExcelPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        filename={backendExcelFilename || ''}
        subject={expectedSubject || undefined}
      />
    </motion.div>
  );
};


export default ScanningStep;
