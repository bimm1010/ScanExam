import { motion } from 'framer-motion';
import { Users, X, FileSpreadsheet } from 'lucide-react';
import type { StudentData } from '../../../types';

interface RosterModalProps {
  students: StudentData[];
  sheetName: string | null;
  onClose: () => void;
  onExport: () => void;
}

const RosterModal = ({ students, sheetName, onClose, onExport }: RosterModalProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 10 }} 
        transition={{ type: "spring", stiffness: 300, damping: 25 }} 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl bg-white/80 backdrop-blur-3xl border border-white rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative text-left"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/50">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-2 rounded-xl text-emerald-600 border border-emerald-200/50">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Danh sách Học sinh</h3>
              <p className="text-sm font-medium text-slate-500">Lớp {sheetName} • {students.length} học sinh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors border border-slate-100 shadow-sm"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 custom-scrollbar">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <th className="px-6 py-4 w-20 text-center">STT</th>
                  <th className="px-6 py-4 w-1/4">Mã HS / SBD</th>
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4">Môn học</th>
                  <th className="px-6 py-4 text-center">Điểm</th>
                  <th className="px-6 py-4 text-center">Mức đạt</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index} className="border-b last:border-0 border-slate-100 hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                    <td className="px-6 py-3"><span className="font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{student.id}</span></td>
                    <td className="px-6 py-3 font-medium text-slate-800">{student.name}</td>
                    <td className="px-6 py-3">{student.subject ? <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase tracking-tighter">{student.subject}</span> : <span className="text-slate-300 italic text-xs">-</span>}</td>
                    <td className="px-6 py-3 text-center">{student.score ? <span className="font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">{student.score}</span> : <span className="text-slate-300 italic">-</span>}</td>
                    <td className="px-6 py-3 text-center">{student.level ? <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{student.level}</span> : <span className="text-slate-300 italic">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200/50 bg-white/50 flex justify-between items-center">
          <button onClick={onExport} disabled={students.filter(s => s.score != null).length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"><FileSpreadsheet className="w-5 h-5" /> Xuất JSON</button>
          <button onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-bold shadow-md transition-colors">Đóng</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RosterModal;
