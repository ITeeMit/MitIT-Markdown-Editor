import jsPDF from 'jspdf';
import { marked } from 'marked';

// Thai font support configuration
const THAI_FONTS = {
  sarabun: 'Sarabun',
  kanit: 'Kanit',
  prompt: 'Prompt'
};

// PDF export options
interface PDFExportOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  quality?: number;
}

// Create print-style CSS for PDF export (same as handlePrint)
function getPrintCSS(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700&display=swap');
    
    @media print {
      @page {
        size: A4;
        margin: 2cm;
      }
      
      body {
        font-family: 'Sarabun', 'Noto Sans Thai', 'Kanit', 'Arial', sans-serif !important;
        font-size: 13pt;
        line-height: 1.8;
        color: #000 !important;
        background: white !important;
        margin: 0;
        padding: 0;
      }
      
      .print-container {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Kanit', 'Sarabun', sans-serif !important;
        color: #1a1a1a !important;
        page-break-after: avoid;
        margin: 24px 0 16px 0;
        line-height: 1.3;
        font-weight: 600;
      }
      
      h1 {
        font-size: 24px !important;
        border-bottom: 2px solid #333 !important;
        padding-bottom: 8px;
      }
      
      h2 {
        font-size: 20px !important;
        border-bottom: 1px solid #666 !important;
        padding-bottom: 4px;
      }
      
      h3 { font-size: 18px !important; }
      h4 { font-size: 16px !important; }
      h5, h6 { font-size: 14px !important; }
      
      p {
        margin: 0.8em 0;
        text-align: justify;
        orphans: 3;
        widows: 3;
      }
      
      ul, ol {
        margin: 12px 0 !important;
        padding-left: 24px !important;
      }
      
      li {
        margin: 4px 0 !important;
        page-break-inside: avoid;
      }
      
      pre {
        background: #f8f9fa !important;
        border: 1px solid #e9ecef !important;
        padding: 16px !important;
        margin: 16px 0 !important;
        font-family: 'Courier New', monospace !important;
        font-size: 12px !important;
        page-break-inside: avoid;
        white-space: pre-wrap;
      }
      
      code {
        font-family: 'Courier New', monospace !important;
        background: #f8f9fa !important;
        padding: 2px 4px !important;
        border-radius: 3px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0 !important;
        page-break-inside: avoid;
      }
      
      th, td {
        border: 1px solid #dee2e6 !important;
        padding: 8px 12px !important;
        text-align: left;
      }
      
      th {
        background: #f8f9fa !important;
        font-weight: 600;
      }
      
      blockquote {
        border-left: 4px solid #007bff !important;
        margin: 16px 0 !important;
        padding: 8px 16px !important;
        background: #f8f9fa !important;
      }
    }
    
    body {
      font-family: 'Sarabun', 'Noto Sans Thai', 'Kanit', 'Arial', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  `;
}

// Create styled container for PDF export using print CSS
async function createPDFContainer(content: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  
  // Convert markdown to HTML if needed
  let htmlContent = content;
  if (content && !content.trim().startsWith('<')) {
    // Configure marked for better PDF output
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    
    try {
      htmlContent = await marked(content);
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      htmlContent = `<p>${content}</p>`;
    }
  }
  
  container.innerHTML = `<div class="print-container">${htmlContent}</div>`;
  container.className = 'pdf-export-container';
  
  // Apply print CSS styles to container
  const style = document.createElement('style');
  style.textContent = getPrintCSS();
  document.head.appendChild(style);
  
  // Apply basic styling to container
  container.style.cssText = `
    font-family: 'Sarabun', 'Noto Sans Thai', 'Kanit', 'Arial', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: white;
  `;
  
  return container;
}

// Export content as PDF using print window approach (same as handlePrint)
export async function exportToPDF(
  content: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
  } = options;
  
  try {
    // Convert markdown to HTML
    const htmlContent = await marked(content);
    
    // Create a new window for PDF generation with the content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('ไม่สามารถเปิดหน้าต่างสำหรับสร้าง PDF ได้ กรุณาอนุญาตป๊อปอัพ');
    }

    // Create print-specific CSS (same as handlePrint)
    const printCSS = getPrintCSS();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Export - ${filename}</title>
        <style>
          ${printCSS}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${htmlContent}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load then trigger print dialog
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      
      // Close window after a delay to allow printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}

// Export with Thai text optimization
export async function exportThaiToPDF(
  content: string,
  options: PDFExportOptions = {}
): Promise<void> {
  // Ensure Thai fonts are loaded
  const fontPromises = Object.values(THAI_FONTS).map(font => {
    return document.fonts.load(`16px ${font}`);
  });
  
  try {
    await Promise.all(fontPromises);
    await exportToPDF(content, options);
  } catch (error) {
    console.warn('Thai fonts not fully loaded, proceeding with fallback');
    await exportToPDF(content, options);
  }
}

// Quick export function
export function quickExportPDF(content: string, filename?: string): Promise<void> {
  return exportThaiToPDF(content, {
    filename: filename || `document-${new Date().toISOString().split('T')[0]}.pdf`,
    format: 'a4',
    orientation: 'portrait',
    quality: 1.2
  });
}