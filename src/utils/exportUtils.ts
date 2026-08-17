import * as XLSX from 'xlsx';
import { MarkdownDocument } from '@/types';
import {
  buildAdasoftDocxBlob,
  exportPdfBlob,
  sanitizeExportFilename,
  AdaExportMetadata,
} from './adaExportPipeline';
import { generateDynamicPdfBlob, PdfEngineOptions } from './pdfEngine';

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
  /**
   * PDF Generation via Dynamic Engine or Template Shell
   */
  static async exportAsPDF(
    content: string,
    title: string = 'document',
    filename: string = 'document.pdf',
    options?: PdfEngineOptions
  ): Promise<void> {
    if (!content?.trim()) {
      throw new Error('ไม่มีเนื้อหาสำหรับ export PDF');
    }

    try {
      const pdfEngineOptions: PdfEngineOptions = {
        title: title,
        headerText: title,
        ...options,
      };
      const pdfBlob = await generateDynamicPdfBlob(content, pdfEngineOptions);

      const pdfName = filename.endsWith('.pdf')
        ? filename
        : `${sanitizeExportFilename(title)}.pdf`;

      const { saveAs } = await import('file-saver');
      saveAs(pdfBlob, pdfName);
      console.log('PDF exported successfully:', pdfName);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      if (error instanceof Error) {
        throw new Error(`เกิดข้อผิดพลาดในการ export PDF: ${error.message}`);
      }
      throw new Error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการ export PDF');
    }
  }

  /** DOCX Export (supports Template or Clean Dynamic format) */
  static async exportAsDOCX(
    content: string,
    title: string,
    filename: string = 'document.docx',
    options?: { useTemplate?: boolean; metadata?: AdaExportMetadata }
  ): Promise<void> {
    if (!content?.trim()) {
      throw new Error('No content to export');
    }

    try {
      let docxBlob: Blob;

      if (options?.useTemplate !== false) {
        // Use Official Company Template (adasoft-template.docx)
        docxBlob = await buildAdasoftDocxBlob(content, title, options?.metadata);
      } else {
        // Clean Dynamic DOCX Export without template
        const { asBlob } = await import('html-docx-js-typescript');
        const markedHtml = await import('marked').then(m => m.marked(content));
        const htmlDoc = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Sarabun', 'Calibri', sans-serif; font-size: 11pt; line-height: 1.65; }
              h1 { font-size: 18pt; color: #1e40af; border-bottom: 2px solid #1e40af; margin-top: 1.2em; }
              h2 { font-size: 14pt; color: #334155; margin-top: 1em; }
              p { text-align: justify; margin: 0.6em 0; }
              table { border-collapse: collapse; width: 100%; margin: 10px 0; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
              th { background-color: #f1f5f9; font-weight: bold; }
              pre { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 10px; font-family: monospace; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            ${markedHtml}
          </body>
          </html>
        `;
        docxBlob = (await asBlob(htmlDoc)) as Blob;
      }

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
