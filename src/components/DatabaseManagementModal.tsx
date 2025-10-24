import React, { useState, useEffect } from 'react';
import { X, Database, Trash2, Download, Upload, FileText, Calendar, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseService } from '@/database';
import { MarkdownDocument } from '@/types';
import PurgeDataTool from './database/PurgeDataTool';
import BackupExportTool from './database/BackupExportTool';
import ImportRestoreTool from './database/ImportRestoreTool';

interface DatabaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DatabaseStats {
  totalDocuments: number;
  totalSize: number;
  oldestDocument?: Date;
  newestDocument?: Date;
}

type ActiveTool = 'dashboard' | 'purge' | 'backup' | 'import';

const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTool, setActiveTool] = useState<ActiveTool>('dashboard');
  const [stats, setStats] = useState<DatabaseStats>({
    totalDocuments: 0,
    totalSize: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDatabaseStats();
    }
  }, [isOpen]);

  const loadDatabaseStats = async () => {
    try {
      setIsLoading(true);
      console.log('Loading database stats...');
      
      const documents = await DatabaseService.getAllDocuments();
      console.log('Documents loaded:', documents.length, documents);
      
      const totalSize = documents.reduce((sum, doc) => {
        const size = doc.content?.length || 0;
        return sum + size;
      }, 0);
      
      const dates = documents
        .map(doc => doc.createdAt)
        .filter(date => date instanceof Date && !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      console.log('Calculated stats:', {
        totalDocuments: documents.length,
        totalSize,
        dates: dates.length
      });
      
      setStats({
        totalDocuments: documents.length,
        totalSize,
        oldestDocument: dates.length > 0 ? dates[0] : undefined,
        newestDocument: dates.length > 0 ? dates[dates.length - 1] : undefined
      });
      
      console.log('Stats updated successfully');
    } catch (error) {
      console.error('Error loading database stats:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      toast.error('ไม่สามารถโหลดข้อมูลสถิติฐานข้อมูลได้: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              เครื่องมือจัดการฐานข้อมูล
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTool('dashboard')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTool === 'dashboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            แดชบอร์ด
          </button>
          <button
            onClick={() => setActiveTool('purge')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTool === 'purge'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            ล้างข้อมูล
          </button>
          <button
            onClick={() => setActiveTool('backup')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTool === 'backup'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            สำรองข้อมูล
          </button>
          <button
            onClick={() => setActiveTool('import')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTool === 'import'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            นำเข้าข้อมูล
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTool === 'dashboard' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                สถิติฐานข้อมูล
              </h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Documents */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          จำนวนเอกสาร
                        </p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {stats.totalDocuments.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Storage Size */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ขนาดข้อมูล
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatFileSize(stats.totalSize)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Oldest Document */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          เอกสารเก่าสุด
                        </p>
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                          {stats.oldestDocument ? formatDate(stats.oldestDocument) : 'ไม่มีข้อมูล'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Newest Document */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                          เอกสารใหม่สุด
                        </p>
                        <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                          {stats.newestDocument ? formatDate(stats.newestDocument) : 'ไม่มีข้อมูล'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tool Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div 
                  onClick={() => setActiveTool('purge')}
                  className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400 mb-3" />
                  <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">ล้างข้อมูล</h4>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ลบเอกสารที่ไม่ต้องการตามเงื่อนไขที่กำหนด
                  </p>
                </div>

                <div 
                  onClick={() => setActiveTool('backup')}
                  className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Download className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">สำรองข้อมูล</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ส่งออกข้อมูลเอกสารเพื่อสำรองหรือย้ายข้อมูล
                  </p>
                </div>

                <div 
                  onClick={() => setActiveTool('import')}
                  className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">นำเข้าข้อมูล</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    นำเข้าข้อมูลจากไฟล์สำรองเพื่อแทนที่ข้อมูลปัจจุบัน
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTool === 'purge' && (
            <PurgeDataTool onRefresh={loadDatabaseStats} />
          )}

          {activeTool === 'backup' && (
            <BackupExportTool />
          )}

          {activeTool === 'import' && (
            <ImportRestoreTool onRefresh={loadDatabaseStats} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagementModal;