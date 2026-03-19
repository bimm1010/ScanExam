import { motion } from 'framer-motion';
import { ScanLine, ImagePlus, Camera, FileSpreadsheet, Trash2, MessageSquareQuote } from 'lucide-react';

interface ScanningStepProps {
  scannedImagesCount: number;
  studentsWithScoresCount: number;
  isProcessing: boolean;
  batchProgress: { total: number; current: number };
  onCameraClick: () => void;
  onGalleryClick: () => void;
  onShowGallery: () => void;
  onShowRemarkConfig: () => void;
  onClearData: () => void;
  onBack: () => void;
  backendExcelFilename: string | null;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  galleryInputRef: React.RefObject<HTMLInputElement>;
  onImageCapture: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
}

const ScanningStep = ({
  scannedImagesCount,
  studentsWithScoresCount,
  isProcessing,
  batchProgress,
  onCameraClick,
  onGalleryClick,
  onShowGallery,
  onShowRemarkConfig,
  onClearData,
  onBack,
  backendExcelFilename,
  cameraInputRef,
  galleryInputRef,
  onImageCapture,
  onDownload
}: ScanningStepProps) => {
  return (
    <motion.div key="scan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-3 rounded-[40px] text-left max-w-4xl">
      <div className="w-full rounded-[32px] bg-slate-50/30 border border-white/40 min-h-[300px] flex flex-col p-6 md:p-10 relative overflow-hidden">
        <div className="flex items-center space-x-5 mb-10">
          <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 text-rose-500 shrink-0"><ScanLine className="w-7 h-7" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Thu thập Bài Thi</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base italic">Vui lòng cung cấp hình ảnh bài kiểm tra:</p>
          </div>
          <button 
            onClick={onShowRemarkConfig}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all group shrink-0"
            title="Cấu hình lời phê"
          >
            <MessageSquareQuote className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <input id="camera-capture-input" type="file" ref={cameraInputRef} onChange={onImageCapture} accept="image/*" capture="environment" multiple className="hidden" />
        <input id="gallery-pick-input" type="file" ref={galleryInputRef} onChange={onImageCapture} accept="image/*" multiple className="hidden" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative">
           <button onClick={onCameraClick} aria-label="Mở camera chụp ảnh" className="flex flex-col items-center justify-center p-10 bg-white/60 rounded-[32px] border border-white/80 hover:border-rose-200 hover:bg-rose-50/50 active:scale-[0.98] transition-all group">
             <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 mb-6 group-hover:-translate-y-2 transition-transform duration-500">
               {isProcessing ? <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" /> : <Camera className="w-10 h-10" />}
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Chụp ảnh mới</h3>
             <p className="text-slate-500 text-xs text-center font-medium opacity-70">Sử dụng camera trực tiếp</p>
           </button>
           
           <button onClick={onGalleryClick} aria-label="Chọn ảnh từ thư viện" className="flex flex-col items-center justify-center p-10 bg-white/60 rounded-[32px] border border-white/80 hover:border-slate-300 hover:bg-slate-100/50 active:scale-[0.98] transition-all group">

             <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 mb-6 group-hover:-translate-y-2 transition-transform duration-500">
               {isProcessing ? <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> : <ImagePlus className="w-10 h-10" />}
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Thư viện ảnh</h3>
             <p className="text-slate-500 text-xs text-center font-medium opacity-70">Chọn từ bộ nhớ máy</p>
           </button>
        </div>

        {isProcessing && batchProgress.total > 0 && (
          <div className="mb-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Đang xử lý trong nền...</span>
                <span className="text-[10px] font-black text-slate-400">{batchProgress.current} / {batchProgress.total}</span>
             </div>
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <motion.div 
                   className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 absolute left-0 top-0" 
                   initial={{ width: 0 }}
                   animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                   transition={{ duration: 0.3 }}
                />
                <motion.div 
                   className="h-full bg-white/30 absolute inset-0 w-[200%]" 
                   animate={{ x: ["-50%", "0%"] }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
             </div>
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
    </motion.div>
  );
};


export default ScanningStep;
