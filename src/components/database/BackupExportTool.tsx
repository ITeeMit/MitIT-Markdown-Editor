import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { messageBox } from '@/utils/messageBox';
import { DatabaseService } from '@/database';
import { MarkdownDocument } from '@/types';

interface BackupExportToolProps {}

interface ExportOptions {
  type: 'full' | 'selective';
  dateFrom?: Date;
  dateTo?: Date;
  mode?: 'markdown' | 'mermaid' | 'plantuml' | 'all';
  selectedDocuments?: Set<string>;
}

interface ExportData {
  metadata: {
    exportDate: string;
    totalDocuments: number;
    exportType: string;
    version: string;
  };
  documents: MarkdownDocument[];
}

const BackupExportTool: React.FC<BackupExportToolProps> = () => {
  const [documents, setDocuments] = useState<MarkdownDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    type: 'full',
    mode: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const allDocuments = await DatabaseService.getAllDocuments();
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดเอกสาร');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Date filter (use numeric time comparisons for robustness)
    if (exportOptions.dateFrom && new Date(doc.createdAt).getTime() < exportOptions.dateFrom.getTime()) return false;
    if (exportOptions.dateTo && new Date(doc.createdAt).getTime() > exportOptions.dateTo.getTime()) return false;
    
    // Mode filter
    if (exportOptions.mode !== 'all' && (doc.mode || 'markdown') !== exportOptions.mode) return false;
    
    return true;
  });

  const documentsToExport = exportOptions.type === 'full' 
    ? filteredDocuments 
    : filteredDocuments.filter(doc => selectedDocuments.has(doc.id));

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      const allIds = new Set(filteredDocuments.map(doc => doc.id));
      setSelectedDocuments(allIds);
    }
  };

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleExport = async () => {
    if (documentsToExport.length === 0) {
      await messageBox.warning('ไม่มีเอกสารสำหรับส่งออก');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      // Simulate progress for user experience
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Prepare export data
      const exportData: ExportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalDocuments: documentsToExport.length,
          exportType: exportOptions.type,
          version: '1.0'
        },
        documents: documentsToExport
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const typeLabel = exportOptions.type === 'full' ? 'full' : 'selective';
      link.download = `markdown-editor-backup-${typeLabel}-${timestamp}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        toast.success(`ส่งออกข้อมูล ${documentsToExport.length} เอกสารเรียบร้อยแล้ว`);
      }, 500);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const formatDate = (date: Date | string | number | null | undefined): string => {
    try {
      if (!date) {
        return 'ไม่ระบุวันที่';
      }
      
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'วันที่ไม่ถูกต้อง';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'วันที่ไม่ถูกต้อง';
      }
      
      return dateObj.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'วันที่ไม่ถูกต้อง';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const estimatedFileSize = () => {
    const jsonSize = JSON.stringify(documentsToExport).length;
    return formatFileSize(jsonSize);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          สำรองข้อมูลเอกสาร
        </h3>
      </div>

      {/* Export Type Selection */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">
          ประเภทการสำรองข้อมูล
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
            <input
              type="radio"
              name="exportType"
              value="full"
              checked={exportOptions.type === 'full'}
              onChange={(e) => setExportOptions({ ...exportOptions, type: e.target.value as 'full' | 'selective' })}
              className="text-green-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                สำรองข้อมูลทั้งหมด
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ส่งออกเอกสารทั้งหมดในฐานข้อมูล
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
            <input
              type="radio"
              name="exportType"
              value="selective"
              checked={exportOptions.type === 'selective'}
              onChange={(e) => setExportOptions({ ...exportOptions, type: e.target.value as 'full' | 'selective' })}
              className="text-green-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                สำรองข้อมูลแบบเลือก
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                เลือกเอกสารเฉพาะที่ต้องการส่งออก
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Filters (for both types) */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">
          ตัวกรองข้อมูล
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ประเภทเอกสาร
            </label>
            <select
              value={exportOptions.mode}
              onChange={(e) => setExportOptions({ ...exportOptions, mode: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="markdown">Markdown</option>
              <option value="mermaid">Mermaid</option>
              <option value="plantuml">PlantUML</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={exportOptions.dateFrom ? exportOptions.dateFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => setExportOptions({ 
                ...exportOptions, 
                dateFrom: e.target.value ? new Date(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={exportOptions.dateTo ? exportOptions.dateTo.toISOString().split('T')[0] : ''}
              onChange={(e) => setExportOptions({ 
                ...exportOptions, 
                dateTo: e.target.value ? new Date(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Document Selection (for selective export) */}
      {exportOptions.type === 'selective' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  เลือกทั้งหมด ({filteredDocuments.length} รายการ)
                </span>
              </label>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                เลือกแล้ว: {selectedDocuments.size} รายการ
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                ไม่พบเอกสารที่ตรงกับเงื่อนไข
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(doc.id)}
                    onChange={() => handleSelectDocument(doc.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>ประเภท: {(doc.mode || 'markdown')}</span>
                      <span>ขนาด: {formatFileSize(doc.content?.length || 0)}</span>
                      <span>สร้างเมื่อ: {formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Export Summary */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          สรุปการส่งออก
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-green-600 dark:text-green-400 font-medium">จำนวนเอกสาร:</span>
            <div className="text-green-800 dark:text-green-300 font-bold">
              {documentsToExport.length} รายการ
            </div>
          </div>
          <div>
            <span className="text-green-600 dark:text-green-400 font-medium">ขนาดไฟล์ประมาณ:</span>
            <div className="text-green-800 dark:text-green-300 font-bold">
              {estimatedFileSize()}
            </div>
          </div>
          <div>
            <span className="text-green-600 dark:text-green-400 font-medium">ประเภท:</span>
            <div className="text-green-800 dark:text-green-300 font-bold">
              {exportOptions.type === 'full' ? 'ทั้งหมด' : 'เลือกเฉพาะ'}
            </div>
          </div>
          <div>
            <span className="text-green-600 dark:text-green-400 font-medium">รูปแบบ:</span>
            <div className="text-green-800 dark:text-green-300 font-bold">
              JSON
            </div>
          </div>
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="font-medium text-blue-800 dark:text-blue-300">
              กำลังส่งออกข้อมูล...
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            ></div>
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
            {exportProgress}% เสร็จสิ้น
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {documentsToExport.length > 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              พร้อมส่งออก {documentsToExport.length} เอกสาร
            </span>
          ) : (
            <span className="text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              ไม่มีเอกสารสำหรับส่งออก
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={documentsToExport.length === 0 || isExporting}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูล'}
        </button>
      </div>
    </div>
  );
};

export default BackupExportTool;