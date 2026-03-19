export interface StudentData {
  id: string | number;
  name: string;
  score?: string | number | null;
  level?: string | number | null;
  remark?: string | null;
  subject?: string | null;
}

export interface MappingConfig {
  idCol: number;
  nameCol: number;
  scoreCol: number;
  levelCol: number;
  remarkCol: number;
  headerRow: number;
  confidence?: number;
  cleaningRules?: string[];
  dataRowStart?: number;
  suggestedRemarkRules?: RemarkRule[];
}

export interface ScanResult {
  studentId: string | number | null;
  studentName?: string;
  score: string | number | null;
  level: string | null;
  remark?: string | null;
  subject?: string;
  imageUrl?: string;
  isFuzzyMatch?: boolean;
  fuzzyScore?: number;
  excelUpdated?: boolean;
}

export interface MismatchData { 
  originalKey: string; 
  fileName: string;
  detectedSubject: string; 
  expectedSubject: string; 
}

export interface CellMetadata {
  isBold: boolean;
}

export interface RowSample {
  rowNumber: number;
  values: string[];
  metadata?: CellMetadata[];
}

export interface RemarkRule {
  min: number;
  max: number;
  text: string;
}

export interface AppSavedState {
  step: AppStep;
  students: StudentData[];
  fileName: string | null;
  selectedSheetName: string | null;
  selectedSheetId: number | null;
  mappingConfig: MappingConfig | null;
  sheetSampleData: RowSample[];
  totalColumns: number;
  selectedIdCol: number;
  selectedNameCol: number;
  selectedScoreCol: number;
  selectedLevelCol: number;
  selectedRemarkCol: number;
  headerRowIndex: number;
  dataRowStart: number;
  processedFiles: string[];
  scannedImages: {key: string, url: string}[];
  backendExcelFilename: string | null;
  remarkRules: RemarkRule[];
}

export type AppStep = 'upload' | 'select-sheet' | 'map-columns' | 'success' | 'scan';
