import { create } from 'zustand';
import { MarkdownDocument, AppSettings } from '@/types';
import { DatabaseService } from '@/database';

export type EditorMode = 'markdown' | 'mermaid' | 'plantuml';

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
  
  // Mode management
  currentMode: EditorMode;
  
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
  
  // Mode management actions
  switchMode: (mode: EditorMode) => void;
  getDefaultTemplate: (mode: EditorMode) => string;
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
  currentMode: 'markdown',
  
  // Initialize database
  initializeDatabase: async () => {
    try {
      console.log('Starting database initialization...');
      
      // Load settings
      console.log('Loading settings...');
      const settings = await DatabaseService.getSettings();
      console.log('Settings loaded:', settings);
      set({ settings });
      
      // Load documents
      console.log('Loading documents...');
      await get().loadAllDocuments();
      console.log('Database initialization completed successfully');
      
    } catch (error) {
      console.error('Failed to initialize store:', error);
      console.error('Error details:', error);
      throw error; // Re-throw to see the actual error
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
    if (document) {
      // Get the saved mode
      const savedMode = document.mode || 'markdown';
      
      set({ 
        currentDocument: document,
        content: document.content || '',
        currentMode: savedMode
      });
    } else {
      set({ 
        currentDocument: null,
        content: ''
      });
    }
  },
  
  saveCurrentDocument: async () => {
    const { currentDocument, content, currentMode } = get();
    
    if (!currentDocument) {
      // Create new document
      await get().createNewDocument();
      return;
    }
    
    try {
      await DatabaseService.updateDocument(currentDocument.id, {
        content,
        title: currentDocument.title,
        mode: currentMode
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
    const { content, currentMode } = get();
    
    try {
      const now = new Date();
      const id = await DatabaseService.saveDocument({
        title,
        content: content || '# New Document\n\nStart writing here...',
        tags: [],
        mode: currentMode
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
        // Get the saved mode
        const savedMode = document.mode || 'markdown';
        
        set({ 
          currentDocument: document,
          content: document.content,
          currentMode: savedMode
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
    const { currentDocument, content, isAutoSaving, settings, currentMode } = get();
    
    if (!settings.autoSave || isAutoSaving || !currentDocument) {
      return;
    }
    
    set({ isAutoSaving: true });
    
    try {
      await DatabaseService.updateDocument(currentDocument.id, {
        content,
        mode: currentMode
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
  },

  // Mode management actions
  switchMode: (mode: EditorMode) => {
    const template = get().getDefaultTemplate(mode);
    set({ 
      currentMode: mode,
      content: template
    });
  },

  getDefaultTemplate: (mode: EditorMode) => {
    switch (mode) {
      case 'markdown':
        return '# Markdown Document\n\nStart writing your markdown content here...\n\n## Features\n\n- **Bold text**\n- *Italic text*\n- [Links](https://example.com)\n- `Code snippets`\n\n### Lists\n\n1. Numbered list\n2. Another item\n\n- Bullet point\n- Another bullet\n\n### Code Block\n\n```javascript\nconst greeting = "Hello, World!";\nconsole.log(greeting);\n```';
      
      case 'mermaid':
        return '```mermaid\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E\n```\n\n<!-- Mermaid Diagram Examples -->\n<!-- Flowchart, Sequence, Class, State, Gantt, Pie, etc. -->\n<!-- Edit the diagram above or create new ones -->';
      
      case 'plantuml':
        return '@startuml\n!theme plain\ntitle Simple Class Diagram\n\nclass User {\n  +id: string\n  +name: string\n  +email: string\n  --\n  +login()\n  +logout()\n}\n\nclass Product {\n  +id: string\n  +name: string\n  +price: number\n  --\n  +getPrice()\n  +setPrice(price: number)\n}\n\nUser ||--o{ Product : owns\n\n@enduml\n\n\' PlantUML Diagram Examples\n\' Sequence, Class, Activity, Component, State, etc.\n\' Edit the diagram above or create new ones';
      
      default:
        return '';
    }
  }
}));