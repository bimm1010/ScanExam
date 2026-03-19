import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareQuote, Plus, Trash2, X } from 'lucide-react';
import type { RemarkRule } from '../../../types';

interface RemarkConfigModalProps {
  remarkRules: RemarkRule[];
  setRemarkRules: (rules: RemarkRule[]) => void;
  onClose: () => void;
}

const RemarkConfigModal = ({ remarkRules, setRemarkRules, onClose }: RemarkConfigModalProps) => {
  const addRule = () => {
    setRemarkRules([...remarkRules, { min: 0, max: 0, text: "" }]);
  };

  const updateRule = (index: number, field: keyof RemarkRule, value: string | number) => {
    const newRules = [...remarkRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRemarkRules(newRules);
  };

  const removeRule = (index: number) => {
    setRemarkRules(remarkRules.filter((_, i) => i !== index));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 10 }} 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-left"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
              <MessageSquareQuote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Cấu hình Lời phê AI</h3>
              <p className="text-xs font-medium text-slate-500 italic">Tùy chỉnh câu nhận xét tự động theo thang điểm</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <AnimatePresence>
            {[...remarkRules].sort((a, b) => b.min - a.min).map((rule, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-rose-200 transition-all"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Từ</label>
                    <input 
                      type="number" step="0.1" value={rule.min} 
                      onChange={(e) => updateRule(index, 'min', parseFloat(e.target.value))}
                      className="w-16 bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-700 text-center focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 outline-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Đến</label>
                    <input 
                      type="number" step="0.1" value={rule.max} 
                      onChange={(e) => updateRule(index, 'max', parseFloat(e.target.value))}
                      className="w-16 bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-700 text-center focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Nội dung lời phê</label>
                  <div className="flex gap-2">
                    <textarea 
                      value={rule.text} 
                      onChange={(e) => updateRule(index, 'text', e.target.value)}
                      placeholder="Nhập câu nhận xét..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 outline-none resize-none min-h-[60px]"
                    />
                    <button 
                      onClick={() => removeRule(index)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all self-start"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button 
            onClick={addRule}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Thêm khoảng điểm
          </button>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-full font-black text-sm shadow-lg hover:shadow-rose-500/20 transition-all active:scale-95">Lưu cấu hình</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RemarkConfigModal;
