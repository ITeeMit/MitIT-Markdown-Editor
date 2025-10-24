import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseService } from '@/database';
import { MarkdownDocument } from '@/types';

interface ImportRestoreToolProps {
  onRefresh: () => void;
}

interface ImportData {
  metadata: {
    exportDate: string;
    totalDocuments: number;
    exportType: string;
    version: string;
  };
  documents: MarkdownDocument[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  documentCount: number;
  duplicateCount: number;
}

const ImportRestoreTool: React.FC<ImportRestoreToolProps> = ({ onRefresh }) => {
  const [dragActive, setDragActive] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDocuments, setCurrentDocuments] = useState<MarkdownDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('กรุณาเลือกไฟล์ JSON เท่านั้น');
      return;
    }

    try {
      setIsValidating(true);
      const text = await file.text();
      const data = JSON.parse(text) as ImportData;
      
      // Load current documents for comparison
      const current = await DatabaseService.getAllDocuments();
      setCurrentDocuments(current);
      
      // Validate the imported data
      const validation = validateImportData(data, current);
      
      setImportData(data);
      setValidationResult(validation);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('ไฟล์ไม่ถูกต้องหรือเสียหาย');
    } finally {
      setIsValidating(false);
    }
  };

  const validateImportData = (data: ImportData, currentDocs: MarkdownDocument[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check structure
    if (!data.metadata || !data.documents) {
      errors.push('โครงสร้างไฟล์ไม่ถูกต้อง');
    }
    
    if (!Array.isArray(data.documents)) {
      errors.push('ข้อมูลเอกสารไม่ถูกต้อง');
    }
    
    // Check document validity
    let validDocuments = 0;
    let duplicateCount = 0;
    const currentTitles = new Set(currentDocs.map(doc => doc.title.toLowerCase()));
    
    if (data.documents) {
      data.documents.forEach((doc, index) => {
        // Support new and legacy fields via loose typing
        const title = (doc as any).title || (doc as any).FTMdcTitle;
        const content = (doc as any).content || (doc as any).FTMdcContent;
        
        if (!title || !content) {
          errors.push(`เอกสารที่ ${index + 1}: ขาดข้อมูลสำคัญ`);
        } else {
          validDocuments++;
          if (currentTitles.has(String(title).toLowerCase())) {
            duplicateCount++;
          }
        }
      });
    }
    
    // Warnings
    if (duplicateCount > 0) {
      warnings.push(`พบเอกสารที่มีชื่อซ้ำกับข้อมูลปัจจุบัน ${duplicateCount} รายการ`);
    }
    
    if (currentDocs.length > 0) {
      warnings.push(`ข้อมูลปัจจุบันจะถูกแทนที่ (${currentDocs.length} เอกสาร)`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      documentCount: validDocuments,
      duplicateCount
    };
  };

  const handleImport = async () => {
    if (!importData || !validationResult?.isValid) return;

    try {
      setIsImporting(true);
      
      // Clear existing data
      const existingDocs = await DatabaseService.getAllDocuments();
      for (const doc of existingDocs) {
        await DatabaseService.deleteDocument(doc.id);
      }
      
      // Import new data
      for (const raw of importData.documents) {
        const doc: any = raw as any;
        // Handle both new and legacy formats
        const title = doc.title || doc.FTMdcTitle;
        const content = doc.content || doc.FTMdcContent;
        const tags = doc.tags || doc.FTMdcTags || [];
        const mode = doc.mode || doc.FTMdcMode || 'markdown';
        const createdAt = doc.createdAt ? new Date(doc.createdAt) : (doc.FDMdcCreated ? new Date(doc.FDMdcCreated) : new Date());
        const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : (doc.FDMdcModified ? new Date(doc.FDMdcModified) : new Date());
        
        await DatabaseService.createDocument({
          title,
          content,
          tags,
          mode,
          createdAt,
          updatedAt
        });
      }
      
      // Reset state
      setImportData(null);
      setValidationResult(null);
      onRefresh();
      
      toast.success(`นำเข้าข้อมูล ${importData.documents.length} เอกสารเรียบร้อยแล้ว`);
      
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setImportData(null);
    setValidationResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    try {
      if (!date) return '-';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          นำเข้าข้อมูลเอกสาร
        </h3>
      </div>

      {!importData ? (
        <>
          {/* File Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              อัปโหลดไฟล์สำรองข้อมูล
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              ลากและวางไฟล์ JSON หรือคลิกเพื่อเลือกไฟล์
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              เลือกไฟล์
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              คำแนะนำการนำเข้าข้อมูล
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• รองรับเฉพาะไฟล์ JSON ที่ส่งออกจากระบบนี้เท่านั้น</li>
              <li>• ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลใหม่</li>
              <li>• แนะนำให้สำรองข้อมูลปัจจุบันก่อนนำเข้า</li>
              <li>• การดำเนินการนี้ไม่สามารถย้อนกลับได้</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* Validation Status */}
          {isValidating ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">กำลังตรวจสอบข้อมูล...</span>
            </div>
          ) : validationResult && (
            <div className="space-y-4">
              {/* Validation Results */}
              <div className={`
                border rounded-lg p-4
                ${validationResult.isValid 
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                }
              `}>
                <div className="flex items-center gap-2 mb-3">
                  {validationResult.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <h4 className={`font-medium ${
                    validationResult.isValid 
                      ? 'text-green-800 dark:text-green-300' 
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {validationResult.isValid ? 'ไฟล์ถูกต้อง' : 'พบข้อผิดพลาด'}
                  </h4>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">ข้อผิดพลาด:</p>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">คำเตือน:</p>
                    <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Import Summary */}
              {validationResult.isValid && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    สรุปข้อมูลที่จะนำเข้า
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">จำนวนเอกสาร:</span>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {validationResult.documentCount} รายการ
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">วันที่ส่งออก:</span>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatDate(importData.metadata.exportDate)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">ประเภท:</span>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {importData.metadata.exportType === 'full' ? 'ทั้งหมด' : 'เลือกเฉพาะ'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">เวอร์ชัน:</span>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {importData.metadata.version}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Button */}
              {validationResult.isValid && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่างข้อมูล'}
                  </button>
                </div>
              )}

              {/* Data Preview */}
              {showPreview && validationResult.isValid && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      ตัวอย่างเอกสารที่จะนำเข้า (แสดง 5 รายการแรก)
                    </h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {importData.documents.slice(0, 5).map((raw, index) => {
                      const doc: any = raw as any;
                      const title = doc.title || doc.FTMdcTitle || '(ไม่มีชื่อ)';
                      const content = doc.content || doc.FTMdcContent || '';
                      const mode = doc.mode || doc.FTMdcMode || 'markdown';
                      const created = doc.createdAt || doc.FDMdcCreated;
                      return (
                        <div
                          key={index}
                          className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <h5 className="font-medium text-gray-900 dark:text-white truncate">
                            {title}
                          </h5>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>ประเภท: {mode}</span>
                            <span>ขนาด: {formatFileSize(String(content).length)}</span>
                            <span>สร้างเมื่อ: {formatDate(created)}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                            {String(content).substring(0, 100)}...
                          </p>
                        </div>
                      );
                    })}
                    {importData.documents.length > 5 && (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        และอีก {importData.documents.length - 5} เอกสาร...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={resetImport}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  ยกเลิก
                </button>

                {validationResult.isValid && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        กำลังนำเข้า...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        ยืนยันการนำเข้า
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Final Warning */}
              {validationResult.isValid && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h4 className="font-medium text-red-800 dark:text-red-300">
                      คำเตือนสำคัญ
                    </h4>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    การนำเข้าข้อมูลจะลบข้อมูลปัจจุบันทั้งหมดและแทนที่ด้วยข้อมูลใหม่ 
                    การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImportRestoreTool;