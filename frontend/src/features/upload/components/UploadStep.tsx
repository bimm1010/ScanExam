import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface UploadStepProps {
  isProcessing: boolean;
  error: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const UploadStep = ({ isProcessing, error, onUpload, onButtonClick, fileInputRef }: UploadStepProps) => {
  return (
    <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <input id="excel-upload-input" type="file" ref={fileInputRef} onChange={onUpload} accept=".xlsx, .xls" className="hidden" />
      <div className="glass-card p-3 rounded-[40px] group">
        <button 
          onClick={onButtonClick} 
          disabled={isProcessing} 
          aria-label="Tải lên danh sách học sinh"
          className="relative overflow-hidden w-full rounded-[32px] bg-slate-50/50 border-2 border-dashed border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 active:bg-rose-100/30 focus:outline-none transition-all duration-500 min-h-[250px] md:min-h-[300px] flex flex-col items-center justify-center p-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
           <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-[24px] flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:-translate-y-2 transition-transform duration-500">
              {isProcessing ? <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" /> : <Upload className="w-8 h-8 md:w-10 md:h-10 text-rose-500" strokeWidth={2} />}
           </div>
           <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">{isProcessing ? 'Đang đọc file...' : 'Tải lên danh sách'}</h2>
           {error ? (
             <div className="text-rose-600 font-bold bg-rose-50 px-4 py-2 rounded-xl mt-2 border border-rose-200 text-sm">{error}</div>
           ) : (
             <div className="flex items-center space-x-2 text-slate-400 font-semibold bg-white/50 px-4 py-2 rounded-full mt-2 border border-white">
               <FileSpreadsheet className="w-4 h-4" />
               <span className="text-xs md:text-sm uppercase tracking-wider">Hỗ trợ Excel (.xlsx, .xls)</span>
             </div>
           )}
        </button>
      </div>
    </motion.div>
  );
};

export default UploadStep;
