import { type ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentStep?: string;
  onReset?: () => void;
}

export default function Layout({ children, currentStep, onReset }: LayoutProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAll = async () => {
    if (!onReset) return;
    setIsResetting(true);
    try {
      await onReset();
      setShowConfirm(false);
    } catch (error) {
      console.error("Reset failed", error);
      alert("Có lỗi xảy ra khi xóa dữ liệu. Đại ca thử lại xem sao nhé!");
    } finally {
      setIsResetting(false);
    }
  };

  // Only show Reset Button if NOT on upload step
  const isUploadStep = currentStep === 'upload';

  return (
    <div className="min-h-screen w-full font-sans selection:bg-rose-200 flex flex-col items-center justify-center p-4 relative">
      {/* Global Reset Button - Hidden on Upload Step */}
      <AnimatePresence>
        {!isUploadStep && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setShowConfirm(true)}
            className="fixed top-6 right-6 p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-300 shadow-lg group z-40"
            title="Bắt đầu lại từ đầu (Xóa sạch dữ liệu)"
          >
            <Trash2 className="w-5 h-5" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 ease-in-out text-sm font-bold whitespace-nowrap">
              Làm sạch hệ thống
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 max-w-md w-full relative overflow-hidden"
            >
              {/* Decorative Red Glow */}
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
              
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-rose-100 rounded-full">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-800 text-center mb-4">
                XÓA SẠCH DỮ LIỆU?
              </h2>
              
              <p className="text-slate-500 text-center leading-relaxed mb-8">
                Hành động này sẽ xóa vĩnh viễn: <br/>
                <span className="font-bold text-rose-500">• Toàn bộ file Excel đã tải lên</span> <br/>
                <span className="font-bold text-rose-500">• Tất cả ảnh bài thi đã quét</span> <br/>
                <span className="font-bold text-rose-500">• Kết quả chấm điểm hiện tại</span> <br/>
                Bạn có chắc chắn muốn làm mới hoàn toàn không?
              </p>

              <div className="flex gap-3">
                <button
                  disabled={isResetting}
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  disabled={isResetting}
                  onClick={handleResetAll}
                  className="flex-2 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    "ĐỒNG Ý XÓA"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full flex justify-center items-center"
      >
        {children}
      </motion.main>
    </div>
  );
}
