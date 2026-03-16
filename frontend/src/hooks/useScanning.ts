import { useState, useRef, useEffect } from 'react';
import type { ScanResult, StudentData, MappingConfig, MismatchData } from '../types';
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
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
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
  error,
  setError
}: UseScanningProps) => {
  const [batchProgress, setBatchProgress] = useState<{ total: number; current: number }>({ total: 0, current: 0 });
  const [pendingQueue, setPendingQueue] = useState<File[]>([]);
  const pendingQueueRef = useRef<File[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    pendingQueueRef.current = pendingQueue;
  }, [pendingQueue]);

  const processBatch = async (batch: File[]) => {
    console.log(`🚀 [useScanning] Starting processBatch with ${batch.length} files`);
    const apiHost = window.location.hostname;
    try {
      const imagePromises = batch.map(file => compressImage(file, 1600, 1600, 0.7));
      const imageDatas = await Promise.all(imagePromises);

      const response = await fetch(`http://${apiHost}:8000/api/process-test-paper/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data_list: imageDatas,
          expected_subject: selectedSheetName,
          excel_filename: backendExcelFilename,
          mapping_config: mappingConfig,
          roster: students.map((s, idx) => ({ 
            id: s.id, 
            name: s.name,
            stt: idx + 1
          }))
        }),
      });

      if (!response.ok) throw new Error('Cầu truyền hình Gemini đang bận, Đại Ca thử lại nhé!');

      const results: (ScanResult & { mismatch?: boolean })[] = await response.json();
      const resultsArray = Array.isArray(results) ? results : [results];

      console.log(`✅ [useScanning] Received ${resultsArray.length} results from backend`);

      resultsArray.forEach((data, index) => {
        const file = batch[index];
        const serverImageUrl = data.imageUrl ? `http://${apiHost}:8000${data.imageUrl}` : null;

        if (data.mismatch) {
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

          if (data.studentId && data.score !== null) {
            setStudents(prev => prev.map(s => {
              if (String(s.id) === String(data.studentId)) {
                return { ...s, score: data.score, level: data.level, subject: data.subject || s.subject };
              }
              return s;
            }));
          }
        }
      });

      setBatchProgress(prev => ({ ...prev, current: prev.current + batch.length }));
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ [useScanning] Batch error:", error);
      setError(`Lỗi khi xử lý đợt bài thi: ${error.message}`);
    }
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
      if (processedFiles.includes(fileKey)) {
        duplicates.push(file.name);
      } else {
        newFiles.push(file);
      }
    });

    if (duplicates.length > 0) {
      alert(`Cô giáo lưu ý: Các ảnh sau đã được quét rồi nên em sẽ bỏ qua nhé:\n- ${duplicates.join('\n- ')}`);
    }

    if (newFiles.length === 0) {
      if (event.target) event.target.value = '';
      return;
    }

    // Prepare previews immediately for UX
    setProcessedFiles(prev => [...prev, ...newFiles.map(f => `${f.name}-${f.size}`)]);
    const newPreviews = newFiles.map(f => ({
      key: `${f.name}-${f.size}`,
      url: URL.createObjectURL(f)
    }));
    setScannedImages(prev => [...prev, ...newPreviews]);
    setError(null);

    // Add to pending queue
    const updatedQueue = [...pendingQueue, ...newFiles];
    console.log(`📊 [useScanning] Pending Queue size: ${updatedQueue.length}`);
    
    // Batch processing (groups of 5)
    const BATCH_SIZE = 5;
    if (updatedQueue.length >= BATCH_SIZE) {
      setIsProcessing(true);
      const toProcess = updatedQueue.slice(0, BATCH_SIZE);
      const remaining = updatedQueue.slice(BATCH_SIZE);
      
      setPendingQueue(remaining);
      setBatchProgress({ total: BATCH_SIZE, current: 0 });
      
      await processBatch(toProcess);
      
      setIsProcessing(false);
      setBatchProgress({ total: 0, current: 0 });
    } else {
      setPendingQueue(updatedQueue);
    }

    if (event.target) event.target.value = '';
  };

  const forceFlushPending = async () => {
    const currentQueue = pendingQueueRef.current;
    console.log(`⚡ [useScanning] forceFlushPending called. Queue size (ref): ${currentQueue.length}, isProcessing: ${isProcessing}`);
    
    if (currentQueue.length === 0 || isProcessing) {
      console.log("⏭️ [useScanning] Skipping flush (queue empty or already processing)");
      return;
    }

    setIsProcessing(true);
    setBatchProgress({ total: currentQueue.length, current: 0 });
    
    const toProcess = [...currentQueue];
    setPendingQueue([]); // Clear state
    pendingQueueRef.current = []; // Clear ref immediately
    
    await processBatch(toProcess);
    
    setIsProcessing(false);
    setBatchProgress({ total: 0, current: 0 });
    console.log("🏁 [useScanning] forceFlushPending finished");
  };

  return {
    batchProgress,
    handleImageCapture,
    forceFlushPending
  };


};
