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

      // Convert markdown to HTML
      const html = await marked(content);
      
      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Process Mermaid diagrams
      const mermaidBlocks = tempDiv.querySelectorAll('code.language-mermaid');
      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const code = block.textContent || '';
        try {
          const { default: mermaid } = await import('mermaid');
          mermaid.initialize({ startOnLoad: false, theme: 'default' });
          const id = `mermaid-export-${Date.now()}-${i}`;
          const { svg } = await mermaid.render(id, code);
          
          const pngDataUrl = await this.svgToPng(svg);

          const img = document.createElement('img');
          img.src = pngDataUrl;
          img.style.maxWidth = '100%';

          const pre = block.parentElement;
          if (pre && pre.tagName === 'PRE') {
            pre.parentNode?.replaceChild(img, pre);
          }
        } catch (err) {
          console.error('Failed to render mermaid for export', err);
        }
      }

      // Process PlantUML diagrams
      const plantUmlBlocks = tempDiv.querySelectorAll('code.language-plantuml');
      if (plantUmlBlocks.length > 0) {
        const { default: plantumlEncoder } = await import('plantuml-encoder');
        for (let i = 0; i < plantUmlBlocks.length; i++) {
          const block = plantUmlBlocks[i];
          const code = block.textContent || '';
          try {
            const encoded = plantumlEncoder.encode(code);
            const plantumlUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
            
            const response = await fetch(plantumlUrl);
            const svgContent = await response.text();
            
            const pngDataUrl = await this.svgToPng(svgContent);
            
            const img = document.createElement('img');
            img.src = pngDataUrl;
            img.style.maxWidth = '100%';

            const pre = block.parentElement;
            if (pre && pre.tagName === 'PRE') {
              pre.parentNode?.replaceChild(img, pre);
            }
          } catch (err) {
            console.error('Failed to render plantuml for export', err);
          }
        }
      }

      let metadataHtml = '';
      if (metadata) {
        metadataHtml += '<p><br/></p>';
        if (metadata.created) {
          metadataHtml += `<p>Created: ${metadata.created.toLocaleDateString()}</p>`;
        }
        if (metadata.updated) {
          metadataHtml += `<p>Updated: ${metadata.updated.toLocaleDateString()}</p>`;
        }
      }

      const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; margin-bottom: 1em; border: 1px solid #000000; }
            th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            img { max-width: 100%; height: auto; margin: 1em 0; }
            body { font-family: 'Sarabun', 'Kanit', Arial, sans-serif; font-size: 14pt; color: #000000; }
            h1, h2, h3, h4, h5, h6 { font-family: 'Sarabun', 'Kanit', Arial, sans-serif; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #000000; border: none; text-decoration: none; }
            h1 { font-size: 24pt; text-align: left; }
            h2 { font-size: 20pt; }
            h3 { font-size: 16pt; text-decoration: underline; }
            p { margin-bottom: 1em; line-height: 1.5; color: #000000; }
            ul, ol { margin-bottom: 1em; }
            li { margin-bottom: 0.5em; }
            pre { background-color: #f5f5f5; padding: 1em; border: 1px solid #cccccc; border-radius: 4px; }
            code { font-family: 'Courier New', Courier, monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
            blockquote { border-left: 4px solid #cccccc; padding-left: 1em; margin-left: 0; color: #666666; font-style: italic; }
          </style>
        </head>
        <body>
          ${tempDiv.innerHTML}
          ${metadataHtml}
        </body>
        </html>
      `;

      let docxBlob: Blob | null = null;

      try {
        // Try to load the Adasoft template
        const response = await fetch('/adasoft-template.docx');
        if (!response.ok) throw new Error(`Template not found: ${response.statusText}`);
        
        const templateBuffer = await response.arrayBuffer();
        const PizZip = (await import('pizzip')).default;
        const zip = new PizZip(templateBuffer);
        
        // 0. Modify styles.xml to force black color and no borders on headings
        let stylesXml = zip.file('word/styles.xml').asText();
        if (stylesXml) {
          // Replace color for any heading to black
          stylesXml = stylesXml.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:color w:val="[^"]+"\/>/g, '$1<w:color w:val="000000"/>');
          // Remove pBdr (borders) for any heading
          stylesXml = stylesXml.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:pBdr>[\s\S]*?<\/w:pBdr>/g, '$1');
          // Force left alignment instead of center for any heading
          stylesXml = stylesXml.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:jc w:val="center"\/>/g, '$1<w:jc w:val="left"/>');
          zip.file('word/styles.xml', stylesXml);
        }
        
        // 1. Add HTML file
        zip.file('word/document.html', finalHtml);
        
        // 2. Update .rels
        let relsXml = zip.file('word/_rels/document.xml.rels').asText();
        if (!relsXml.includes('htmlChunk')) {
          relsXml = relsXml.replace('</Relationships>', '  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="document.html"/>\n</Relationships>');
          zip.file('word/_rels/document.xml.rels', relsXml);
        }
        
        // 3. Update document.xml
        let docXml = zip.file('word/document.xml').asText();
        const sectPrMatch = docXml.match(/<w:sectPr[^>]*>.*?<\/w:sectPr>/);
        const sectPr = sectPrMatch ? sectPrMatch[0] : '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>';
        docXml = docXml.replace(/<w:body>.*<\/w:body>/, `<w:body><w:altChunk r:id="htmlChunk"/>${sectPr}</w:body>`);
        zip.file('word/document.xml', docXml);
        
        // 4. Update Content_Types
        let contentTypes = zip.file('[Content_Types].xml').asText();
        if (!contentTypes.includes('text/html')) {
          contentTypes = contentTypes.replace('</Types>', '  <Default Extension="html" ContentType="text/html"/>\n</Types>');
          zip.file('[Content_Types].xml', contentTypes);
        }
        
        // Generate blob
        docxBlob = zip.generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        console.log('Successfully generated DOCX from adasoft-template.docx');
      } catch (templateError) {
        console.warn('Failed to use adasoft-template.docx, falling back to html-docx-js-typescript', templateError);
        const { asBlob } = await import('html-docx-js-typescript');
        docxBlob = await asBlob(finalHtml) as Blob;
      }
      
      if (!docxBlob) throw new Error('Failed to generate DOCX blob');
      
      const { saveAs } = await import('file-saver');
      saveAs(docxBlob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
      
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      throw new Error('Failed to export DOCX');
    }
  }

  // Helper method to convert SVG to PNG data URL
  private static svgToPng(svgString: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let processedSvg = svgString;
      if (!processedSvg.includes('xmlns=')) {
        processedSvg = processedSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      // Some SVGs don't have width and height, causing canvas to be 0x0
      const widthMatch = processedSvg.match(/width="([^"]+)"/);
      const heightMatch = processedSvg.match(/height="([^"]+)"/);
      
      const svgBase64 = btoa(unescape(encodeURIComponent(processedSvg)));
      img.src = 'data:image/svg+xml;base64,' + svgBase64;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Fallback dimensions if img.width/img.height are 0
        canvas.width = img.width || (widthMatch ? parseInt(widthMatch[1]) : 800) || 800;
        canvas.height = img.height || (heightMatch ? parseInt(heightMatch[1]) : 600) || 600;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      
      img.onerror = (e) => reject(e);
    });
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
      if (!text || typeof text !== 'string') return text || '';
      return text.replace(/[\u0E00-\u0E7F]/g, (char) => {
        try {
          const charCode = char?.charCodeAt?.(0);
          if (charCode && typeof charCode === 'number') return String.fromCharCode(charCode);
          return char;
        } catch (charError) { return char; }
      });
    } catch (error) { return text || ''; }
  }

  // Helper function to parse HTML to text for PDF
  private static parseHTMLToText(html: string): string[] {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const lines: string[] = [];
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) lines.push(text);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        switch (element.tagName.toLowerCase()) {
          case 'h1': lines.push(`# ${element.textContent?.trim() || ''}`); break;
          case 'h2': lines.push(`## ${element.textContent?.trim() || ''}`); break;
          case 'h3': lines.push(`### ${element.textContent?.trim() || ''}`); break;
          case 'p':
            lines.push(element.textContent?.trim() || '');
            lines.push('');
            break;
          case 'br': lines.push(''); break;
          case 'li': lines.push(`• ${element.textContent?.trim() || ''}`); break;
          default: Array.from(element.childNodes).forEach(processNode); break;
        }
      }
    };
    Array.from(tempDiv.childNodes).forEach(processNode);
    return lines.filter(line => line !== undefined);
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
}