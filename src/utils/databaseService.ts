import { DatabaseService as DB } from '@/database';
import type { MarkdownDocument, AppSettings } from '@/types';

// Add optional legacy field support for import compatibility
interface LegacyMarkdownFields {
  FTMdcTitle?: string;
  FTMdcContent?: string;
  FTMdcTags?: string[] | string;
  FTMdcMode?: string;
  FDMdcCreated?: string | Date;
  FDMdcModified?: string | Date;
}

export interface DatabaseStats {
  totalDocuments: number;
  totalSize: number;
  oldestDocument: Date | null;
  newestDocument: Date | null;
  documentsByMode: Record<string, number>;
}

export interface ExportData {
  metadata: {
    exportDate: string;
    totalDocuments: number;
    exportType: 'full' | 'selective';
    version: string;
    appName: string;
  };
  documents: (MarkdownDocument & Partial<LegacyMarkdownFields>)[];
  settings?: AppSettings;
}

export class DatabaseToolkit {
  /**
   * Get comprehensive database statistics
   */
  static async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const documents = await DB.getAllDocuments();
      
      const stats: DatabaseStats = {
        totalDocuments: documents.length,
        totalSize: 0,
        oldestDocument: null,
        newestDocument: null,
        documentsByMode: {}
      };

      if (documents.length > 0) {
        // Calculate total size and find oldest/newest
        let oldestDate = new Date(documents[0].createdAt);
        let newestDate = new Date(documents[0].createdAt);

        documents.forEach(doc => {
          // Calculate size
          stats.totalSize += doc.content.length || 0;
          
          // Track document modes
          const mode = doc.mode || 'markdown';
          stats.documentsByMode[mode] = (stats.documentsByMode[mode] || 0) + 1;
          
          // Find oldest and newest dates
          const createdDate = new Date(doc.createdAt);
          if (createdDate < oldestDate) {
            oldestDate = createdDate;
          }
          if (createdDate > newestDate) {
            newestDate = createdDate;
          }
        });

        stats.oldestDocument = oldestDate;
        stats.newestDocument = newestDate;
      }

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error('ไม่สามารถดึงข้อมูลสถิติฐานข้อมูลได้');
    }
  }

  /**
   * Export all documents to JSON format
   */
  static async exportFullDatabase(): Promise<ExportData> {
    try {
      const documents = await DB.getAllDocuments();
      const settings = await DB.getSettings();

      const exportData: ExportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalDocuments: documents.length,
          exportType: 'full',
          version: '1.0.0',
          appName: 'MitIT Multi-Mode Editor'
        },
        documents,
        settings
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting database:', error);
      throw new Error('ไม่สามารถส่งออกฐานข้อมูลได้');
    }
  }

  /**
   * Export selected documents to JSON format
   */
  static async exportSelectedDocuments(documentIds: string[]): Promise<ExportData> {
    try {
      const allDocuments = await DB.getAllDocuments();
      const selectedDocuments = allDocuments.filter(doc => 
        documentIds.includes(doc.id)
      );

      const exportData: ExportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalDocuments: selectedDocuments.length,
          exportType: 'selective',
          version: '1.0.0',
          appName: 'MitIT Multi-Mode Editor'
        },
        documents: selectedDocuments,
        settings: await DB.getSettings()
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting selected documents:', error);
      throw new Error('ไม่สามารถส่งออกเอกสารที่เลือกได้');
    }
  }

  /**
   * Download data as JSON file
   */
  static downloadAsJSON(data: ExportData, filename?: string): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const defaultFilename = `markdown-editor-backup-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  }

  /**
   * Validate import data structure
   */
  static validateImportData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push('ข้อมูลไม่ถูกต้อง');
      return { isValid: false, errors };
    }

    // Check metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('ข้อมูล metadata ไม่ถูกต้อง');
    } else {
      const requiredMetadataFields = ['exportDate', 'totalDocuments', 'exportType', 'version'];
      for (const field of requiredMetadataFields) {
        if (!(field in data.metadata)) {
          errors.push(`ขาดข้อมูล metadata.${field}`);
        }
      }
    }

    // Check documents array
    if (!Array.isArray(data.documents)) {
      errors.push('ข้อมูลเอกสารต้องเป็น array');
    } else {
      // Validate each document
      data.documents.forEach((doc: any, index: number) => {
        // Check for new format first, then legacy format
        const hasNewFormat = 'title' in doc && 'content' in doc;
        const hasLegacyFormat = 'FTMdcTitle' in doc && 'FTMdcContent' in doc;
        
        if (!hasNewFormat && !hasLegacyFormat) {
          errors.push(`เอกสารที่ ${index + 1}: ขาดข้อมูลที่จำเป็น (title/content หรือ FTMdcTitle/FTMdcContent)`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Import data and replace existing database
   */
  static async importDatabase(data: ExportData, onProgress?: (progress: number) => void): Promise<void> {
    try {
      // Validate data first
      const validation = this.validateImportData(data);
      if (!validation.isValid) {
        throw new Error(`ข้อมูลไม่ถูกต้อง: ${validation.errors.join(', ')}`);
      }

      const totalSteps = data.documents.length + 1; // +1 for clearing existing data
      let currentStep = 0;

      // Clear existing documents
      const existingDocs = await DB.getAllDocuments();
      for (const doc of existingDocs) {
        await DB.deleteDocument(doc.id);
      }
      
      currentStep++;
      onProgress?.(Math.round((currentStep / totalSteps) * 100));

      // Import new documents
      for (const doc of data.documents) {
        // Handle both new and legacy formats
        const title = doc.title || doc.FTMdcTitle || 'Untitled';
        const content = doc.content || doc.FTMdcContent || '';
        const tags = ((): string[] => {
          if (Array.isArray(doc.tags)) return doc.tags;
          if (Array.isArray(doc.FTMdcTags)) return doc.FTMdcTags;
          if (typeof (doc as any).FTMdcTags === 'string') return (doc as any).FTMdcTags.split(',').map(s => s.trim()).filter(Boolean);
          return [];
        })();
        const mode: 'markdown' | 'mermaid' | 'plantuml' = (() => {
          const m = (doc.mode as any) || (doc.FTMdcMode as any) || 'markdown';
          return m === 'mermaid' || m === 'plantuml' ? m : 'markdown';
        })();
        const createdAt = doc.createdAt ? new Date(doc.createdAt) : (doc.FDMdcCreated ? new Date(doc.FDMdcCreated as any) : new Date());
        const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : (doc.FDMdcModified ? new Date(doc.FDMdcModified as any) : new Date());
        
        await DB.createDocument({
          title,
          content,
          tags,
          mode,
          createdAt,
          updatedAt
        });
        
        currentStep++;
        onProgress?.(Math.round((currentStep / totalSteps) * 100));
      }

      // Import settings if available
      if (data.settings) {
        const settingsData: Partial<AppSettings> = Array.isArray(data.settings)
          ? Object.assign({}, ...data.settings)
          : data.settings;
        await DB.updateSettings(settingsData);
      }

    } catch (error) {
      console.error('Error importing database:', error);
      throw new Error(`ไม่สามารถนำเข้าข้อมูลได้: ${error instanceof Error ? error.message : 'ข้อผิดพลาดไม่ทราบสาเหตุ'}`);
    }
  }

  /**
   * Get documents by date range
   */
  static async getDocumentsByDateRange(startDate: Date, endDate: Date): Promise<MarkdownDocument[]> {
    try {
      const allDocuments = await DB.getAllDocuments();
      return allDocuments.filter(doc => {
        const createdDate = new Date(doc.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting documents by date range:', error);
      throw new Error('ไม่สามารถดึงข้อมูลเอกสารตามช่วงวันที่ได้');
    }
  }

  /**
   * Get documents by mode
   */
  static async getDocumentsByMode(mode: string): Promise<MarkdownDocument[]> {
    try {
      const allDocuments = await DB.getAllDocuments();
      return allDocuments.filter(doc => (doc.mode || 'markdown') === mode);
    } catch (error) {
      console.error('Error getting documents by mode:', error);
      throw new Error('ไม่สามารถดึงข้อมูลเอกสารตามประเภทได้');
    }
  }

  /**
   * Search documents by title or content
   */
  static async searchDocuments(query: string): Promise<MarkdownDocument[]> {
    try {
      const allDocuments = await DB.getAllDocuments();
      const lowercaseQuery = query.toLowerCase();
      
      return allDocuments.filter(doc => 
        doc.title.toLowerCase().includes(lowercaseQuery) ||
        doc.content.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('ไม่สามารถค้นหาเอกสารได้');
    }
  }

  /**
   * Delete multiple documents
   */
  static async deleteDocuments(documentIds: string[], onProgress?: (progress: number) => void): Promise<void> {
    try {
      const totalDocs = documentIds.length;
      
      for (let i = 0; i < documentIds.length; i++) {
        await DB.deleteDocument(documentIds[i]);
        onProgress?.(Math.round(((i + 1) / totalDocs) * 100));
      }
    } catch (error) {
      console.error('Error deleting documents:', error);
      throw new Error('ไม่สามารถลบเอกสารได้');
    }
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format date in Thai locale
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get unique document modes
   */
  static async getDocumentModes(): Promise<string[]> {
    try {
      const documents = await DB.getAllDocuments();
      const modes = new Set<string>();
      
      documents.forEach(doc => {
        modes.add(doc.mode || 'markdown');
      });
      
      return Array.from(modes).sort();
    } catch (error) {
      console.error('Error getting document modes:', error);
      throw new Error('ไม่สามารถดึงข้อมูลประเภทเอกสารได้');
    }
  }
}