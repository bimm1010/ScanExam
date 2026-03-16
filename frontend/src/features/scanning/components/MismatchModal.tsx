import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import type { MismatchData } from '../../../types';

interface MismatchModalProps {
  data: MismatchData;
  onClose: () => void;
}

const MismatchModal = ({ data, onClose }: MismatchModalProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 10 }} 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-sm bg-white rounded-[48px] shadow-2xl p-10 text-center border border-white/80 relative overflow-hidden"
      >
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-sm border border-rose-100">
          <X className="w-10 h-10" />
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4 px-2 leading-tight">
          Phát hiện sai sót <br/><span className="text-rose-600">Môn học</span>
        </h3>
        
        <div className="bg-slate-50/50 rounded-[24px] p-5 mb-10 border border-slate-100 text-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Đang chọn</span>
            <span className="font-bold text-slate-800">{data.expectedSubject}</span>
          </div>
          <div className="h-px bg-slate-100 w-full mb-3" />
          <div className="flex justify-between items-center">
            <span className="text-rose-400 font-black uppercase text-[9px] tracking-widest">AI đọc thấy</span>
            <span className="font-bold text-rose-600">{data.detectedSubject}</span>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onClose} 
            className="squircle-btn w-full py-4 text-white flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> THỬ LẠI NGAY
          </button>
          <button 
            onClick={onClose} 
            className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest transition-colors"
          >
            Bỏ qua ảnh này
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MismatchModal;
