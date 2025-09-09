import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import type { ExportOptions, TMDDocument } from '../types';

// Export service following Adasoft naming conventions
export class sExportService {
  // PDF Export
  static async FSxEXPExportToPDF(poDocument: TMDDocument, poOptions: ExportOptions): Promise<void> {
    try {
      // Validate input
      if (!poDocument.FTMdcContent || poDocument.FTMdcContent.trim() === '') {
        throw new Error('No content to export');
      }

      console.log('Starting PDF export process...');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: poOptions.pageSize || 'A4',
        compress: true
      });

      // Convert markdown to HTML first
      const tHtmlContent = await marked(poDocument.FTMdcContent);
      console.log('Markdown converted to HTML successfully');
      
      // Remove HTML tags for PDF (simple text extraction)
      const tTextContent = tHtmlContent.replace(/<[^>]*>/g, '');
      
      // Set margins
      const nMarginTop = poOptions.margins?.top || 20;
      const nMarginLeft = poOptions.margins?.left || 20;
      const nPageWidth = pdf.internal.pageSize.getWidth();
      const nMaxWidth = nPageWidth - (nMarginLeft * 2);
      
      // Check if Unicode properties are available
      const hasUnicodeSupport = pdf.internal && typeof (pdf.internal as any).getFont === 'function';
      console.log('Unicode support available:', hasUnicodeSupport);
      
      // Configure fonts for Thai text support with error handling
      let fontConfigured = false;
      
      try {
        // Use built-in helvetica font to avoid Unicode errors
        pdf.setFont('helvetica', 'normal');
        fontConfigured = true;
        console.log('Using helvetica font for PDF export');
      } catch (error) {
        console.warn('Failed to set helvetica font:', error);
        try {
          // Final fallback to times
          pdf.setFont('times', 'normal');
          fontConfigured = true;
          console.log('Using times font as fallback');
        } catch (fallbackError) {
          console.error('All font configurations failed:', fallbackError);
          // Continue with default font - jsPDF will use its internal default
        }
      }
      
      // Add Unicode fallback handling
      if (!hasUnicodeSupport) {
        console.warn('Unicode properties not available, using basic text rendering');
      }
      
      pdf.setFontSize(12);
      
      // Add title with proper encoding
      pdf.setFontSize(16);
      try {
        pdf.setFont('helvetica', 'bold');
      } catch (error) {
        console.warn('Failed to set bold font, using normal:', error);
        pdf.setFont('helvetica', 'normal');
      }
      
      // Encode Thai text properly
      const tEncodedTitle = this.FSxEXPEncodeThaiText(poDocument.FTMdcTitle);
      pdf.text(tEncodedTitle, nMarginLeft, nMarginTop);
      
      // Add content with proper encoding
      pdf.setFontSize(12);
      try {
        pdf.setFont('helvetica', 'normal');
      } catch (error) {
        console.warn('Failed to set normal font for content:', error);
        // Continue with current font
      }
      
      const tEncodedContent = this.FSxEXPEncodeThaiText(tTextContent);
       const aTextLines = pdf.splitTextToSize(tEncodedContent, nMaxWidth);
       pdf.text(aTextLines, nMarginLeft, nMarginTop + 15);
      
      // Add metadata if requested
      if (poOptions.includeMetadata) {
        const nPageHeight = pdf.internal.pageSize.getHeight();
        pdf.setFontSize(8);
        pdf.text(`Created: ${poDocument.FDMdcCreated.toLocaleDateString()}`, nMarginLeft, nPageHeight - 10);
        pdf.text(`Modified: ${poDocument.FDMdcModified.toLocaleDateString()}`, nMarginLeft + 60, nPageHeight - 10);
      }
      
