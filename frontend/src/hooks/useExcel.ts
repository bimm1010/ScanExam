import { useState } from 'react';
import ExcelJS from 'exceljs';
import type { RowSample, StudentData, MappingConfig, AppStep, CellMetadata } from '../types';

interface UseExcelProps {
  setFileName: (name: string | null) => void;
  setBackendExcelFilename: (name: string | null) => void;
  setStep: (step: AppStep) => void;
  setStudents: (students: StudentData[]) => void;
  setMappingConfig: (config: MappingConfig | null) => void;
  setError: (err: string | null) => void;
  setIsProcessing: (loading: boolean) => void;
  setSheetSampleData: (data: RowSample[]) => void;
  setTotalColumns: (count: number) => void;
}

export const useExcel = ({
  setFileName,
  setBackendExcelFilename,
  setStep,
  setStudents,
  setMappingConfig,
  setError,
  setIsProcessing,
  setSheetSampleData,
  setTotalColumns
}: UseExcelProps) => {
  const [workbookData, setWorkbookData] = useState<ExcelJS.Workbook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<{id: number, name: string}[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Vui lòng chọn đúng file định dạng Excel (.xlsx, .xls)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const formData = new FormData();
      formData.append('file', file);
      const apiHost = window.location.hostname;
      
      try {
        const uploadRes = await fetch(`http://${apiHost}:8000/api/upload-roster-excel/`, {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
           const uploadData = await uploadRes.json();
           setBackendExcelFilename(uploadData.filename);
        }
      } catch (e) {
        console.error("Failed to upload roster to server", e);
      }

      const sheets = workbook.worksheets.map(ws => ({ id: ws.id, name: ws.name }));
      
      if (sheets.length === 0) {
        setError('File Excel không có dữ liệu (không có sheet nào).');
        setIsProcessing(false);
        return;
      }

      setWorkbookData(workbook);
      setAvailableSheets(sheets);
      setStep('select-sheet');
      setIsProcessing(false);

    } catch (err) {
      console.error(err);
      setError('Lỗi khi đọc file Excel. Định dạng file có thể không đúng hoặc file bị hỏng.');
      setIsProcessing(false);
    }
  };

  const formatCellValue = (cellValue: ExcelJS.CellValue): string => {
    if (cellValue === null || cellValue === undefined) return '';
    if (typeof cellValue === 'object') {
      if (cellValue instanceof Date) return cellValue.toLocaleDateString('vi-VN');
      
      const cellObj = cellValue as unknown as Record<string, unknown>;

      if (cellObj.richText && Array.isArray(cellObj.richText)) {
        return cellObj.richText.map((rt: Record<string, unknown>) => String(rt.text)).join('');
      }

      if ('formula' in cellObj || 'sharedFormula' in cellObj) {
        const res = cellObj.result;
        if (res !== undefined && res !== null) {
          if (res instanceof Date) return res.toLocaleDateString('vi-VN');
          if (typeof res === 'object' && 'error' in res) return '';
          return String(res);
        }
        return '';
      }
      
      if ('text' in cellObj) {
        return String(cellObj.text);
      }
      
      return '';
    }
    return String(cellValue).trim();
  };

  const extractSheetSample = async (selectedSheetId: number) => {
    if (!workbookData) return;
    const worksheet = workbookData.getWorksheet(selectedSheetId);
    if (!worksheet) return;

    const sampleRows: RowSample[] = [];
    let maxCols = 0;

    // First pass to find max columns in the first 30 rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 30) {
        row.eachCell({ includeEmpty: true }, (_, colNumber) => {
          if (colNumber > maxCols) maxCols = colNumber;
        });
      }
    });

    // Second pass to extract structured data with metadata
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 30) {
        const rowValues: string[] = Array(maxCols).fill("");
        const rowMetadata: CellMetadata[] = Array(maxCols).fill({ isBold: false });
        
        for (let i = 1; i <= maxCols; i++) {
          const cell = row.getCell(i);
          rowValues[i - 1] = formatCellValue(cell.value);
          rowMetadata[i - 1] = {
            isBold: !!cell.font?.bold
          };
        }
        sampleRows.push({ rowNumber, values: rowValues, metadata: rowMetadata });
      }
    });

    setSheetSampleData(sampleRows);
    setTotalColumns(maxCols);
    return sampleRows;
  };

  const autoDetectMapping = async (sampleData: RowSample[]) => {
    setIsProcessing(true);
    const apiHost = window.location.hostname;
    try {
      const response = await fetch(`http://${apiHost}:8000/api/analyze-excel-columns/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sample_data: sampleData })
      });
      
      if (response.ok) {
        const mapping = await response.json();
        setIsProcessing(false);
        return mapping as MappingConfig;
      }
    } catch (e) {
      console.error("AI Auto-detection failed", e);
    }
    setIsProcessing(false);
    return null;
  };

  const processWorksheet = (
    selectedSheetId: number | null,
    headerRowIndex: number,
    selectedIdCol: number,
    selectedNameCol: number,
    selectedScoreCol: number,
    selectedLevelCol: number,
    dataRowStart?: number
  ) => {
    if (!workbookData || selectedSheetId === null) return;
    const worksheet = workbookData.getWorksheet(selectedSheetId);
    if (!worksheet) return;

    setIsProcessing(true);
    const parsedStudents: StudentData[] = [];

    const actualStartRow = dataRowStart || (headerRowIndex + 1);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= actualStartRow) { 
        const idValue = formatCellValue(row.getCell(selectedIdCol).value);
        const nameValue = formatCellValue(row.getCell(selectedNameCol).value);
        
        if (idValue && nameValue) {
           parsedStudents.push({
             id: idValue,
             name: nameValue,
             score: formatCellValue(row.getCell(selectedScoreCol).value),
             level: formatCellValue(row.getCell(selectedLevelCol).value)
           });
        }
      }
    });

    if (parsedStudents.length === 0) {
      setError(`Không trích xuất được học sinh nào. Hãy kiểm tra cấu hình cột.`);
      setIsProcessing(false);
    } else {
      setStudents(parsedStudents);
      setMappingConfig({
        idCol: selectedIdCol,
        nameCol: selectedNameCol,
        scoreCol: selectedScoreCol,
        levelCol: selectedLevelCol,
        headerRow: headerRowIndex
      });
      setError(null);
      setStep('success');
      setIsProcessing(false);
    }
  };

  return {
    availableSheets,
    handleFileUpload,
    extractSheetSample,
    autoDetectMapping,
    processWorksheet
  };
};
