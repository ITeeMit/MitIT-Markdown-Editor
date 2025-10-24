import { MarkdownDocument, AppSettings } from '@/types';

// Simple in-memory storage for now to avoid Dexie issues
let documents: MarkdownDocument[] = [];
let settings: AppSettings = {
  theme: 'light',
  fontSize: 16,
  fontFamily: 'Inter',
  showLineNumbers: true,
  wordWrap: true,
  spellCheck: true,
  defaultExportFormat: 'pdf',
  previewMode: 'split',
  editorFontSize: 16,
  previewWidth: 50,
  autoSave: true,
  autoSaveInterval: 5000
};

// Try to load from localStorage
try {
  const savedDocs = localStorage.getItem('markdown-documents');
  if (savedDocs) {
    const parsed: any[] = JSON.parse(savedDocs);
    // Normalize date fields to Date instances
    documents = parsed.map((doc: any) => ({
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
    }));
  }
  
  const savedSettings = localStorage.getItem('markdown-settings');
  if (savedSettings) {
    settings = { ...settings, ...JSON.parse(savedSettings) };
  }
} catch (error) {
  console.warn('Failed to load from localStorage:', error);
}

// Database service functions using localStorage
export class DatabaseService {
  // Helper to save documents to localStorage
  private static saveDocumentsToStorage() {
    try {
      localStorage.setItem('markdown-documents', JSON.stringify(documents));
    } catch (error) {
      console.warn('Failed to save documents to localStorage:', error);
    }
  }

  // Helper to save settings to localStorage
  private static saveSettingsToStorage() {
    try {
      localStorage.setItem('markdown-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }

  // Document operations
  static async getAllDocuments(): Promise<MarkdownDocument[]> {
    return [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  
  static async getDocument(id: string): Promise<MarkdownDocument | undefined> {
    return documents.find(doc => doc.id === id);
  }
  
  static async saveDocument(document: Omit<MarkdownDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const id = globalThis.crypto?.randomUUID() || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc: MarkdownDocument = {
      ...document,
      id,
      createdAt: now,
      updatedAt: now
    };
    documents.push(newDoc);
    this.saveDocumentsToStorage();
    return id;
  }
  
  // Create a document while preserving provided timestamps (used for import/restore)
  static async createDocument(document: Omit<MarkdownDocument, 'id'>): Promise<MarkdownDocument> {
    const id = globalThis.crypto?.randomUUID() || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc: MarkdownDocument = {
      ...document,
      id
    };
    documents.push(newDoc);
    this.saveDocumentsToStorage();
    return newDoc;
  }
  
  static async updateDocument(id: string, updates: Partial<Omit<MarkdownDocument, 'id' | 'createdAt'>>): Promise<void> {
    const index = documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      documents[index] = {
        ...documents[index],
        ...updates,
        updatedAt: new Date()
      };
      this.saveDocumentsToStorage();
    }
  }
  
  static async deleteDocument(id: string): Promise<void> {
    const index = documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      documents.splice(index, 1);
      this.saveDocumentsToStorage();
    }
  }
  
  // Settings operations
  static async getSettings(): Promise<AppSettings> {
    return { ...settings };
  }
  
  static async updateSettings(newSettings: Partial<AppSettings>): Promise<void> {
    settings = { ...settings, ...newSettings };
    this.saveSettingsToStorage();
  }
  
  // Search documents
  static async searchDocuments(query: string): Promise<MarkdownDocument[]> {
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase()) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }
}