import { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
import type { AppStep, StudentData, MappingConfig, MismatchData, RowSample, RemarkRule } from './types';

// Hooks
import { useAppPersistence } from './hooks/useAppPersistence';
import { useScanning } from './hooks/useScanning';
import { useExcel } from './hooks/useExcel';

// Components
import Layout from './components/Layout';
import SuccessToast from './components/ui/SuccessToast';
import UploadStep from './features/upload/components/UploadStep';
import SheetSelectionStep from './features/upload/components/SheetSelectionStep';
import ColumnMappingStep from './features/upload/components/ColumnMappingStep';
import SuccessStep from './features/success/components/SuccessStep';
import ScanningStep from './features/scanning/components/ScanningStep';

// Modals
import RosterModal from './features/roster/components/RosterModal';
import MismatchModal from './features/scanning/components/MismatchModal';
import ImageGalleryModal from './features/scanning/components/ImageGalleryModal';
import RemarkConfigModal from './features/scanning/components/RemarkConfigModal';

// Utils
import { getColumnLetter } from './utils/excel';
import { exportToJson } from './utils/export';

function App() {
  // --- CORE STATE ---
  const [step, setStep] = useState<AppStep>('upload');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null);
  const [mappingConfig, setMappingConfig] = useState<MappingConfig | null>(null);
  const [backendExcelFilename, setBackendExcelFilename] = useState<string | null>(null);
  const [remarkRules, setRemarkRules] = useState<RemarkRule[]>([]);
  
  // Column Mapping Detailed State
  const [selectedIdCol, setSelectedIdCol] = useState<number>(0);
  const [selectedNameCol, setSelectedNameCol] = useState<number>(0);
  const [selectedScoreCol, setSelectedScoreCol] = useState<number>(0); 
  const [selectedLevelCol, setSelectedLevelCol] = useState<number>(0); 
  const [selectedRemarkCol, setSelectedRemarkCol] = useState<number>(0);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(1);
  const [dataRowStart, setDataRowStart] = useState<number>(2);
  const [sheetSampleData, setSheetSampleData] = useState<RowSample[]>([]);
  const [totalColumns, setTotalColumns] = useState<number>(0);
  
  // Tracking & Gallery
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [scannedImages, setScannedImages] = useState<{key: string, url: string}[]>([]);
  
  // Notification & Feedback State
  const [excelUpdateCount, setExcelUpdateCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastMatchedStudent, setLastMatchedStudent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals Visibility
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showRemarkConfig, setShowRemarkConfig] = useState(false);
  const [mismatchData, setMismatchData] = useState<MismatchData | null>(null);

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- CUSTOM HOOKS ---
  useAppPersistence({
    step, setStep, students, setStudents, fileName, setFileName,
    selectedSheetName, setSelectedSheetName, selectedSheetId, setSelectedSheetId,
    mappingConfig, setMappingConfig, processedFiles, setProcessedFiles,
    scannedImages, setScannedImages, backendExcelFilename, setBackendExcelFilename,
    selectedIdCol, setSelectedIdCol, selectedNameCol, setSelectedNameCol,
    selectedScoreCol, setSelectedScoreCol, selectedLevelCol, setSelectedLevelCol,
    selectedRemarkCol, setSelectedRemarkCol,
    headerRowIndex, setHeaderRowIndex, dataRowStart, setDataRowStart, 
    sheetSampleData, setSheetSampleData, totalColumns, setTotalColumns,
    remarkRules, setRemarkRules
  });

  const {
    availableSheets,
    handleFileUpload,
    extractSheetSample,
    autoDetectMapping,
    processWorksheet
  } = useExcel({
    setFileName, setBackendExcelFilename, setStep, setStudents,
    setMappingConfig, setError, setIsProcessing,
    setSheetSampleData, setTotalColumns
  });

  const {
    batchProgress,
    handleImageCapture,
    handleMobileFile,
    forceFlushPending,
    handleMobileScanResult
  } = useScanning({
    selectedSheetName, backendExcelFilename, mappingConfig, students, setStudents,
    processedFiles, setProcessedFiles, setScannedImages, setExcelUpdateCount,
    setShowSuccessToast, setLastMatchedStudent, setMismatchData,
    isProcessing, setIsProcessing, setError,
    remarkRules
  });

  // Listen for images sent from mobile phone via WebSocket
  useEffect(() => {
    const handler = (e: Event) => {
      const file = (e as CustomEvent<{ file: File }>).detail.file;
      console.log('📱 [App] mobileScanFile event received:', file.name);
      handleMobileFile(file);
    };
    window.addEventListener('mobileScanFile', handler);
    return () => window.removeEventListener('mobileScanFile', handler);
  }, [handleMobileFile]);

  // --- ACTIONS ---
  const handleDownload = async () => {
    if (!backendExcelFilename) return;
    
    let fileHandle: any = null;
    
    // 0. Bắt buộc gọi showSaveFilePicker ngay lập tức khi người dùng click
    // Nếu để sau các lệnh await (fetch/flush), trình duyệt sẽ hủy "User Gesture" và báo lỗi SecurityError
    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: backendExcelFilename,
          types: [{
            description: 'Excel File',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        });
      } catch (err: any) {
        // Nếu user nhấn Huỷ (Cancel), dừng toàn bộ tiến trình
        if (err.name === 'AbortError') {
          console.log("🛑 [App] Download cancelled by user in picker");
          return;
        }
        console.error("❌ [App] File system error during picker:", err);
      }
    }

    setIsProcessing(true);
    await syncManualChanges();

    const success = await forceFlushPending();
    if (!success) {
      console.log("🛑 [App] Download aborted due to mismatch or error in final flush");
      setIsProcessing(false);
      return;
    }
    
    try {
      const url = `/api/download-updated-excel/?filename=${encodeURIComponent(backendExcelFilename)}`;
      
      if (fileHandle) {
        // Fetch data và ghi trực tiếp vào File Handle đã được cấp quyền từ trước
        const response = await fetch(url);
        if (!response.ok) throw new Error("Không thể tải file từ server.");
        const blob = await response.blob();
        
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("✅ [App] File saved successfully via File System Access API");
        } catch (writeErr: any) {
          console.error("❌ [App] Failed to write to file:", writeErr);
          triggerTraditionalDownload(url, backendExcelFilename);
        }
      } else {
        // Fallback cho trình duyệt cũ (Safari/Firefox) hoặc HTTP không bảo mật
        triggerTraditionalDownload(url, backendExcelFilename);
      }
    } catch (e: unknown) {
      console.error("❌ [App] Download error:", e);
      setError("Lỗi khi tải file: " + (e instanceof Error ? e.message : "Không xác định"));
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerTraditionalDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("📥 [App] Traditional download triggered as fallback");
  };

  const resetFlow = () => {
    // Xóa dữ liệu cũ nhưng giữ lại remarkRules
    const savedStateStr = localStorage.getItem('aigrande_state');
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr);
        // Chỉ giữ lại remarkRules, reset các thứ khác
        const newState = {
          remarkRules: savedState.remarkRules || []
        };
        localStorage.setItem('aigrande_state', JSON.stringify(newState));
      } catch (e) {
        localStorage.removeItem('aigrande_state');
      }
    } else {
      localStorage.removeItem('aigrande_state');
    }
    
    scannedImages.forEach(img => URL.revokeObjectURL(img.url));
    window.location.reload(); // Reload để khởi tạo lại state sạch
  };


  const handleExport = () => {
    exportToJson(students, selectedSheetName);
  };

  const clearScannedData = () => {
    if (window.confirm("Xóa toàn bộ ảnh đã quét và làm lại?")) {
      setProcessedFiles([]);
      setScannedImages(prev => { prev.forEach(img => URL.revokeObjectURL(img.url)); return []; });
      setStudents(prev => prev.map(s => ({ ...s, score: null, level: null, remark: null, subject: null })));
    }
  };

  const handleUpdateStudent = (id: string | number, field: 'score' | 'level' | 'remark', value: string) => {
    setStudents(prev => prev.map(s => {
      if (String(s.id) === String(id)) {
        return {
          ...s,
          [field]: value === '' ? null : (field === 'score' ? parseFloat(value) : value)
        };
      }
      return s;
    }));
  };
  const syncManualChanges = async () => {
    if (!backendExcelFilename || !mappingConfig) return;
    
    console.log("🔄 [App] Syncing manual changes to backend...");
    try {
      const response = await fetch(`/api/sync-roster/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roster: students,
          excel_filename: backendExcelFilename,
          mapping_config: mappingConfig,
          expected_subject: selectedSheetName
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Không thể đồng bộ bảng điểm.');
      }
      console.log("✅ [App] Manual sync successful");
    } catch (e: unknown) {
      console.error("❌ [App] Sync error:", e);
      setError("Cảnh báo: Không thể đồng bộ một số thay đổi thủ công lên server.");
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 text-center my-auto h-full">
        {/* Header Section - Refined Staggered Layout */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 md:mb-20 w-full flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/30 backdrop-blur-md rounded-[28px] border border-white/40 shadow-sm mb-8">
            <motion.div 
              animate={{ rotate: [0, 5, 0, -5, 0] }} 
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
              className="w-14 h-14 md:w-16 md:h-16 rounded-[20px] bg-gradient-to-br from-rose-400 to-amber-200 flex items-center justify-center shadow-lg shadow-rose-200"
            >
              <FileSpreadsheet className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={2} />
            </motion.div>
          </div>
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black text-slate-900 tracking-tighter leading-none w-full">AIGrande</h1>
          <p className="mt-4 text-lg sm:text-xl font-medium text-slate-500 tracking-wide uppercase opacity-70">Professional AI Grading Assistant</p>
        </motion.div>

        {/* Steps Logic */}
        <div className="w-full max-w-3xl mx-auto relative z-10">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <UploadStep isProcessing={isProcessing} error={error} onUpload={handleFileUpload} onButtonClick={() => fileInputRef.current?.click()} fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>} />
            )}
            {step === 'select-sheet' && (
              <SheetSelectionStep availableSheets={availableSheets} fileName={fileName} error={error} isProcessing={isProcessing} onSelectSheet={async (id, name) => {
                  setSelectedSheetName(name); setSelectedSheetId(id);
                  setError(null);
                  setIsProcessing(true);
                  try {
                    const sample = await extractSheetSample(id);
                    if (sample) {
                      const suggestedMapping = await autoDetectMapping(sample.slice(0, 10));
                      if (suggestedMapping) {
                        // Crucial: Update each state individually
                        setSelectedIdCol(suggestedMapping.idCol);
                        setSelectedNameCol(suggestedMapping.nameCol);
                        setSelectedScoreCol(suggestedMapping.scoreCol);
                        setSelectedLevelCol(suggestedMapping.levelCol);
                        setSelectedRemarkCol(suggestedMapping.remarkCol);
                        setHeaderRowIndex(suggestedMapping.headerRow);
                        if (suggestedMapping.dataRowStart) {
                          setDataRowStart(suggestedMapping.dataRowStart);
                        }

                        // AUTO-CONFIRM: If heuristics are confident (>= 60%), skip mapping screen
                        if ((suggestedMapping.confidence || 0) >= 60) {
                          setMappingConfig(suggestedMapping);
                          await processWorksheet(
                            id,
                            suggestedMapping.headerRow,
                            suggestedMapping.idCol,
                            suggestedMapping.nameCol,
                            suggestedMapping.scoreCol,
                            suggestedMapping.levelCol,
                            suggestedMapping.remarkCol,
                            suggestedMapping.dataRowStart
                          );                          setStep('success');
                          return;
                        }
                      } else {
                        setError("Hệ thống không tự động nhận diện được cột. Vui lòng tự chọn bằng tay.");
                      }
                    }
                  } catch (e: unknown) {
                    console.error("Selection Flow Error:", e);
                    setError("Lỗi khi phân tích dữ liệu: " + (e instanceof Error ? e.message : "Hãy kiểm tra định dạng file"));
                  } finally {
                    setIsProcessing(false);
                  }
                  setStep('map-columns');
              }} onReset={resetFlow} />
            )}
            {step === 'map-columns' && (
              <>
                <ColumnMappingStep 
                  selectedSheetName={selectedSheetName} totalColumns={totalColumns} 
                  selectedIdCol={selectedIdCol} setSelectedIdCol={setSelectedIdCol}
                  selectedNameCol={selectedNameCol} setSelectedNameCol={setSelectedNameCol}
                  selectedScoreCol={selectedScoreCol} setSelectedScoreCol={setSelectedScoreCol}
                  selectedLevelCol={selectedLevelCol} setSelectedLevelCol={setSelectedLevelCol}
                  selectedRemarkCol={selectedRemarkCol} setSelectedRemarkCol={setSelectedRemarkCol}
                  headerRowIndex={headerRowIndex} setHeaderRowIndex={setHeaderRowIndex}
                  dataRowStart={dataRowStart} setDataRowStart={setDataRowStart}
                  sheetSampleData={sheetSampleData} getColumnLetter={getColumnLetter}
                  error={error} onBack={() => setStep('select-sheet')}
                  onConfirm={() => processWorksheet(selectedSheetId, headerRowIndex, selectedIdCol, selectedNameCol, selectedScoreCol, selectedLevelCol, selectedRemarkCol, dataRowStart)}
                  isProcessing={isProcessing}
                  onShowRemarkConfig={() => setShowRemarkConfig(true)}
                  remarkRulesCount={remarkRules.length}
                />
                <AnimatePresence>
                  {showRemarkConfig && (
                    <RemarkConfigModal 
                      remarkRules={remarkRules}
                      setRemarkRules={setRemarkRules}
                      onClose={() => setShowRemarkConfig(false)}
                    />
                  )}
                </AnimatePresence>
              </>
            )}
            {step === 'success' && (
              <SuccessStep 
                fileName={fileName} selectedSheetName={selectedSheetName} students={students} 
                backendExcelFilename={backendExcelFilename} onShowRoster={() => setShowRosterModal(true)}
                onStartScanning={() => setStep('scan')} onExportJson={handleExport}
                onBackToMap={() => setStep('map-columns')} 
                onBackToSelectSheet={() => setStep('select-sheet')}
                onReset={resetFlow}
                onDownload={handleDownload}
                hasSheets={availableSheets.length > 1} hasScores={students.some(s => s.score != null)}
                isProcessing={isProcessing}
              />
            )}
            {step === 'scan' && (
              <>
                <ScanningStep 
                  scannedImagesCount={scannedImages.length} 
                  studentsWithScoresCount={students.filter(s => s.score !== null && s.score !== undefined && s.score !== '' && isFinite(Number(s.score))).length}
                  isProcessing={isProcessing}
                  batchProgress={batchProgress}
                  onCameraClick={() => cameraInputRef.current?.click()}
                  onGalleryClick={() => galleryInputRef.current?.click()}
                  onShowGallery={() => setShowImageGallery(true)}
                  onShowRemarkConfig={() => setShowRemarkConfig(true)}
                  onClearData={clearScannedData} onBack={() => setStep('success')}
                  backendExcelFilename={backendExcelFilename}
                  expectedSubject={selectedSheetName}
                  cameraInputRef={cameraInputRef as React.RefObject<HTMLInputElement>} galleryInputRef={galleryInputRef as React.RefObject<HTMLInputElement>}
                  onImageCapture={handleImageCapture}
                  onDownload={handleDownload}
                  onMobileScanResult={handleMobileScanResult}
                />

                <AnimatePresence>
                  {showRemarkConfig && (
                    <RemarkConfigModal 
                      remarkRules={remarkRules}
                      setRemarkRules={setRemarkRules}
                      onClose={() => setShowRemarkConfig(false)}
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Modals & UI Overlays */}
        <AnimatePresence>{showRosterModal && (
          <RosterModal 
            students={students} 
            sheetName={selectedSheetName} 
            onClose={() => setShowRosterModal(false)} 
            onExport={handleExport}
            onUpdateStudent={handleUpdateStudent}
          />
        )}</AnimatePresence>
        <AnimatePresence>{showImageGallery && <ImageGalleryModal images={scannedImages} onClose={() => setShowImageGallery(false)} onDelete={(keys) => {
          setScannedImages(prev => prev.filter(img => !keys.includes(img.key)));
          setProcessedFiles(prev => prev.filter(key => !keys.includes(key)));
        }} />}</AnimatePresence>
        <AnimatePresence>{mismatchData && <MismatchModal data={mismatchData} onClose={() => setMismatchData(null)} />}</AnimatePresence>
      </div>
      <SuccessToast show={showSuccessToast} studentNames={lastMatchedStudent} count={excelUpdateCount} />
    </Layout>
  );
}

export default App;
