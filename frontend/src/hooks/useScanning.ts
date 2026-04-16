import { useState, useRef, useCallback, useEffect } from 'react';
import type { StudentData, MappingConfig, RemarkRule } from '../types';
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
  setMismatchData: React.Dispatch<React.SetStateAction<any>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  remarkRules: RemarkRule[];
}

export const useScanning = ({
  selectedSheetName,
  backendExcelFilename,
  mappingConfig,
  setStudents,
  setProcessedFiles,
  setScannedImages,
  setExcelUpdateCount,
  setShowSuccessToast,
  setLastMatchedStudent,
  setIsProcessing,
  setError,
  remarkRules
}: UseScanningProps) => {
  const [batchProgress, setBatchProgress] = useState<{ total: number; current: number }>({ total: 0, current: 0 });
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);
  const pendingQueueRef = useRef<File[]>([]);
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  // --- WEBSOCKET REAL-TIME (Ý tưởng của Đại Ca) ---
  useEffect(() => {
    const sessionId = window.location.pathname.split('/').pop() || 'default';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/scan/${sessionId}/`;
    
    console.log(`🔌 [WebSocket] Đang kết nối: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 [WebSocket] Nhận tin:', data);

      if (data.type === 'ai_status') {
        setAiStatusMsg(data.payload.msg);
        if (data.payload.status === 'analyzing') setIsProcessing(true);
        if (data.payload.status === 'error') {
            setIsProcessing(false);
            setAiStatusMsg(null);
        }
      }

      if (data.type === 'ai_result') {
        const res = data.payload;
        if (res.studentId) {
          setStudents(prev => prev.map(s => {
            if (String(s.id) === String(res.studentId)) {
              return { ...s, score: res.score, level: res.level, remark: res.remark || s.remark };
            }
            return s;
          }));
          
          setExcelUpdateCount(prev => prev + 1);
          setLastMatchedStudent(res.studentName || 'Học sinh');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
          
          // Thêm ảnh vào gallery
          const key = `mobile_${Date.now()}`;
          setScannedImages(prev => [...prev, { key, url: res.image }]);
        }
        setIsProcessing(false);
        setAiStatusMsg(null);
      }
    };

    ws.onclose = () => console.log('🔌 [WebSocket] Đã ngắt kết nối.');
    return () => ws.close();
  }, [setStudents, setIsProcessing, setExcelUpdateCount, setLastMatchedStudent, setShowSuccessToast, setScannedImages]);

  // Safe refs for latest state
  const selectedSheetNameRef = useRef(selectedSheetName);
  const backendExcelFilenameRef = useRef(backendExcelFilename);
  const mappingConfigRef = useRef(mappingConfig);
  const remarkRulesRef = useRef(remarkRules);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    selectedSheetNameRef.current = selectedSheetName;
    backendExcelFilenameRef.current = backendExcelFilename;
    mappingConfigRef.current = mappingConfig;
    remarkRulesRef.current = remarkRules;
  }, [selectedSheetName, backendExcelFilename, mappingConfig, remarkRules]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  const processBatch = async (file: File): Promise<boolean> => {
    console.log(`🚀 [AI Engine] Đang xử lý ảnh: ${file.name}`);
    try {
      const imageData = await compressImage(file, 1600, 1600, 0.75);
      const response = await fetch(`/api/process-test-paper/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data_list: [imageData],
          expected_subject: selectedSheetNameRef.current,
          excel_filename: backendExcelFilenameRef.current,
          mapping_config: mappingConfigRef.current,
          remark_rules: remarkRulesRef.current,
          roster: []
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'AI Error');

      const resultsArray = Array.isArray(resData) ? resData : [resData];
      resultsArray.forEach((data) => {
        if (data.studentId) {
            setStudents(prev => prev.map(s => {
                if (String(s.id) === String(data.studentId)) {
                    return { ...s, score: data.score, level: data.level, remark: data.remark || s.remark };
                }
                return s;
            }));
            
            if (data.excelUpdated) {
                setExcelUpdateCount(prev => prev + 1);
                setLastMatchedStudent(data.studentName || 'Học sinh');
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        }
      });

      setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const forceFlushPending = useCallback(async (): Promise<boolean> => {
    // SYNC LOCK
    if (isProcessingRef.current) return true;
    
    let overallSuccess = true;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // ATOMIC DRAIN: Take from front of queue one by one
      while (pendingQueueRef.current.length > 0) {
        const file = pendingQueueRef.current.shift(); // Remove from queue atomically
        if (file) {
          setBatchProgress(prev => ({ 
            total: prev.total > 0 ? prev.total : pendingQueueRef.current.length + 1, 
            current: prev.current 
          }));
          const ok = await processBatch(file);
          if (!ok) overallSuccess = false;
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setBatchProgress({ total: 0, current: 0 });
    }
    return overallSuccess;
  }, [setIsProcessing, setStudents, setExcelUpdateCount, setShowSuccessToast, setLastMatchedStudent, setError]);

  const enqueueFiles = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;
    
    console.log(`📥 [Hàng đợi] Thêm ${newFiles.length} ảnh.`);
    
    newFiles.forEach(f => {
        const key = `${f.name}-${f.size}`;
        const url = URL.createObjectURL(f);
        previewUrlsRef.current.set(key, url);
        setScannedImages(prev => [...prev, { key, url }]);
        setProcessedFiles(prev => [...prev, key]);
        pendingQueueRef.current.push(f); // Push to queue
    });
    
    forceFlushPending();
  }, [setProcessedFiles, setScannedImages, forceFlushPending]);

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    enqueueFiles(Array.from(files));
    if (event.target) event.target.value = '';
  };

  const handleMobileFile = useCallback((file: File) => {
    enqueueFiles([file]);
  }, [enqueueFiles]);

  return {
    batchProgress,
    aiStatusMsg,
    handleImageCapture,
    handleMobileFile,
    forceFlushPending,
    handleMobileScanResult: () => {}
  };
};
