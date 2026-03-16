import type { StudentData } from '../types';

/**
 * Exports student results to a JSON file.
 */
export const exportToJson = (students: StudentData[], sheetName: string | null) => {
  const dataToExport = students.map(s => ({
    "Số thứ tự": s.id,
    "Họ và Tên": s.name,
    "Môn kiểm tra": s.subject || "Chưa xác định",
    "Điểm số": s.score || 0,
    "Xếp loại": s.level || "H"
  }));
  
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ket-qua-diem-${sheetName || 'lop'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
