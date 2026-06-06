import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import type { MarkdownDocument, Project } from '@/types';

export interface ProjectExportData {
  metadata: {
    exportDate: string;
    exportType: 'project';
    version: '1.1.0';
    appName: string;
    totalDocuments: number;
  };
  project: Project;
  documents: MarkdownDocument[];
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim() || 'untitled';
}

export function buildProjectExportData(
  project: Project,
  documents: MarkdownDocument[]
): ProjectExportData {
  const projectDocs = documents.filter((doc) => doc.folderId === project.id);
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      exportType: 'project',
      version: '1.1.0',
      appName: 'MitIT Multi-Mode Editor',
      totalDocuments: projectDocs.length,
    },
    project,
    documents: projectDocs,
  };
}

export function downloadProjectAsJson(project: Project, documents: MarkdownDocument[]): void {
  const data = buildProjectExportData(project, documents);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const slug = sanitizeFilename(project.name);
  saveAs(blob, `${slug}-project-${new Date().toISOString().slice(0, 10)}.json`);
}

export function downloadProjectAsMarkdownZip(project: Project, documents: MarkdownDocument[]): void {
  const projectDocs = documents.filter((doc) => doc.folderId === project.id);
  if (projectDocs.length === 0) {
    throw new Error('Project has no documents to export');
  }

  const zip = new PizZip();
  const usedNames = new Set<string>();

  for (const doc of projectDocs) {
    let baseName = sanitizeFilename(doc.title || 'untitled');
    let fileName = `${baseName}.md`;
    let counter = 1;
    while (usedNames.has(fileName)) {
      fileName = `${baseName}-${counter}.md`;
      counter += 1;
    }
    usedNames.add(fileName);
    zip.file(fileName, doc.content || '');
  }

  zip.file(
    '_project.json',
    JSON.stringify(buildProjectExportData(project, documents), null, 2)
  );

  const blob = zip.generate({ type: 'blob' });
  const slug = sanitizeFilename(project.name);
  saveAs(blob, `${slug}-markdown-${new Date().toISOString().slice(0, 10)}.zip`);
}
