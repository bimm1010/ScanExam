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

  // Pre-process xlsx buffer to fix namespace prefixes for ExcelJS compatibility.
  // Files from Bộ GD&ĐT use non-standard prefixes (x:, ap:, vt:) that ExcelJS can't parse.
  const sanitizeXlsxBuffer = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);

      const xmlEntries = Object.keys(zip.files).filter(
        name => name.endsWith('.xml') || name.endsWith('.rels')
      );

      // Tags that ExcelJS CoreXform expects WITH cp: prefix
      const cpTags = ['keywords', 'category', 'lastModifiedBy', 'lastPrinted',
                       'revision', 'version', 'contentStatus', 'contentType'];

      for (const entryName of xmlEntries) {
        const content = await zip.files[entryName].async('string');

        if (entryName === 'docProps/core.xml') {
          // core.xml: ExcelJS expects dc:, cp:, dcterms: prefixed tags.
          // Ministry files may omit cp: prefix on some tags (e.g. <lastModifiedBy>).
          // Fix: add cp: prefix to bare tags that ExcelJS expects.
          let fixed = content;
          for (const tag of cpTags) {
            fixed = fixed
              .replace(new RegExp(`<${tag}([ >/])`, 'g'), `<cp:${tag}$1`)
              .replace(new RegExp(`</${tag}>`, 'g'), `</cp:${tag}>`);
          }
          if (fixed !== content) zip.file(entryName, fixed);
          continue;
        }

        // All other files: strip ALL namespace prefixes from element tags
        if (!/<[a-z][a-z0-9]*:[A-Za-z]/i.test(content)) continue;

        const sanitized = content
          .replace(/<([a-z][a-z0-9]*):/gi, '<')              // <ap:Company → <Company
          .replace(/<\/([a-z][a-z0-9]*):/gi, '</')            // </ap:Company → </Company
          .replace(/\s*xmlns:[a-z][a-z0-9]*="[^"]*"/gi, '');  // remove xmlns:prefix declarations

        zip.file(entryName, sanitized);
      }

      return await zip.generateAsync({ type: 'arraybuffer' });
    } catch (e) {
      console.warn('sanitizeXlsxBuffer failed, using original buffer:', e);
      return buffer;
    }
  };

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
      const cleanBuffer = await sanitizeXlsxBuffer(arrayBuffer);
      await workbook.xlsx.load(cleanBuffer);

      const formData = new FormData();
      formData.append('file', file);
      try {
        const uploadRes = await fetch(`/api/upload-roster-excel/`, {
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

    // First pass to find max columns in the first 1000 rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1000) {
        row.eachCell({ includeEmpty: true }, (_, colNumber) => {
          if (colNumber > maxCols) maxCols = colNumber;
        });
      }
    });

    // Second pass to extract structured data with metadata
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1000) {
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
    try {
      const response = await fetch(`/api/analyze-excel-columns/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sample_data: sampleData })
      });
      
      if (response.ok) {
        const result = await response.json();
        setIsProcessing(false);
        return result;
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
    selectedRemarkCol: number,
    dataRowStart?: number
  ) => {
    console.log("🚀 [useExcel] Processing worksheet...", {
      selectedSheetId, headerRowIndex, selectedIdCol, selectedNameCol, dataRowStart
    });

    if (!workbookData) {
      console.error("❌ [useExcel] No workbook data found!");
      return;
    }
    if (selectedSheetId === null) {
      console.error("❌ [useExcel] No sheet ID selected!");
      return;
    }

    const worksheet = workbookData.getWorksheet(selectedSheetId);
    if (!worksheet) {
      console.error("❌ [useExcel] Worksheet not found for ID:", selectedSheetId);
      return;
    }

    setIsProcessing(true);
    const parsedStudents: StudentData[] = [];

    const actualStartRow = dataRowStart || (headerRowIndex + 1);
    console.log("📊 [useExcel] Starting extraction from row:", actualStartRow);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= actualStartRow) { 
        const idValue = selectedIdCol > 0 ? formatCellValue(row.getCell(selectedIdCol).value) : "";
        const nameValue = selectedNameCol > 0 ? formatCellValue(row.getCell(selectedNameCol).value) : "";
        
        if (idValue && nameValue) {
           parsedStudents.push({
             id: idValue,
             name: nameValue,
             score: selectedScoreCol > 0 ? formatCellValue(row.getCell(selectedScoreCol).value) : null,
             level: selectedLevelCol > 0 ? formatCellValue(row.getCell(selectedLevelCol).value) : null,
             remark: selectedRemarkCol > 0 ? formatCellValue(row.getCell(selectedRemarkCol).value) : null
           });
        } else if (rowNumber < actualStartRow + 5) {
          console.warn(`⚠️ [useExcel] Missing ID or Name at row ${rowNumber}:`, { idValue, nameValue });
        }
      }
    });

    console.log(`✅ [useExcel] Extraction finished. Found ${parsedStudents.length} students.`);

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
        remarkCol: selectedRemarkCol,
        headerRow: headerRowIndex,
        dataRowStart: actualStartRow // Thêm cái này để persistence nhớ đúng dòng bắt đầu
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
