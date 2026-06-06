import * as XLSX from 'xlsx';
import { MarkdownDocument } from '@/types';
import {
  buildAdasoftDocxBlob,
  exportPdfBlob,
  sanitizeExportFilename,
  AdaExportMetadata,
} from './adaExportPipeline';

export class ExportService {
  static exportAsMarkdown(content: string, filename: string = 'document.md'): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * PDF = adamd2pdf:
   * 1) altChunk DOCX (public/adasoft-template.docx) → PDF via Word/LibreOffice
   * 2) Fallback: server MD → DOCX → PDF (Python)
   * 3) Fallback: browser PDF with template shell
   */
  static async exportAsPDF(
    content: string,
    title: string = 'document',
    filename: string = 'document.pdf',
    metadata?: AdaExportMetadata
  ): Promise<void> {
    if (!content?.trim()) {
      throw new Error('ไม่มีเนื้อหาสำหรับ export PDF');
    }

    try {
      const pdfBlob = await exportPdfBlob(content, title, metadata);
      const pdfName = filename.endsWith('.pdf')
        ? filename
        : `${sanitizeExportFilename(title)}.pdf`;
      const { saveAs } = await import('file-saver');
      saveAs(pdfBlob, pdfName);
      console.log('PDF exported:', pdfName);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      if (error instanceof Error) {
        throw new Error(`เกิดข้อผิดพลาดในการ export PDF: ${error.message}`);
      }
      throw new Error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการ export PDF');
    }
  }

  /** DOCX via public/adasoft-template.docx (adamd2pdf) */
  static async exportAsDOCX(
    content: string,
    title: string,
    filename: string = 'document.docx',
    metadata?: AdaExportMetadata
  ): Promise<void> {
    if (!content?.trim()) {
      throw new Error('No content to export');
    }

    try {
      const docxBlob = await buildAdasoftDocxBlob(content, title, metadata);
      console.log('Generated DOCX from adasoft-template.docx');
      const { saveAs } = await import('file-saver');
      saveAs(docxBlob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      throw new Error('Failed to export DOCX');
    }
  }

  static exportAsExcel(documents: MarkdownDocument[], filename: string = 'documents.xlsx'): void {
    try {
      const data = documents.map((doc) => ({
        Title: doc.title,
        Content: doc.content,
        Created: doc.createdAt.toLocaleDateString(),
        Updated: doc.updatedAt.toLocaleDateString(),
        Tags: doc.tags?.join(', ') || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Documents');
      XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      throw new Error('Failed to export Excel');
    }
  }

  static importMarkdownFile(): Promise<{ content: string; filename: string }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt';

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            content: e.target?.result as string,
            filename: file.name.replace(/\.[^/.]+$/, ''),
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };

      input.click();
    });
  }
}
