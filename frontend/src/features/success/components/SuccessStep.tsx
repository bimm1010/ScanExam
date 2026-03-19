import { motion } from 'framer-motion';
import { CheckCircle2, Users, FileSpreadsheet, ChevronRight } from 'lucide-react';
import type { StudentData } from '../../../types';

interface SuccessStepProps {
  fileName: string | null;
  selectedSheetName: string | null;
  students: StudentData[];
  backendExcelFilename: string | null;
  onShowRoster: () => void;
  onStartScanning: () => void;
  onExportJson: () => void;
  onBackToMap: () => void;
  onBackToSelectSheet: () => void;
  onReset: () => void;
  onDownload: () => void;
  hasSheets: boolean;
  hasScores: boolean;
  isProcessing?: boolean;
}

const SuccessStep = ({
  fileName,
  selectedSheetName,
  students,
  backendExcelFilename,
  onShowRoster,
  onStartScanning,
  onExportJson,
  onBackToMap,
  onBackToSelectSheet,
  onReset,
  onDownload,
  hasSheets,
  hasScores,
  isProcessing
}: SuccessStepProps) => {
  return (
    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-3 rounded-[40px] text-left" aria-label="Thông báo thành công">
      <div className="w-full rounded-[32px] bg-slate-50/30 border border-white/40 min-h-[300px] flex flex-col items-center justify-center p-10 relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", damping: 12 }} 
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200 border border-rose-100 mb-8 text-rose-500"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 text-center">Nạp Danh Sách Thành Công</h2>
        <p className="text-slate-500 font-medium mb-8 text-center italic">File: {fileName} ({selectedSheetName})</p>
        
        <div className="w-full max-w-sm space-y-4 mb-8">
          <button onClick={onShowRoster} className="flex items-center justify-between w-full p-6 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center space-x-4">
              <div className="bg-rose-50 text-rose-500 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors"><Users className="w-6 h-6" /></div>
              <div className="flex flex-col items-start pr-2">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng cộng</span>
                <span className="text-2xl font-black text-slate-900">{students.length} Học sinh</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-rose-400 transition-all" />
          </button>
        </div>

        <button onClick={onStartScanning} className="squircle-btn px-12 py-5 text-white font-black text-xl shadow-2xl shadow-rose-500/40 transform hover:scale-105 transition-all">Bắt đầu Quét Ảnh 🚀</button>
        
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
          {backendExcelFilename && (
            <button
              onClick={onDownload}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[20px] font-black text-sm shadow-xl hover:bg-slate-800 transition-all disabled:opacity-70"
            >
              <FileSpreadsheet className="w-5 h-5 text-rose-400" /> {isProcessing ? 'Đang chuẩn bị...' : 'TẢI FILE EXCEL ĐÃ CẬP NHẬT'}
            </button>
          )}
          
          <div className="flex flex-col items-center gap-4">
            <button onClick={onExportJson} disabled={!hasScores} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors disabled:opacity-30">
              Xuất JSON Dự phòng
            </button>
            <div className="flex items-center gap-4">
              <button onClick={onBackToMap} className="px-6 py-3 text-xs font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors bg-indigo-50 rounded-2xl active:scale-95">
                Cấu hình Cột
              </button>
              {hasSheets && (
                <button onClick={onBackToSelectSheet} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors bg-slate-50 rounded-2xl">
                  Đổi môn học
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={onReset} className="mt-10 px-6 py-4 text-[10px] font-black text-slate-300 hover:text-rose-400 uppercase tracking-[0.2em] transition-colors">Chọn file Excel khác</button>
      </div>
    </motion.div>
  );
};

export default SuccessStep;
