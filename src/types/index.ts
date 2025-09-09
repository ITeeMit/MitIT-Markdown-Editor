export interface MarkdownDocument {
  FNMdcId?: number;
  FTMdcTitle: string;
  FTMdcContent: string;
  FDMdcModified: Date;
  FDMdcCreated: Date;
  FNMdcSize: number;
  FTMdcTags?: string[];
  FBMdcFavorite: boolean;
  // Legacy properties for backward compatibility
  id?: string;
  title?: string;
  content?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  isStarred?: boolean;
  folderId?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  spellCheck: boolean;
  defaultExportFormat: 'pdf' | 'html' | 'docx';
  previewMode: 'split' | 'preview' | 'editor';
  editorFontSize: number;
  previewWidth: number;
}

export interface ExportOptions {
  format: 'md' | 'pdf' | 'html' | 'xlsx';
  filename: string;
  includeMetadata?: boolean;
  pageSize?: string;
  margins?: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  };
}

// Document statistics interface
export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
  readingTime: number;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface EditorState {
  content: string;
  currentDocument: MarkdownDocument | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
}

// Additional types for stores and components
export interface UIStore {
  sidebarOpen: boolean;
  previewMode: 'split' | 'preview' | 'editor';
  theme: EditorTheme;
  currentTheme: EditorTheme;
  setTheme: (theme: EditorTheme) => void;
  isPreviewMode: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
}

export interface EditorTheme {
  name: string;
  isDark: boolean;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
  };
}

export type EditorThemeType = 'light' | 'dark' | 'auto';

// Alias for backward compatibility
export type TMDDocument = MarkdownDocument;

// Search result type
export interface SearchResult {
  documentId: number;
  title: string;
  content: string;
  matchCount: number;
  highlights: string[];
}

// Document store types
export interface DocumentStore {
  documents: MarkdownDocument[];
  currentDocument: MarkdownDocument | null;
  isLoading: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  loadDocuments: () => Promise<void>;
  createDocument: (title: string, content?: string) => Promise<void>;
  updateDocument: (id: number, updates: Partial<MarkdownDocument>) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  setCurrentDocument: (document: MarkdownDocument | null) => void;
  searchDocuments: (query: string) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
}

// Settings store types
export interface SettingsStore {
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
}

// Editor store types
export interface EditorStore {
  content: string;
  currentDocument: MarkdownDocument | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  setContent: (content: string) => void;
  setCurrentDocument: (document: MarkdownDocument | null) => void;
  saveDocument: () => Promise<void>;
  updateDocument: (updates: Partial<MarkdownDocument>) => Promise<void>;
}