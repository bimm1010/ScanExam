import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SuccessToastProps {
  show: boolean;
  studentNames: string | null;
  count: number;
}

const SuccessToast = ({ show, studentNames, count }: SuccessToastProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-white/80 backdrop-blur-2xl border-2 border-emerald-500/30 px-8 py-4 rounded-3xl shadow-2xl shadow-emerald-200/50 flex items-center gap-4">
            <div className="bg-emerald-500 p-2 rounded-full shadow-lg shadow-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-emerald-800 font-black text-lg">Đã cập nhật Excel!</span>
              <span className="text-emerald-600 font-bold text-sm tracking-tight">{studentNames}</span>
            </div>
            <div className="ml-4 bg-emerald-100 px-4 py-1.5 rounded-2xl border border-emerald-200">
              <span className="text-emerald-700 font-black text-xl">+{count}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessToast;
