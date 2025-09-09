import Dexie, { Table } from 'dexie';

// Database interfaces following Adasoft naming conventions
export interface TMDDocument {
  FNMdcId?: number; // Primary key
  FTMdcTitle: string; // Document title
  FTMdcContent: string; // Markdown content
  FDMdcCreated: Date; // Created date
  FDMdcModified: Date; // Modified date
  FTMdcTags?: string[]; // Tags array
  FNMdcSize: number; // Content size in bytes
  FBMdcFavorite: boolean; // Is favorite
}

export interface TMDTemplate {
  FNTmpId?: number; // Primary key
  FTTmpName: string; // Template name
  FTTmpContent: string; // Template content
  FDTmpCreated: Date; // Created date
  FTTmpDescription?: string; // Template description
}

export interface TMDSettings {
  FNSetId?: number; // Primary key
  FTSetKey: string; // Setting key
  FTSetValue: string; // Setting value
  FDSetModified: Date; // Modified date
}

// Database class
export class MarkdownEditorDB extends Dexie {
  // Tables following Adasoft naming conventions
  tMDDocument!: Table<TMDDocument>;
  tMDTemplate!: Table<TMDTemplate>;
  tMDSettings!: Table<TMDSettings>;

  constructor() {
    super('MarkdownEditorDB');
    
    this.version(1).stores({
      tMDDocument: '++FNMdcId, FTMdcTitle, FDMdcCreated, FDMdcModified, FTMdcTags, FBMdcFavorite',
      tMDTemplate: '++FNTmpId, FTTmpName, FDTmpCreated',
      tMDSettings: '++FNSetId, FTSetKey'
    });
  }
}

// Database instance
export const db = new MarkdownEditorDB();

// Database service functions following Adasoft naming conventions
export class mMarkdownDB {
  // Document operations
  static async FSaMDCGetAllDocuments(): Promise<TMDDocument[]> {
    return await db.tMDDocument.orderBy('FDMdcModified').reverse().toArray();
  }

  static async FSoMDCGetDocumentById(pnDocId: number): Promise<TMDDocument | undefined> {
    return await db.tMDDocument.get(pnDocId);
  }

  static async FSxMDCCreateDocument(poDocument: Omit<TMDDocument, 'FNMdcId'>): Promise<number> {
    return await db.tMDDocument.add(poDocument);
  }

  static async FSxMDCUpdateDocument(pnDocId: number, poUpdates: Partial<TMDDocument>): Promise<void> {
    await db.tMDDocument.update(pnDocId, {
      ...poUpdates,
      FDMdcModified: new Date()
    });
  }

  static async FSxMDCDeleteDocument(pnDocId: number): Promise<void> {
    await db.tMDDocument.delete(pnDocId);
  }

  // Template operations
  static async FSaMDTGetAllTemplates(): Promise<TMDTemplate[]> {
    return await db.tMDTemplate.orderBy('FTTmpName').toArray();
  }

  static async FSxMDTCreateTemplate(poTemplate: Omit<TMDTemplate, 'FNTmpId'>): Promise<number> {
    return await db.tMDTemplate.add(poTemplate);
  }

  // Settings operations
  static async FStMDSGetSetting(ptKey: string): Promise<string | undefined> {
    const setting = await db.tMDSettings.where('FTSetKey').equals(ptKey).first();
    return setting?.FTSetValue;
  }

  static async FSxMDSSetSetting(ptKey: string, ptValue: string): Promise<void> {
    const existing = await db.tMDSettings.where('FTSetKey').equals(ptKey).first();
    
    if (existing) {
      await db.tMDSettings.update(existing.FNSetId!, {
        FTSetValue: ptValue,
        FDSetModified: new Date()
      });
    } else {
      await db.tMDSettings.add({
        FTSetKey: ptKey,
        FTSetValue: ptValue,
        FDSetModified: new Date()
      });
    }
  }
}