import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  subject?: string;
}

interface PreviewState {
  columns: string[];
  rows: Record<string, any>[];
  currentSheet: string;
  sheets: string[];
}

export const ExcelPreviewModal = ({ isOpen, onClose, filename, subject }: ExcelPreviewModalProps) => {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !filename) return;
    
    setLoading(true);
    setError(null);
    
    // Construct URL — backend reads 'sheet' query param, not 'subject'
    const url = new URL('/api/preview-excel/', window.location.origin);
    url.searchParams.append('filename', filename);
    if (subject) {
      url.searchParams.append('sheet', subject);
    }
    url.searchParams.append('t', Date.now().toString()); // Prevent browser cache
    
    fetch(url.toString())
      .then(res => res.json())
      .then(resData => {
        if (resData.error) {
          setError(resData.error);
        } else if (resData.previewData && resData.columns) {
          setPreview({
            columns: resData.columns,
            rows: resData.previewData,
            currentSheet: resData.currentSheet || '',
            sheets: resData.sheets || []
          });
        } else {
          setError('Phản hồi từ server không hợp lệ.');
        }
      })
      .catch(err => {
        setError(err.message || 'Lỗi kết nối máy chủ');
      })
      .finally(() => {
        setLoading(false);
      });
      
  }, [isOpen, filename, subject]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-6xl w-full max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col border border-slate-200/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-[32px]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Dữ liệu Excel Hiện tại</h3>
                  <p className="text-sm text-slate-500 font-medium truncate max-w-[300px] md:max-w-md">
                    {filename} {preview?.currentSheet && `— Sheet: ${preview.currentSheet}`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col flex-1 bg-white relative min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 flex-1">
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Đang trích xuất dữ liệu...</p>
                </div>
              ) : error ? (
                <div className="p-10 text-center flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Không thể xem trước</h4>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">{error}</p>
                </div>
              ) : !preview || preview.rows.length === 0 ? (
                <div className="p-10 text-center text-slate-500 flex-1">File Excel trống</div>
              ) : (
                <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 relative scrollbar-custom">
                  <table className="w-full text-left text-sm whitespace-nowrap table-auto border-separate border-spacing-0">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                      <tr>
                        <th className="px-4 py-3 bg-slate-50 border-r border-b border-slate-200 w-12 text-center text-slate-400 sticky left-0 z-20">#</th>
                        {preview.columns.map((col, i) => (
                          <th key={i} className="px-4 py-3 bg-slate-50 border-b border-r border-slate-200 last:border-r-0 min-w-[120px] font-bold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/30 hover:bg-slate-50'}>
                          <td className="px-4 py-3 text-center text-slate-400 font-medium border-r border-slate-100 bg-white sticky left-0 shadow-[1px_0_0_0_#f1f5f9]">
                            {rowIdx + 1}
                          </td>
                          {preview.columns.map((col, colIdx) => {
                            const val = row[col];
                            const displayVal = val === null || val === undefined ? '' : String(val);
                            
                            // Style highlights for scores
                            const numVal = parseFloat(displayVal);
                            const isScore = !isNaN(numVal) && numVal >= 0 && numVal <= 10 && displayVal.trim() !== '';
                            let scoreClass = '';
                            if (isScore && (col.toLowerCase().includes('điểm') || col.toLowerCase().includes('score'))) {
                              if (numVal >= 8.0) scoreClass = 'text-emerald-700 font-bold bg-emerald-50/50';
                              else if (numVal < 5.0) scoreClass = 'text-rose-700 font-bold bg-rose-50/50';
                              else scoreClass = 'text-blue-700 font-bold bg-blue-50/50';
                            }
                            
                            return (
                              <td key={colIdx} className={`px-4 py-3 border-r border-slate-100 last:border-r-0 truncate max-w-[250px] ${scoreClass}`}>
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 p-4 rounded-b-[32px] border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Nguồn: <b>{filename}</b> {preview?.currentSheet && `— Sheet: ${preview.currentSheet}`}</span>
              <span>* Tổng: {preview?.rows.length || 0} học sinh</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

