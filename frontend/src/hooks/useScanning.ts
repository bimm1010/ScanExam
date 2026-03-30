import { useState, useRef, useCallback } from 'react';
import type { ScanResult, StudentData, MappingConfig, MismatchData, RemarkRule } from '../types';
import { compressImage } from '../utils/image';

interface UseScanningProps {
  selectedSheetName: string | null;
  backendExcelFilename: string | null;
  mappingConfig: MappingConfig | null;
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  processedFiles: string[];
  setProcessedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  setScannedImages: React.Dispatch<React.SetStateAction<{key: string, url: string}[]>>;
  setExcelUpdateCount: React.Dispatch<React.SetStateAction<number>>;
  setShowSuccessToast: React.Dispatch<React.SetStateAction<boolean>>;
  setLastMatchedStudent: React.Dispatch<React.SetStateAction<string | null>>;
  setMismatchData: React.Dispatch<React.SetStateAction<MismatchData | null>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  remarkRules: RemarkRule[];
  }

export const useScanning = ({
  selectedSheetName,
  backendExcelFilename,
  mappingConfig,
  students,
  setStudents,
  processedFiles,
  setProcessedFiles,
  setScannedImages,
  setExcelUpdateCount,
  setShowSuccessToast,
  setLastMatchedStudent,
  setMismatchData,
  isProcessing,
  setIsProcessing,
  setError,
  remarkRules
}: UseScanningProps) => {
  const [batchProgress, setBatchProgress] = useState<{ total: number; current: number }>({ total: 0, current: 0 });
  const pendingQueueRef = useRef<File[]>([]);

  // Refs to break stale closure — processBatch always reads latest values
  const selectedSheetNameRef = useRef(selectedSheetName);
  selectedSheetNameRef.current = selectedSheetName;
  const backendExcelFilenameRef = useRef(backendExcelFilename);
  backendExcelFilenameRef.current = backendExcelFilename;
  const mappingConfigRef = useRef(mappingConfig);
  mappingConfigRef.current = mappingConfig;
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const remarkRulesRef = useRef(remarkRules);
  remarkRulesRef.current = remarkRules;

  // Success = no mismatch found in the entire processing run
  const processBatch = async (batch: File[]): Promise<boolean> => {
    if (batch.length === 0) return true;
    console.log(`🚀 [useScanning] Starting processBatch with ${batch.length} files`);
    let allGood = true;

    try {
      const imagePromises = batch.map(file => compressImage(file, 1600, 1600, 0.7));
      const imageDatas = await Promise.all(imagePromises);

      const response = await fetch(`/api/process-test-paper/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data_list: imageDatas,
          expected_subject: selectedSheetNameRef.current,
          excel_filename: backendExcelFilenameRef.current,
          mapping_config: mappingConfigRef.current,
          remark_rules: remarkRulesRef.current,
          roster: studentsRef.current.map((s, idx) => ({ 
            id: s.id, 
            name: s.name,
            stt: idx + 1
          }))
        }),
      });

      if (!response.ok) throw new Error('Hệ thống đang bận, vui lòng thử lại sau giây lát.');

      const results: (ScanResult & { mismatch?: boolean })[] = await response.json();
      const resultsArray = Array.isArray(results) ? results : [results];

      console.log(`✅ [useScanning] Received ${resultsArray.length} results from backend`);

      resultsArray.forEach((data, index) => {
        const file = batch[index];
        const serverImageUrl = data.imageUrl ? `/media${data.imageUrl.replace('/media', '')}` : null;

        if (data.mismatch) {
          allGood = false;
          setMismatchData({
            originalKey: `${file.name}-${file.size}`,
            fileName: file.name,
            detectedSubject: data.subject || "Chưa rõ",
            expectedSubject: selectedSheetName || "Môn hiện tại"
          });
          setScannedImages(prev => prev.filter(i => i.key !== `${file.name}-${file.size}`));
          setProcessedFiles(prev => prev.filter(k => k !== `${file.name}-${file.size}`));
        } else {
          if (data.excelUpdated) {
            setExcelUpdateCount(prev => prev + 1);
            setShowSuccessToast(true);
            setLastMatchedStudent(data.studentName || 'Học sinh');
            setTimeout(() => setShowSuccessToast(false), 3000);
          }
          if (serverImageUrl) {
            setScannedImages(prev => prev.map(img => 
              img.key === `${file.name}-${file.size}` ? { ...img, url: serverImageUrl } : img
            ));
          }

          const parsedScore = data.score !== null && data.score !== undefined && data.score !== ''
            ? Number(data.score)
            : null;
          if (data.studentId && parsedScore !== null && isFinite(parsedScore)) {
            setStudents(prev => prev.map(s => {
              if (String(s.id) === String(data.studentId)) {
                return {
                  ...s,
                  score: parsedScore,
                  level: data.level,
                  remark: data.remark || s.remark,
                  subject: data.subject || s.subject
                };
              }
              return s;
            }));
          }
        }
      });

      setBatchProgress(prev => ({ ...prev, current: prev.current + batch.length }));
      return allGood;
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ [useScanning] Batch error:", error);
      setError(`Lỗi khi xử lý đợt bài thi: ${error.message}`);
      return false;
    }
  };

  // Core logic: enqueue files for processing
  const enqueueFiles = (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setProcessedFiles(prev => [...prev, ...newFiles.map(f => `${f.name}-${f.size}`)]);
    const newPreviews = newFiles.map(f => ({ key: `${f.name}-${f.size}`, url: URL.createObjectURL(f) }));
    setScannedImages(prev => [...prev, ...newPreviews]);
    setError(null);

    const updatedQueue = [...pendingQueueRef.current, ...newFiles];
    pendingQueueRef.current = updatedQueue;

    console.log(`⚡ [useScanning] Enqueued ${newFiles.length} files, total: ${updatedQueue.length}`);
    forceFlushPending();
  };

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    console.log(`📥 [useScanning] handleImageCapture: ${fileList.length} files`);
    const newFiles: File[] = [];
    const duplicates: string[] = [];

    fileList.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      if (processedFiles.includes(fileKey)) duplicates.push(file.name);
      else newFiles.push(file);
    });

    if (duplicates.length > 0) {
      alert(`Lưu ý: Các ảnh sau đã được quét rồi nên hệ thống sẽ bỏ qua:\n- ${duplicates.join('\n- ')}`);
    }

    enqueueFiles(newFiles);
    if (event.target) event.target.value = '';
  };

  // Called by App.tsx when mobile phone sends an image via WebSocket
  const handleMobileFile = useCallback((file: File) => {
    console.log('📱 [useScanning] Mobile file received:', file.name, file.size);
    enqueueFiles([file]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forceFlushPending = async (): Promise<boolean> => {
    // If already processing, we don't start a NEW worker.
    // The current worker's loop will pick up any newly added items in pendingQueueRef.
    if (isProcessing) {
      console.log("⏳ [useScanning] Already processing, loop will continue...");
      // For external callers (like "Download"), we still need to wait for full drain
      while (isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return true; // We assume the ongoing worker succeeded or handled its errors
    }

    let overallSuccess = true;
    setIsProcessing(true);

    try {
      // Loop while there are items to process (Queue Worker Pattern 🏃‍♂️)
      while (pendingQueueRef.current.length > 0) {
        const toProcess = [...pendingQueueRef.current];
        const currentCount = toProcess.length;
        console.log(`🏃‍♂️ [useScanning] Worker picking up ${currentCount} images...`);
        
        // Clear queue before processing so new additions don't get lost
        pendingQueueRef.current = [];
        
        setBatchProgress(prev => ({ 
          total: prev.total > 0 ? prev.total + currentCount : currentCount, 
          current: prev.current 
        }));
        
        // Process in chunks of 3 for concurrent performance while providing real-time progress update
        const CHUNK_SIZE = 3;
        for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
          const chunk = toProcess.slice(i, i + CHUNK_SIZE);
          const promises = chunk.map(file => processBatch([file]));
          const results = await Promise.all(promises);
          if (results.some(r => !r)) overallSuccess = false;
        }
      }
    } finally {
      setIsProcessing(false);
      setBatchProgress({ total: 0, current: 0 });
      console.log("🏁 [useScanning] All pending images processed.");
    }

    return overallSuccess;
  };

  const handleMobileScanResult = (text: string) => {
    console.log("📱 [useScanning] Received OCR text:", text);
    
    // Fuzzy match student ID or Name
    let matchedStudent = null;
    for (const s of students) {
      if (s.id && text.toLowerCase().includes(String(s.id).toLowerCase())) {
        matchedStudent = s;
        break;
      }
    }
    
    // If no ID match, try Name match (basic includes)
    if (!matchedStudent) {
      for (const s of students) {
        if (s.name && text.toLowerCase().includes(String(s.name).toLowerCase())) {
          matchedStudent = s;
          break;
        }
      }
    }

    if (matchedStudent) {
      // Find possible score: looks for numbers between 0-10 or 10.0
      // Extract all numbers
      const numberMatches = text.match(/(?:10(?:\.0+)?|\d(?:\.\d+)?)/g);
      let finalScore = null;
      
      if (numberMatches) {
        // Try to find the number closest to "Điểm" or just pick the last valid number
        const scores = numberMatches.map(n => parseFloat(n)).filter(n => n >= 0 && n <= 10);
        if (scores.length > 0) {
          finalScore = scores[scores.length - 1]; // Assume the last valid number is the score
        }
      }

      if (finalScore !== null) {
        console.log(`✅ [useScanning] Matched: ${matchedStudent.name} - Score: ${finalScore}`);
        setStudents(prev => prev.map(s => 
          s.id === matchedStudent.id ? { ...s, score: finalScore, subject: selectedSheetName || s.subject } : s
        ));
        
        setExcelUpdateCount(prev => prev + 1);
        setShowSuccessToast(true);
        setLastMatchedStudent(matchedStudent.name || String(matchedStudent.id));
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        setError(`Đã nhận dạng được ${matchedStudent.name} nhưng không tìm thấy điểm hợp lệ.`);
      }
    } else {
      setError("Không khớp được mã học sinh hoặc tên học sinh từ ảnh chụp điện thoại.");
    }
  };

  return {
    batchProgress,
    handleImageCapture,
    handleMobileFile,
    forceFlushPending,
    handleMobileScanResult
  };
};
