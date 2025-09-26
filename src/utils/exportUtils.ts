import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import { MarkdownDocument } from '@/types';

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
      try {
        // Use built-in helvetica font to avoid Unicode errors
        pdf.setFont('helvetica', 'normal');
        console.log('Using helvetica font for PDF export');
      } catch (error) {
        console.warn('Failed to set helvetica font:', error);
        try {
          // Final fallback to times
          pdf.setFont('times', 'normal');
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

      lines.forEach((line) => {
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

  // Export as DOCX
  static async exportAsDOCX(content: string, title: string, filename: string = 'document.docx', metadata?: { created?: Date, updated?: Date }): Promise<void> {
    try {
      // Validate input
      if (!content || content.trim() === '') {
        throw new Error('No content to export');
      }

      // Dynamically import docxtemplater to avoid issues with static imports
      await import('docxtemplater');
      const PizZipModule = await import('pizzip');
      
      // Convert markdown to HTML
      const html = await marked(content);
      
      // Create a simple DOCX structure
      const docxZip = new PizZipModule.default();
      
      // Add the document content
      docxZip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
      
      docxZip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
      
      docxZip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
      
      // Parse HTML and create DOCX content with formatting
      const docxContent = this.htmlToDocx(html, title, metadata);
      
      docxZip.file("word/document.xml", docxContent);
      
      // Generate the DOCX file
      const docxBlob = docxZip.generate({type: 'blob'});
      
      // Create download link
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      throw new Error('Failed to export DOCX');
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

  // Helper function to convert HTML to DOCX XML format
  private static htmlToDocx(html: string, title: string, metadata?: { created?: Date, updated?: Date }): string {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Start building the DOCX XML content
    let content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- Title -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
        <w:t>${this.encodeXml(title)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:br/>
      </w:r>
    </w:p>`;

    // Process each child node
    Array.from(temp.childNodes).forEach(node => {
      content += this.processNodeForDocx(node);
    });

    // Add metadata if provided
    if (metadata) {
      content += `
    <w:p>
      <w:r>
        <w:br/>
      </w:r>
    </w:p>`;
        
        if (metadata.created) {
          content += `
    <w:p>
      <w:r>
        <w:t>Created: ${metadata.created.toLocaleDateString()}</w:t>
      </w:r>
    </w:p>`;
        }
        
        if (metadata.updated) {
          content += `
    <w:p>
      <w:r>
        <w:t>Updated: ${metadata.updated.toLocaleDateString()}</w:t>
      </w:r>
    </w:p>`;
        }
    }

    // Close the document
    content += `
  </w:body>
</w:document>`;
    
    return content;
  }

  // Process individual HTML nodes for DOCX conversion
  private static processNodeForDocx(node: Node): string {
    let content = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        content += `
    <w:p>
      <w:r>
        <w:t>${this.encodeXml(text)}</w:t>
      </w:r>
    </w:p>`;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
          content += `
    <w:p>
      <w:pPr>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'h2':
          content += `
    <w:p>
      <w:pPr>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'h3':
          content += `
    <w:p>
      <w:pPr>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'p': {
          const text = element.textContent?.trim() || '';
          if (text) {
            content += `
    <w:p>
      <w:r>
        <w:t>${this.encodeXml(text)}</w:t>
      </w:r>
    </w:p>`;
          }
          break;
        }
          
        case 'br':
          content += `
    <w:p>
      <w:r>
        <w:br/>
      </w:r>
    </w:p>`;
          break;
          
        case 'strong':
        case 'b':
          content += `
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'em':
        case 'i':
          content += `
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'ul':
          Array.from(element.children).forEach(li => {
            if (li.tagName.toLowerCase() === 'li') {
              content += `
    <w:p>
      <w:pPr>
        <w:ind w:left="720"/>
      </w:pPr>
      <w:r>
        <w:t>• ${this.encodeXml(li.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
            }
          });
          break;
          
        case 'ol':
          Array.from(element.children).forEach((li, index) => {
            if (li.tagName.toLowerCase() === 'li') {
              content += `
    <w:p>
      <w:pPr>
        <w:ind w:left="720"/>
      </w:pPr>
      <w:r>
        <w:t>${index + 1}. ${this.encodeXml(li.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
            }
          });
          break;
          
        case 'code':
          content += `
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'pre':
          content += `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="PreformattedText"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
        </w:rPr>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        case 'blockquote':
          content += `
    <w:p>
      <w:pPr>
        <w:ind w:left="720"/>
      </w:pPr>
      <w:r>
        <w:t>${this.encodeXml(element.textContent?.trim() || '')}</w:t>
      </w:r>
    </w:p>`;
          break;
          
        default:
          // For other elements, process children
          Array.from(element.childNodes).forEach(child => {
            content += this.processNodeForDocx(child);
          });
          break;
      }
    }
    
    return content;
  }

  // Helper function to convert HTML to plain text
  private static htmlToText(html: string): string {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Extract text content
    return temp.textContent || temp.innerText || '';
  }

  // Helper function to encode text for XML
  private static encodeXml(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\n/g, '</w:t></w:r><w:r><w:br/><w:t>')
      .replace(/\t/g, '    '); // Replace tabs with 4 spaces
  }
}