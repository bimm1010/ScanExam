import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import type { ScanResult } from '../../../types';

interface ScanResultModalProps {
  result: ScanResult;
  onClose: () => void;
  onConfirm: () => void;
}

const ScanResultModal = ({ result, onClose, onConfirm }: ScanResultModalProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 40 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-md bg-white rounded-[48px] shadow-2xl p-10 relative overflow-hidden border border-white/80"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center shadow-sm border border-rose-100 mb-8">
            <ScanLine className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Kết quả phân tích</h3>
          <p className="text-slate-400 font-medium text-sm mb-10 italic">Thông tin AI đã trích xuất được:</p>
          
          <div className="w-full space-y-4 mb-10">
            <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-[24px] border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số thứ tự/SBD</span>
              <span className="text-xl font-black text-slate-900">{result.studentId || "???"}</span>
            </div>
            
            <div className="flex items-center justify-between p-5 bg-rose-50/30 rounded-[24px] border border-rose-100/50">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Họ và Tên</span>
              <span className="text-xl font-black text-slate-900 truncate max-w-[180px]">{result.studentName || "Không xác định"}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex flex-col items-center p-6 bg-slate-900 rounded-[28px] shadow-lg">
                <span className="text-[10px] font-black text-rose-400/80 uppercase tracking-widest mb-1">Điểm</span>
                <span className="text-3xl font-black text-white">{result.score !== null ? result.score : "???"}</span>
              </div>
              <div className="flex flex-col items-center p-6 bg-white rounded-[28px] border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loại</span>
                <span className="text-3xl font-black text-slate-900">{result.level || "H"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 px-6">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</span>
               <span className="text-sm font-bold text-slate-600">{result.subject || "..."}</span>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button onClick={onClose} className="secondary-btn flex-1 py-4 text-xs font-black uppercase tracking-widest">Hủy</button>
            <button 
              onClick={onConfirm} 
              disabled={!result.studentId} 
              className="squircle-btn flex-[2] py-4 text-white text-sm font-black uppercase tracking-widest disabled:opacity-30"
            >
              Lưu điểm
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScanResultModal;
