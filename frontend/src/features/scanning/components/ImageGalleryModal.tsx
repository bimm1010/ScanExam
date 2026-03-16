import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, CheckCircle2, Trash2 } from 'lucide-react';

interface ImageGalleryModalProps {
  images: {key: string, url: string}[];
  onClose: () => void;
  onDelete: (keys: string[]) => void;
}

const ImageGalleryModal = ({ images, onClose, onDelete }: ImageGalleryModalProps) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const confirmDelete = () => {
    if (selectedKeys.length === 0) return;
    onDelete(selectedKeys);
    setSelectedKeys([]);
    setIsConfirmingDelete(false);
    if (images.length <= selectedKeys.length) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-t-[40px] sm:rounded-[48px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-[18px] flex items-center justify-center shadow-sm">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Thư viện Bài thi</h3>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                {images.length} hình ảnh • {selectedKeys.length} đang chọn
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-full flex items-center justify-center text-slate-400 transition-all border border-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
          {images.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black text-xs uppercase tracking-widest">Kho ảnh đang trống</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              {images.map((img) => {
                const isSelected = selectedKeys.includes(img.key);
                return (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={img.key}
                    onClick={() => toggleSelect(img.key)}
                    className={`relative aspect-[3/4] rounded-[24px] overflow-hidden cursor-pointer border-4 transition-all ${isSelected ? 'border-rose-500 shadow-xl shadow-rose-200' : 'border-white shadow-sm'}`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center backdrop-blur-[2px]">
                         <div className="bg-white rounded-full p-2 shadow-lg">
                           <CheckCircle2 className="w-6 h-6 text-rose-500" />
                         </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                       <p className="text-[10px] text-white font-black truncate opacity-90 uppercase tracking-wider">{img.key.split('-')[0]}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-slate-50 flex flex-col sm:flex-row gap-6 items-center justify-between bg-white">
          <button 
            onClick={() => setSelectedKeys(selectedKeys.length === images.length ? [] : images.map(i => i.key))}
            className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
          >
            {selectedKeys.length === images.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
          </button>

          <div className="flex gap-4 w-full sm:w-auto">
            {isConfirmingDelete ? (
              <div className="flex items-center gap-3 w-full sm:w-auto bg-rose-50/50 p-2 rounded-[24px] border border-rose-100">
                <p className="px-4 text-[10px] font-black text-rose-600 uppercase tracking-tight">Xóa {selectedKeys.length} ảnh?</p>
                <button 
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-6 py-2.5 bg-white text-slate-600 rounded-full text-xs font-black border border-slate-200 shadow-sm"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-8 py-2.5 bg-rose-600 text-white rounded-full text-xs font-black shadow-lg shadow-rose-600/30"
                >
                  Xác nhận
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={onClose}
                  className="secondary-btn flex-1 sm:flex-none px-10 py-3"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={selectedKeys.length === 0}
                  className="squircle-btn flex-1 sm:flex-none px-10 py-3 text-white disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ImageGalleryModal;