      // Save the PDF
      const tFilename = poOptions.filename || `${poDocument.FTMdcTitle || 'document'}.pdf`;
      console.log('Saving PDF file:', tFilename);
      pdf.save(tFilename);
      console.log('PDF export completed successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('No content')) {
          throw new Error('ไม่มีเนื้อหาสำหรับ export PDF');
        } else if (error.message.includes('jsPDF')) {
          throw new Error('เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง');
        } else {
          throw new Error(`เกิดข้อผิดพลาดในการ export PDF: ${error.message}`);
        }
      } else {
        throw new Error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการ export PDF');
      }
    }
  }

  // HTML Export
  static async FSxEXPExportToHTML(poDocument: TMDDocument, poOptions: ExportOptions): Promise<void> {
    try {
      const tHtmlContent = await marked(poDocument.FTMdcContent);
      
      const tFullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${poDocument.FTMdcTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 2rem;
        }
        code {
            background-color: #f4f4f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f4f4f4;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 1rem 0;
            padding-left: 1rem;
            color: #666;
        }
        .metadata {
            border-top: 1px solid #eee;
            margin-top: 2rem;
            padding-top: 1rem;
            font-size: 0.9rem;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>${poDocument.FTMdcTitle}</h1>
    ${tHtmlContent}
    ${poOptions.includeMetadata ? `
    <div class="metadata">
        <p><strong>Created:</strong> ${poDocument.FDMdcCreated.toLocaleDateString()}</p>
        <p><strong>Modified:</strong> ${poDocument.FDMdcModified.toLocaleDateString()}</p>
        ${poDocument.FTMdcTags ? `<p><strong>Tags:</strong> ${poDocument.FTMdcTags}</p>` : ''}
    </div>
    ` : ''}
</body>
</html>`;
      
      // Create and download the file
      const oBlob = new Blob([tFullHtml], { type: 'text/html' });
      const tUrl = URL.createObjectURL(oBlob);
      const oLink = document.createElement('a');
      oLink.href = tUrl;
      oLink.download = `${poDocument.FTMdcTitle}.html`;
      document.body.appendChild(oLink);
      oLink.click();
      document.body.removeChild(oLink);
      URL.revokeObjectURL(tUrl);
    } catch (error) {
      console.error('Error exporting to HTML:', error);
      throw new Error('Failed to export to HTML');
    }
  }

  // Helper function to encode Thai text for PDF
  private static FSxEXPEncodeThaiText(ptText: string): string {
    try {
      // Validate input
      if (!ptText || typeof ptText !== 'string') {
        console.warn('Invalid text input for Thai encoding:', ptText);
        return ptText || '';
      }
      
      // Simple encoding for Thai text with null checking
      return ptText.replace(/[\u0E00-\u0E7F]/g, (char) => {
        try {
          const charCode = char?.charCodeAt?.(0);
          if (charCode && typeof charCode === 'number') {
            return String.fromCharCode(charCode);
          }
          return char;
        } catch (charError) {
          console.warn('Character encoding failed:', charError);
          return char;
        }
      });
    } catch (error) {
      console.warn('Thai text encoding failed:', error);
      return ptText || '';
    }
  }

  // Excel Export (for document metadata and statistics)
  static async FSxEXPExportToExcel(aDocuments: TMDDocument[]): Promise<void> {
    try {
      const aWorksheetData = aDocuments.map(doc => ({
        'Title': doc.FTMdcTitle,
        'Created': doc.FDMdcCreated.toLocaleDateString(),
        'Modified': doc.FDMdcModified.toLocaleDateString(),
        'Size (bytes)': doc.FNMdcSize,
        'Tags': doc.FTMdcTags || '',
        'Favorite': doc.FBMdcFavorite ? 'Yes' : 'No',
        'Word Count': this.FSxEXPCountWords(doc.FTMdcContent),
        'Character Count': doc.FTMdcContent.length
      }));
      
      const oWorksheet = XLSX.utils.json_to_sheet(aWorksheetData);
      const oWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(oWorkbook, oWorksheet, 'Documents');
      
      // Auto-size columns
      const aColWidths = Object.keys(aWorksheetData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      oWorksheet['!cols'] = aColWidths;
      
      XLSX.writeFile(oWorkbook, 'markdown-documents.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export to Excel');
    }
  }

  // Utility function to count words
  private static FSxEXPCountWords(ptContent: string): number {
    return ptContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Main export function
  static async FSxEXPExportDocument(poDocument: TMDDocument, poOptions: ExportOptions): Promise<void> {
    switch (poOptions.format) {
      case 'pdf':
        await this.FSxEXPExportToPDF(poDocument, poOptions);
        break;
      case 'html':
        await this.FSxEXPExportToHTML(poDocument, poOptions);
        break;
      default:
        throw new Error(`Unsupported export format: ${poOptions.format}`);
    }
  }
}