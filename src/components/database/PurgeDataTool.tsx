import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, Filter, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseService } from '@/database';
import { MarkdownDocument } from '@/types';

interface PurgeDataToolProps {
  onRefresh: () => void;
}

interface FilterOptions {
  dateFrom?: Date;
  dateTo?: Date;
  mode?: 'markdown' | 'mermaid' | 'plantuml' | 'all';
  searchTerm?: string;
}

const PurgeDataTool: React.FC<PurgeDataToolProps> = ({ onRefresh }) => {
  const [documents, setDocuments] = useState<MarkdownDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    mode: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Date filter
    if (filters.dateFrom && doc.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && doc.createdAt > filters.dateTo) return false;
    
    // Mode filter
    if (filters.mode !== 'all' && (doc.mode || 'markdown') !== filters.mode) return false;
    
    // Search filter
    if (filters.searchTerm && !doc.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

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

  const handleDateRangeSelect = (months: number) => {
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const toDate = new Date(now.getFullYear(), now.getMonth(), 0);
    
    setFilters({
      ...filters,
      dateFrom: fromDate,
      dateTo: toDate
    });

    // Auto-select documents in this range
    const docsInRange = filteredDocuments.filter(doc => 
      doc.createdAt >= fromDate && doc.createdAt <= toDate
    );
    const idsInRange = new Set(docsInRange.map(doc => doc.id));
    setSelectedDocuments(idsInRange);
  };

  const handlePurge = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      setIsDeleting(true);
      
      // Delete selected documents
      for (const docId of selectedDocuments) {
        await DatabaseService.deleteDocument(docId);
      }

      // Refresh data
      await loadDocuments();
      setSelectedDocuments(new Set());
      setShowConfirmation(false);
      onRefresh();
      
      toast.success(`ลบเอกสาร ${selectedDocuments.size} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error('เกิดข้อผิดพลาดในการลบเอกสาร');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    try {
      if (!date) {
        return 'ไม่ระบุวันที่';
      }
      
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          ล้างข้อมูลเอกสาร
        </h3>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Filter className="w-4 h-4" />
          ตัวกรองข้อมูล
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ค้นหาชื่อเอกสาร
            </label>
            <input
              type="text"
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="พิมพ์ชื่อเอกสาร..."
            />
          </div>

          {/* Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ประเภทเอกสาร
            </label>
            <select
              value={filters.mode}
              onChange={(e) => setFilters({ ...filters, mode: e.target.value as any })}
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
              value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters({ 
                ...filters, 
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
              value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                dateTo: e.target.value ? new Date(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Quick Date Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">เลือกช่วงเวลา:</span>
          <button
            onClick={() => handleDateRangeSelect(1)}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            เดือนที่แล้ว
          </button>
          <button
            onClick={() => handleDateRangeSelect(3)}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            3 เดือนที่แล้ว
          </button>
          <button
            onClick={() => handleDateRangeSelect(6)}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            6 เดือนที่แล้ว
          </button>
          <button
            onClick={() => handleDateRangeSelect(12)}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            1 ปีที่แล้ว
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              เลือกแล้ว: {selectedDocuments.size} รายการ
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
                    <span>แก้ไขล่าสุด: {formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDocuments.size > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ⚠️ การลบข้อมูลไม่สามารถย้อนกลับได้
            </span>
          )}
        </div>
        <button
          onClick={() => setShowConfirmation(true)}
          disabled={selectedDocuments.size === 0}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          ลบเอกสารที่เลือก ({selectedDocuments.size})
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ยืนยันการลบข้อมูล
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              คุณต้องการลบเอกสาร <strong>{selectedDocuments.size}</strong> รายการใช่หรือไม่? 
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handlePurge}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    ยืนยันการลบ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurgeDataTool;