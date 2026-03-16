import { useEffect, useRef } from 'react';
import type { AppStep, StudentData, MappingConfig, RowSample, AppSavedState } from '../types';

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
}

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
  headerRowIndex, setHeaderRowIndex,
  dataRowStart, setDataRowStart,
  processedFiles, setProcessedFiles,
  scannedImages, setScannedImages,
  backendExcelFilename, setBackendExcelFilename
}: UseAppPersistenceProps) => {
  const isRestored = useRef(false);

  useEffect(() => {
    const savedStateStr = localStorage.getItem('aigrande_state');
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr) as AppSavedState;
        if (savedState && savedState.step) {
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
            setHeaderRowIndex(config.headerRow);
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
    setSelectedScoreCol, setSelectedLevelCol, setHeaderRowIndex, setDataRowStart,
    setProcessedFiles, setScannedImages, setBackendExcelFilename, setMappingConfig
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
      headerRowIndex,
      dataRowStart,
      processedFiles,
      scannedImages,
      backendExcelFilename
    };
    localStorage.setItem('aigrande_state', JSON.stringify(stateToSave));
  }, [
    step, students, fileName, selectedSheetName, selectedSheetId,
    mappingConfig, sheetSampleData, totalColumns, selectedIdCol,
    selectedNameCol, selectedScoreCol, selectedLevelCol, headerRowIndex, dataRowStart,
    processedFiles, scannedImages, backendExcelFilename
  ]);

  return { isRestored };
};
