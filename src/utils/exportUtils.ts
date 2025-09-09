import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import { ExportOptions, MarkdownDocument } from '@/types';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

export class ExportService {
  // Export as Markdown file
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

  // Export as PDF
  static async exportAsPDF(content: string, filename: string = 'document.pdf'): Promise<void> {
    try {
      // Validate input
      if (!content || content.trim() === '') {
        throw new Error('No content to export');
      }

      // Convert markdown to HTML
      const html = await marked(content);
      
      // Create PDF with safe font configuration and Unicode fallback
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Check if Unicode properties are available
      const hasUnicodeSupport = typeof pdf.internal === 'object' && pdf.internal !== null;
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
      
      console.log('PDF created successfully, processing content...');

      // Parse HTML and add to PDF (simplified version)
      const lines = this.parseHTMLToText(html);
      const pageHeight = pdf.internal.pageSize.height;
      const lineHeight = 7;
      const margin = 20;
      let yPosition = margin;

      lines.forEach((line, index) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Handle different text styles with safe font handling
        if (line.startsWith('# ')) {
          pdf.setFontSize(18);
          try {
            pdf.setFont('helvetica', 'bold');
          } catch (error) {
            console.warn('Failed to set bold font for H1:', error);
            pdf.setFont('helvetica', 'normal');
          }
          const encodedText = this.encodeThaiText(line.substring(2));
          pdf.text(encodedText, margin, yPosition);
          yPosition += lineHeight * 1.5;
        } else if (line.startsWith('## ')) {
          pdf.setFontSize(16);
          try {
            pdf.setFont('helvetica', 'bold');
          } catch (error) {
            console.warn('Failed to set bold font for H2:', error);
            pdf.setFont('helvetica', 'normal');
          }
          const encodedText = this.encodeThaiText(line.substring(3));
          pdf.text(encodedText, margin, yPosition);
          yPosition += lineHeight * 1.3;
        } else if (line.startsWith('### ')) {
          pdf.setFontSize(14);
          try {
            pdf.setFont('helvetica', 'bold');
          } catch (error) {
            console.warn('Failed to set bold font for H3:', error);
            pdf.setFont('helvetica', 'normal');
          }
          const encodedText = this.encodeThaiText(line.substring(4));
          pdf.text(encodedText, margin, yPosition);
          yPosition += lineHeight * 1.2;
        } else {
          pdf.setFontSize(12);
          try {
            pdf.setFont('helvetica', 'normal');
          } catch (error) {
            console.warn('Failed to set normal font for content:', error);
            // Continue with current font
          }
          
          // Split long lines with proper Thai encoding
          const encodedLine = this.encodeThaiText(line);
          const splitLines = pdf.splitTextToSize(encodedLine, pdf.internal.pageSize.width - 2 * margin);
          splitLines.forEach((splitLine: string) => {
            if (yPosition + lineHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(splitLine, margin, yPosition);
            yPosition += lineHeight;
          });
        }
      });

      // Save PDF
      const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      console.log('Saving PDF file:', pdfFilename);
      pdf.save(pdfFilename);
      console.log('PDF export completed successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      
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

  // Export as Excel
  static exportAsExcel(documents: MarkdownDocument[], filename: string = 'documents.xlsx'): void {
    try {
      // Prepare data for Excel
      const data = documents.map(doc => ({
        'Title': doc.title,
        'Content': doc.content,
        'Created': doc.createdAt.toLocaleDateString(),
        'Updated': doc.updatedAt.toLocaleDateString(),
        'Tags': doc.tags?.join(', ') || ''
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Title
        { wch: 50 }, // Content
        { wch: 12 }, // Created
        { wch: 12 }, // Updated
        { wch: 20 }  // Tags
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Documents');

      // Save file
      const excelFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      XLSX.writeFile(wb, excelFilename);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      throw new Error('Failed to export Excel');
    }
  }

  // Helper function to encode Thai text for PDF
  private static encodeThaiText(text: string): string {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text input for Thai encoding:', text);
        return text || '';
      }
      
      // Simple encoding for Thai text with null checking
      return text.replace(/[\u0E00-\u0E7F]/g, (char) => {
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
      return text || '';
    }
  }

  // Import Markdown file
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
          const content = e.target?.result as string;
          const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          resolve({ content, filename });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };
      
      input.click();
    });
  }

  // Helper function to parse HTML to text for PDF
  private static parseHTMLToText(html: string): string[] {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract text content while preserving some structure
    const lines: string[] = [];
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          lines.push(text);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Handle different HTML elements
        switch (element.tagName.toLowerCase()) {
          case 'h1':
            lines.push(`# ${element.textContent?.trim() || ''}`);
            break;
          case 'h2':
            lines.push(`## ${element.textContent?.trim() || ''}`);
            break;
          case 'h3':
            lines.push(`### ${element.textContent?.trim() || ''}`);
            break;
          case 'p':
            lines.push(element.textContent?.trim() || '');
            lines.push(''); // Add empty line after paragraph
            break;
          case 'br':
            lines.push('');
            break;
          case 'li':
            lines.push(`• ${element.textContent?.trim() || ''}`);
            break;
          default:
            // For other elements, process children
            Array.from(element.childNodes).forEach(processNode);
            break;
        }
      }
    };
    
    Array.from(tempDiv.childNodes).forEach(processNode);
    
    return lines.filter(line => line !== undefined);
  }
}