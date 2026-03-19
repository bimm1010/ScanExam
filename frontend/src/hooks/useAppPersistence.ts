import { useEffect, useRef } from 'react';
import type { AppStep, StudentData, MappingConfig, RowSample, AppSavedState, RemarkRule } from '../types';

interface UseAppPersistenceProps {
  step: AppStep;
  setStep: (step: AppStep) => void;
  students: StudentData[];
  setStudents: (students: StudentData[]) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  selectedSheetName: string | null;
  setSelectedSheetName: (name: string | null) => void;
  selectedSheetId: number | null;
  setSelectedSheetId: (id: number | null) => void;
  mappingConfig: MappingConfig | null;
  setMappingConfig: (config: MappingConfig | null) => void;
  sheetSampleData: RowSample[];
  setSheetSampleData: (data: RowSample[]) => void;
  totalColumns: number;
  setTotalColumns: (count: number) => void;
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
  processedFiles: string[];
  setProcessedFiles: (files: string[]) => void;
  scannedImages: {key: string, url: string}[];
  setScannedImages: (images: {key: string, url: string}[]) => void;
  backendExcelFilename: string | null;
  setBackendExcelFilename: (name: string | null) => void;
  remarkRules: RemarkRule[];
  setRemarkRules: (rules: RemarkRule[]) => void;
}

const DEFAULT_REMARK_RULES: RemarkRule[] = [
  { min: 9, max: 10, text: "Em làm bài rất xuất sắc, kiến thức rất vững!" },
  { min: 7, max: 8.9, text: "Bài làm khá tốt, cần phát huy thêm nhé!" },
  { min: 5, max: 6.9, text: "Em đã nắm được kiến thức cơ bản, cố gắng hơn ở các bài tập nâng cao." },
  { min: 0, max: 4.9, text: "Em cần ôn tập lại kỹ hơn các nội dung đã học. Cố lên nhé!" }
];

export const useAppPersistence = ({
  step, setStep,
  students, setStudents,
  fileName, setFileName,
  selectedSheetName, setSelectedSheetName,
  selectedSheetId, setSelectedSheetId,
  mappingConfig, setMappingConfig,
  sheetSampleData, setSheetSampleData,
  totalColumns, setTotalColumns,
  selectedIdCol, setSelectedIdCol,
  selectedNameCol, setSelectedNameCol,
  selectedScoreCol, setSelectedScoreCol,
  selectedLevelCol, setSelectedLevelCol,
  selectedRemarkCol, setSelectedRemarkCol,
  headerRowIndex, setHeaderRowIndex,
  dataRowStart, setDataRowStart,
  processedFiles, setProcessedFiles,
  scannedImages, setScannedImages,
  backendExcelFilename, setBackendExcelFilename,
  remarkRules, setRemarkRules
}: UseAppPersistenceProps) => {
  const isRestored = useRef(false);

  useEffect(() => {
    const savedStateStr = localStorage.getItem('aigrande_state');
    
    // Default fallback: If no rules exist in memory yet, set default ones
    if (remarkRules.length === 0) {
      setRemarkRules(DEFAULT_REMARK_RULES);
    }

    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr) as AppSavedState;
        if (savedState) {
          // Priority 1: Restore remarkRules immediately
          if (savedState.remarkRules && savedState.remarkRules.length > 0) {
            setRemarkRules(savedState.remarkRules);
          }

          if (savedState.step) {
            setStep(savedState.step);
            if (savedState.students) setStudents(savedState.students);
            if (savedState.fileName) setFileName(savedState.fileName);
            if (savedState.selectedSheetName) setSelectedSheetName(savedState.selectedSheetName);
            if (savedState.selectedSheetId !== undefined) setSelectedSheetId(savedState.selectedSheetId);
            if (savedState.sheetSampleData) setSheetSampleData(savedState.sheetSampleData);
            if (savedState.totalColumns) setTotalColumns(savedState.totalColumns);
            if (savedState.selectedIdCol) setSelectedIdCol(savedState.selectedIdCol);
            if (savedState.selectedNameCol) setSelectedNameCol(savedState.selectedNameCol);
            if (savedState.selectedScoreCol) setSelectedScoreCol(savedState.selectedScoreCol);
            if (savedState.selectedLevelCol) setSelectedLevelCol(savedState.selectedLevelCol);
            if (savedState.selectedRemarkCol) setSelectedRemarkCol(savedState.selectedRemarkCol);
            if (savedState.headerRowIndex) setHeaderRowIndex(savedState.headerRowIndex);
            if (savedState.dataRowStart) setDataRowStart(savedState.dataRowStart);
            if (savedState.processedFiles) setProcessedFiles(savedState.processedFiles);
            if (savedState.scannedImages) setScannedImages(savedState.scannedImages);
            if (savedState.backendExcelFilename) setBackendExcelFilename(savedState.backendExcelFilename);

            if (savedState.mappingConfig) {
              const config = savedState.mappingConfig;
              setMappingConfig(config);
              setSelectedIdCol(config.idCol);
              setSelectedNameCol(config.nameCol);
              setSelectedScoreCol(config.scoreCol);
              setSelectedLevelCol(config.levelCol);
              setSelectedRemarkCol(config.remarkCol);
              setHeaderRowIndex(config.headerRow);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    
    setTimeout(() => {
      isRestored.current = true;
    }, 100);
  }, [
    setStep, setStudents, setFileName, setSelectedSheetName, setSelectedSheetId,
    setSheetSampleData, setTotalColumns, setSelectedIdCol, setSelectedNameCol,
    setSelectedScoreCol, setSelectedLevelCol, setSelectedRemarkCol, setHeaderRowIndex, setDataRowStart,
    setProcessedFiles, setScannedImages, setBackendExcelFilename, setMappingConfig,
    setRemarkRules
  ]);

  useEffect(() => {
    if (!isRestored.current) return;

    const stateToSave: AppSavedState = {
      step,
      students,
      fileName,
      selectedSheetName,
      selectedSheetId,
      mappingConfig,
      sheetSampleData,
      totalColumns,
      selectedIdCol,
      selectedNameCol,
      selectedScoreCol,
      selectedLevelCol,
      selectedRemarkCol,
      headerRowIndex,
      dataRowStart,
      processedFiles,
      scannedImages,
      backendExcelFilename,
      remarkRules
    };
    localStorage.setItem('aigrande_state', JSON.stringify(stateToSave));
  }, [
    step, students, fileName, selectedSheetName, selectedSheetId,
    mappingConfig, sheetSampleData, totalColumns, selectedIdCol,
    selectedNameCol, selectedScoreCol, selectedLevelCol, selectedRemarkCol, headerRowIndex, dataRowStart,
    processedFiles, scannedImages, backendExcelFilename, remarkRules
  ]);

  return { isRestored };
};
