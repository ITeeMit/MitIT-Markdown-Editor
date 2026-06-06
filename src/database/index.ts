import { MarkdownDocument, AppSettings, Project, PROJECT_COLORS } from '@/types';

// Simple in-memory storage for now to avoid Dexie issues
let documents: MarkdownDocument[] = [];
let projects: Project[] = [];
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

  const savedProjects = localStorage.getItem('markdown-projects');
  if (savedProjects) {
    const parsed: Project[] = JSON.parse(savedProjects);
    projects = parsed.map((p) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    }));
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

  private static saveProjectsToStorage() {
    try {
      localStorage.setItem('markdown-projects', JSON.stringify(projects));
    } catch (error) {
      console.warn('Failed to save projects to localStorage:', error);
    }
  }

  private static generateId(prefix: string): string {
    return globalThis.crypto?.randomUUID() || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
    const id = this.generateId('doc');
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
    const id = this.generateId('doc');
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

  // Project operations
  static async getAllProjects(): Promise<Project[]> {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getProject(id: string): Promise<Project | undefined> {
    return projects.find((p) => p.id === id);
  }

  static async saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const color = project.color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const id = this.generateId('proj');
    const newProject: Project = { ...project, color, id, createdAt: now, updatedAt: now };
    projects.push(newProject);
    this.saveProjectsToStorage();
    return id;
  }

  static async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date() };
      this.saveProjectsToStorage();
    }
  }

  static async deleteProject(id: string): Promise<void> {
    projects = projects.filter((p) => p.id !== id);
    documents.forEach((doc, index) => {
      if (doc.folderId === id) {
        documents[index] = { ...doc, folderId: undefined, updatedAt: new Date() };
      }
    });
    this.saveProjectsToStorage();
    this.saveDocumentsToStorage();
  }

  static async moveDocumentToProject(documentId: string, projectId: string | undefined): Promise<void> {
    await this.updateDocument(documentId, { folderId: projectId });
  }

  static async toggleDocumentStar(documentId: string): Promise<void> {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      await this.updateDocument(documentId, { isStarred: !doc.isStarred });
    }
  }

  static async getDocumentsByProject(projectId: string | undefined): Promise<MarkdownDocument[]> {
    return documents
      .filter((doc) => (projectId ? doc.folderId === projectId : !doc.folderId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static async getStarredDocuments(): Promise<MarkdownDocument[]> {
    return documents
      .filter((doc) => doc.isStarred)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static async getRecentDocuments(limit = 5): Promise<MarkdownDocument[]> {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }
}