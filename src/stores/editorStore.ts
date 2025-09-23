import { create } from 'zustand';
import { MarkdownDocument, AppSettings } from '@/types';
import { DatabaseService } from '@/database';

interface EditorStore {
  // Current document state
  currentDocument: MarkdownDocument | null;
  content: string;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  
  // Documents list
  documents: MarkdownDocument[];
  
  // App settings
  settings: AppSettings;
  
  // UI state
  isPreviewMode: boolean;
  isMobileView: boolean;
  
  // Actions
  initializeDatabase: () => Promise<void>;
  createDocument: (docData: Omit<MarkdownDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  setContent: (content: string) => void;
  setCurrentDocument: (document: MarkdownDocument | null) => void;
  saveCurrentDocument: () => Promise<void>;
  createNewDocument: (title?: string) => Promise<void>;
  loadDocument: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  loadAllDocuments: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  togglePreviewMode: () => void;
  setMobileView: (isMobile: boolean) => void;
  autoSave: () => Promise<void>;
  saveDocument: () => Promise<void>;
  updateDocument: (updates: Partial<MarkdownDocument>) => Promise<void>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  currentDocument: null,
  content: '',
  isAutoSaving: false,
  lastSaved: null,
  documents: [],
  settings: {
    theme: 'light',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    autoSave: true,
    autoSaveInterval: 5000,
    showLineNumbers: true,
    wordWrap: true,
    spellCheck: true,
    defaultExportFormat: 'pdf' as const,
    previewMode: 'split' as const,
    editorFontSize: 16,
    previewWidth: 50
  },
  isPreviewMode: false,
  isMobileView: false,
  
  // Initialize database
  initializeDatabase: async () => {
    try {
      // Load settings
      const settings = await DatabaseService.getSettings();
      set({ settings });
      
      // Load documents
      await get().loadAllDocuments();
      
    } catch (error) {
      console.error('Failed to initialize store:', error);
    }
  },
  
  // Create document function
  createDocument: async (docData: Omit<MarkdownDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DatabaseService.saveDocument(docData);
      const newDocument = await DatabaseService.getDocument(id);
      if (newDocument) {
        set({ 
          currentDocument: newDocument,
          content: newDocument.content,
          lastSaved: new Date()
        });
      }
      await get().loadAllDocuments();
      return id;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  },
  
  // Actions
  setContent: (content: string) => {
    set({ content });
    
    // Auto-save if enabled
    const { settings, autoSave } = get();
    if (settings.autoSave) {
      // Debounce auto-save
      setTimeout(() => {
        autoSave();
      }, 1000);
    }
  },
  
  setCurrentDocument: (document: MarkdownDocument | null) => {
    set({ 
      currentDocument: document,
      content: document?.content || ''
    });
  },
  
  saveCurrentDocument: async () => {
    const { currentDocument, content } = get();
    
    if (!currentDocument) {
      // Create new document
      await get().createNewDocument();
      return;
    }
    
    try {
      await DatabaseService.updateDocument(currentDocument.id, {
        content,
        title: currentDocument.title
      });
      
      // Update current document with new updatedAt
      const updatedDoc = await DatabaseService.getDocument(currentDocument.id);
      if (updatedDoc) {
        set({ 
          currentDocument: updatedDoc,
          lastSaved: new Date()
        });
      }
      
      // Reload documents list
      await get().loadAllDocuments();
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  },
  
  createNewDocument: async (title = 'Untitled Document') => {
    const { content } = get();
    
    try {
      const now = new Date();
      const id = await DatabaseService.saveDocument({
        title,
        content: content || '# New Document\n\nStart writing here...',
        tags: [],
        FDMdcModified: now,
        FDMdcCreated: now,
        FNMdcSize: (content || '# New Document\n\nStart writing here...').length,
        FTMdcTitle: title,
        FTMdcContent: content || '# New Document\n\nStart writing here...',
        FTMdcTags: [],
        FBMdcFavorite: false
      });
      
      const newDocument = await DatabaseService.getDocument(id);
      if (newDocument) {
        set({ 
          currentDocument: newDocument,
          content: newDocument.content,
          lastSaved: new Date()
        });
      }
      
      await get().loadAllDocuments();
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  },
  
  loadDocument: async (id: string) => {
    try {
      const document = await DatabaseService.getDocument(id);
      if (document) {
        set({ 
          currentDocument: document,
          content: document.content
        });
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  },
  
  deleteDocument: async (id: string) => {
    try {
      await DatabaseService.deleteDocument(id);
      
      const { currentDocument } = get();
      if (currentDocument?.id === id) {
        set({ 
          currentDocument: null,
          content: ''
        });
      }
      
      await get().loadAllDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  },
  
  loadAllDocuments: async () => {
    try {
      const documents = await DatabaseService.getAllDocuments();
      set({ documents });
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  },
  
  updateSettings: async (newSettings: Partial<AppSettings>) => {
    try {
      await DatabaseService.updateSettings(newSettings);
      const settings = await DatabaseService.getSettings();
      set({ settings });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },
  
  togglePreviewMode: () => {
    set(state => ({ isPreviewMode: !state.isPreviewMode }));
  },
  
  setMobileView: (isMobile: boolean) => {
    set({ isMobileView: isMobile });
  },
  
  autoSave: async () => {
    const { currentDocument, content, isAutoSaving, settings } = get();
    
    if (!settings.autoSave || isAutoSaving || !currentDocument) {
      return;
    }
    
    set({ isAutoSaving: true });
    
    try {
      await DatabaseService.updateDocument(currentDocument.id, {
        content
      });
      
      set({ 
        lastSaved: new Date(),
        isAutoSaving: false
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      set({ isAutoSaving: false });
    }
  },

  saveDocument: async () => {
    await get().saveCurrentDocument();
  },

  updateDocument: async (updates: Partial<MarkdownDocument>) => {
    const { currentDocument } = get();
    
    if (!currentDocument) {
      return;
    }
    
    try {
      await DatabaseService.updateDocument(currentDocument.id, updates);
      
      // Update current document with new data
      const updatedDoc = await DatabaseService.getDocument(currentDocument.id);
      if (updatedDoc) {
        set({ 
          currentDocument: updatedDoc,
          content: updatedDoc.content,
          lastSaved: new Date()
        });
      }
      
      // Reload documents list
      await get().loadAllDocuments();
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  }
}));