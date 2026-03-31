import { motion } from 'framer-motion';
import { Columns } from 'lucide-react';
import type { RowSample } from '../../../types';

interface ColumnMappingStepProps {
  selectedSheetName: string | null;
  totalColumns: number;
  selectedIdCol: number;
  setSelectedIdCol: (col: number) => void;
  selectedNameCol: number;
  setSelectedNameCol: (col: number) => void;
  selectedScoreCol: number;
  setSelectedScoreCol: (col: number) => void;
  selectedLevelCol: number;
  setSelectedLevelCol: (col: number) => void;
  selectedRemarkCol: number;
  setSelectedRemarkCol: (col: number) => void;
  headerRowIndex: number;
  setHeaderRowIndex: (idx: number) => void;
  dataRowStart: number;
  setDataRowStart: (idx: number) => void;
  sheetSampleData: RowSample[];
  getColumnLetter: (idx: number) => string;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  onShowRemarkConfig: () => void;
  remarkRulesCount: number;
}

const ColumnMappingStep = ({
  selectedSheetName,
  totalColumns,
  selectedIdCol, setSelectedIdCol,
  selectedNameCol, setSelectedNameCol,
  selectedScoreCol, setSelectedScoreCol,
  selectedLevelCol, setSelectedLevelCol,
  selectedRemarkCol, setSelectedRemarkCol,
  headerRowIndex, setHeaderRowIndex,
  dataRowStart, setDataRowStart,
  sheetSampleData,
  getColumnLetter,
  error,
  onBack,
  onConfirm,
  isProcessing,
  onShowRemarkConfig,
  remarkRulesCount
}: ColumnMappingStepProps) => {
  return (
    <motion.div key="map-columns" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-3 rounded-[40px] text-left max-w-5xl">
      <div className="w-full rounded-[32px] bg-slate-50/30 border border-white/40 min-h-[300px] flex flex-col p-6 md:p-10 relative overflow-hidden">
        <div className="flex items-center space-x-5 mb-8">
          <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 text-rose-500 shrink-0"><Columns className="w-7 h-7" /></div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Cấu hình Cột</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base italic">Lớp {selectedSheetName}. Vui lòng kiểm tra các cột dữ liệu:</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-[24px] p-6 shadow-sm border border-white/80 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
          <div className="w-full">
            <label htmlFor="id-col-select" className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest pl-1">Mã HS / SBD</label>
            <select id="id-col-select" value={selectedIdCol} onChange={(e) => setSelectedIdCol(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 block p-3 font-bold transition-all appearance-none cursor-pointer">
              <option value={0}>-- Chọn cột --</option>
              {Array.from({ length: totalColumns }).map((_, i) => <option key={`id-${i + 1}`} value={i + 1}>Cột {getColumnLetter(i + 1)}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-2 px-1 font-medium">Cột chứa STT hoặc mã định danh của học sinh.</p>
          </div>
          <div className="w-full">
            <label htmlFor="name-col-select" className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest pl-1">Họ và Tên</label>
            <select id="name-col-select" value={selectedNameCol} onChange={(e) => setSelectedNameCol(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 block p-3 font-bold transition-all appearance-none cursor-pointer">
              <option value={0}>-- Chọn cột --</option>
              {Array.from({ length: totalColumns }).map((_, i) => <option key={`name-${i + 1}`} value={i + 1}>Cột {getColumnLetter(i + 1)}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-2 px-1 font-medium">Đối chiếu nếu hệ thống không tự động đọc được dữ liệu.</p>
          </div>
          <div className="w-full">
            <label htmlFor="score-col-select" className="block text-xs font-black text-rose-600/60 mb-2 uppercase tracking-widest pl-1">Điểm số</label>
            <select id="score-col-select" value={selectedScoreCol} onChange={(e) => setSelectedScoreCol(Number(e.target.value))} className="w-full bg-rose-50/50 border border-rose-200 text-rose-900 text-sm rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 block p-3 font-bold transition-all appearance-none cursor-pointer">
              <option value={0}>-- Chọn cột --</option>
              {Array.from({ length: totalColumns }).map((_, i) => <option key={`score-${i + 1}`} value={i + 1}>Cột {getColumnLetter(i + 1)}</option>)}
            </select>
            <p className="text-[10px] text-rose-400/80 mt-2 px-1 font-medium italic">Dòng điểm sau khi chấm bài sẽ được ghi vào cột này.</p>
          </div>
          <div className="w-full">
            <label htmlFor="level-col-select" className="block text-xs font-black text-rose-600/60 mb-2 uppercase tracking-widest pl-1">Mức đạt</label>
            <select id="level-col-select" value={selectedLevelCol} onChange={(e) => setSelectedLevelCol(Number(e.target.value))} className="w-full bg-rose-50/50 border border-rose-200 text-rose-900 text-sm rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 block p-3 font-bold transition-all appearance-none cursor-pointer">
              <option value={0}>-- Chọn cột --</option>
              {Array.from({ length: totalColumns }).map((_, i) => <option key={`level-${i + 1}`} value={i + 1}>Cột {getColumnLetter(i + 1)}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="remark-col-select" className="block text-xs font-black text-rose-600/60 mb-2 uppercase tracking-widest pl-1">Nhận xét</label>
            <select id="remark-col-select" value={selectedRemarkCol} onChange={(e) => setSelectedRemarkCol(Number(e.target.value))} className="w-full bg-rose-50/50 border border-rose-200 text-rose-900 text-sm rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 block p-3 font-bold transition-all appearance-none cursor-pointer">
              <option value={0}>-- Chọn cột (Nếu có) --</option>
              {Array.from({ length: totalColumns }).map((_, i) => <option key={`remark-${i + 1}`} value={i + 1}>Cột {getColumnLetter(i + 1)}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="header-row-select" className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">Tiêu đề</label>
            <select id="header-row-select" value={headerRowIndex} onChange={(e) => setHeaderRowIndex(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 text-slate-400 text-xs rounded-2xl focus:ring-2 focus:ring-slate-400/10 focus:border-slate-300 block p-3 font-semibold transition-all appearance-none cursor-pointer">
              {sheetSampleData.map((row) => <option key={`hdr-${row.rowNumber}`} value={row.rowNumber}>Dòng {row.rowNumber}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="data-row-select" className="block text-xs font-black text-amber-500 mb-2 uppercase tracking-widest pl-1">Bắt đầu HS</label>
            <select id="data-row-select" value={dataRowStart} onChange={(e) => setDataRowStart(Number(e.target.value))} className="w-full bg-amber-50/50 border border-amber-200 text-amber-900 text-sm rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 block p-3 font-bold transition-all appearance-none cursor-pointer">
              {sheetSampleData.map((row) => <option key={`data-start-${row.rowNumber}`} value={row.rowNumber}>Dòng {row.rowNumber}</option>)}
            </select>
            <p className="text-[10px] text-amber-500/80 mt-2 px-1 font-medium italic">Dòng đầu tiên có tên học sinh.</p>
          </div>
        </div>
        <div className="mb-8 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-7 bg-gradient-to-b from-rose-500 to-amber-400 rounded-full shadow-sm"></div>
            <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Preview đối chiếu dữ liệu(5 HS đầu tiên)</p>
          </div>
          <div className="overflow-x-auto bg-white/40 rounded-[24px] border border-white/80 shadow-sm custom-scrollbar pb-2">
            <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500">
                  <th className="px-5 py-4 border-r border-white/60 font-black tracking-widest uppercase text-[10px] bg-slate-200/30">Dòng</th>
                  {Array.from({ length: totalColumns }).map((_, i) => {
                    const isIdOrName = selectedIdCol === i + 1 || selectedNameCol === i + 1;
                    const isAiWrite = selectedScoreCol === i + 1 || selectedLevelCol === i + 1 || selectedRemarkCol === i + 1;
                    return (<th key={`th-${i}`} className={`px-5 py-4 font-black tracking-widest uppercase text-[10px] border-r border-white/60 ${isIdOrName ? 'bg-rose-50 text-rose-600' : isAiWrite ? 'bg-rose-100 text-rose-700' : ''}`}>Cột {getColumnLetter(i + 1)}</th>)
                  })}
                </tr>
              </thead>
              <tbody>
                {sheetSampleData.filter(row => row.rowNumber < dataRowStart || (row.rowNumber >= dataRowStart && row.rowNumber < dataRowStart + 5)).map((row) => (
                  <tr key={`tr-${row.rowNumber}`} className={`border-b last:border-0 border-white/60 hover:bg-white/40 transition-colors ${row.rowNumber === headerRowIndex ? 'bg-rose-50/20' : row.rowNumber === dataRowStart ? 'bg-amber-50/20' : ''}`}>
                    <td className={`px-5 py-3 font-bold border-r border-white/60 text-slate-400 text-center ${row.rowNumber === headerRowIndex ? 'bg-rose-50/40' : row.rowNumber === dataRowStart ? 'bg-amber-50/30' : 'bg-slate-50/30'}`}>{row.rowNumber}</td>
                    {Array.from({ length: totalColumns }).map((_, i) => {
                      const isIdOrName = selectedIdCol === i + 1 || selectedNameCol === i + 1;
                      const isAiWrite = selectedScoreCol === i + 1 || selectedLevelCol === i + 1 || selectedRemarkCol === i + 1;
                      return (<td key={`td-${row.rowNumber}-${i}`} className={`px-5 py-3 text-slate-600 border-r border-white/60 ${isIdOrName ? 'font-bold text-slate-900 bg-rose-50/20' : isAiWrite ? 'font-bold text-rose-900 bg-rose-100/20' : ''}`}>{row.values[i] || '-'}</td>)
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {error && <div className="text-rose-600 font-bold bg-rose-50 px-4 py-3 rounded-xl mb-6 border border-rose-200 text-sm text-center">{error}</div>}
        <div className="mt-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="secondary-btn w-full md:w-auto">Quay lại</button>
            <button onClick={onShowRemarkConfig} className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/60 border border-indigo-200 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all font-bold text-sm w-full md:w-auto active:scale-95">
              <span className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-black">{remarkRulesCount}</span>
              <span>Tùy chỉnh Lời phê</span>
            </button>
          </div>
          <button onClick={onConfirm} disabled={isProcessing} className="squircle-btn px-10 py-4 text-white font-black text-lg w-full md:w-auto disabled:opacity-50 disabled:scale-100">{isProcessing ? 'Đang nạp...' : 'Xác nhận & Đồng bộ'}</button>
        </div>
      </div>
    </motion.div>
  );
};

export default ColumnMappingStep;
