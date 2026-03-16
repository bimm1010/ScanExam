import { motion } from 'framer-motion';
import { Layers, ChevronRight } from 'lucide-react';

interface SheetSelectionStepProps {
  availableSheets: {id: number, name: string}[];
  fileName: string | null;
  error: string | null;
  onSelectSheet: (id: number, name: string) => void;
  onReset: () => void;
}

const SheetSelectionStep = ({ availableSheets, fileName, error, onSelectSheet, onReset }: SheetSelectionStepProps) => {
  return (
    <motion.div key="select-sheet" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-3 rounded-[40px] text-left" aria-label="Chọn bảng điểm">
      <div className="w-full rounded-[32px] bg-slate-50/30 border border-white/40 min-h-[300px] flex flex-col p-6 md:p-10 relative overflow-hidden">
        <div className="flex items-center space-x-5 mb-8">
          <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 text-rose-500 shrink-0"><Layers className="w-7 h-7" /></div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Chọn Bảng điểm</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base italic">Tìm thấy {availableSheets.length} sheet trong {fileName}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
          {availableSheets.map((sheet) => (
            <button key={sheet.id} onClick={() => onSelectSheet(sheet.id, sheet.name)} className="flex items-center justify-between p-5 bg-white/60 rounded-[20px] shadow-sm border border-white/80 hover:border-rose-200 hover:bg-rose-50/50 active:scale-[0.98] transition-all group text-left">
              <span className="text-lg font-bold text-slate-700 truncate pr-2 group-hover:text-rose-600 transition-colors">{sheet.name}</span>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-400 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
        {error && <div className="text-rose-600 font-bold bg-rose-50 px-4 py-3 rounded-xl mb-6 border border-rose-200 text-sm text-center">{error}</div>}
        <div className="mt-auto text-center"><button onClick={onReset} className="secondary-btn py-2 text-sm">Quay lại</button></div>
      </div>
    </motion.div>
  );
};

export default SheetSelectionStep;
