import Dexie, { Table } from 'dexie';
import { MarkdownDocument, AppSettings } from '@/types';

// Dexie Database Schema
class MarkdownDB extends Dexie {
  documents!: Table<MarkdownDocument>;
  settings!: Table<AppSettings & { id: string }>;
  
  constructor() {
    super('MarkdownEditorDB');
    this.version(1).stores({
      documents: '++id, title, createdAt, updatedAt, *tags',
      settings: '++id, theme, editorFontSize, previewWidth, autoSave'
    });
    
    // Initialize default settings on database creation
    this.on('ready', async () => {
      const settingsCount = await this.settings.count();
      if (settingsCount === 0) {
        await this.settings.add({
          id: 'default',
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
        });
      }
      
      // No automatic creation of welcome document
    });
  }
}

// Create database instance
export const db = new MarkdownDB();

// Database service functions
export class DatabaseService {
  // Document operations
  static async getAllDocuments(): Promise<MarkdownDocument[]> {
    return await db.documents.orderBy('updatedAt').reverse().toArray();
  }
  
  static async getDocument(id: string): Promise<MarkdownDocument | undefined> {
    return await db.documents.get(id);
  }
  
  static async saveDocument(document: Omit<MarkdownDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const newDoc: MarkdownDocument = {
      ...document,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    await db.documents.add(newDoc);
    return newDoc.id;
  }
  
  static async updateDocument(id: string, updates: Partial<Omit<MarkdownDocument, 'id' | 'createdAt'>>): Promise<void> {
    await db.documents.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  }
  
  static async deleteDocument(id: string): Promise<void> {
    await db.documents.delete(id);
  }
  
  // Settings operations
  static async getSettings(): Promise<AppSettings> {
    const settings = await db.settings.get('default');
    if (!settings) {
      // Return default settings if not found
      return {
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
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...appSettings } = settings;
    return appSettings;
  }
  
  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    await db.settings.update('default', settings);
  }
  
  // Search documents
  static async searchDocuments(query: string): Promise<MarkdownDocument[]> {
    return await db.documents
      .filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.content.toLowerCase().includes(query.toLowerCase()) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      )
      .toArray();
  }
}