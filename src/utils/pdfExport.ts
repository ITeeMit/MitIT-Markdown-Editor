import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

// Create styled container for PDF export
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
      const result = marked(content);
      htmlContent = typeof result === 'string' ? result : await result;
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      htmlContent = `<p>${content}</p>`;
    }
  }
  
  container.innerHTML = htmlContent;
  
  // Apply PDF-specific styles
  container.style.cssText = `
    font-family: 'Sarabun', 'Kanit', 'Prompt', 'Noto Sans Thai', sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #333;
    background: white;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
    word-wrap: break-word;
    overflow-wrap: break-word;
  `;
  
  // Style headings
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    const element = heading as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    
    element.style.cssText = `
      font-family: 'Kanit', 'Sarabun', sans-serif;
      font-weight: 600;
      margin: 24px 0 16px 0;
      color: #1a1a1a;
      line-height: 1.3;
      page-break-after: avoid;
    `;
    
    // Different sizes and styles for different heading levels
    switch (tagName) {
      case 'h1':
        element.style.fontSize = '24px';
        element.style.borderBottom = '2px solid #333';
        element.style.paddingBottom = '8px';
        element.style.marginTop = '0';
        break;
      case 'h2':
        element.style.fontSize = '20px';
        element.style.borderBottom = '1px solid #666';
        element.style.paddingBottom = '4px';
        break;
      case 'h3':
        element.style.fontSize = '18px';
        break;
      case 'h4':
        element.style.fontSize = '16px';
        break;
      case 'h5':
      case 'h6':
        element.style.fontSize = '14px';
        break;
    }
  });
  
  // Style paragraphs
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    const element = p as HTMLElement;
    element.style.cssText = `
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 12px 0;
      color: #333;
      text-align: justify;
      page-break-inside: avoid;
    `;
  });
  
  // Style lists
  const lists = container.querySelectorAll('ul, ol');
  lists.forEach(list => {
    const element = list as HTMLElement;
    element.style.cssText = `
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 12px 0;
      padding-left: 24px;
      color: #333;
    `;
  });
  
  const listItems = container.querySelectorAll('li');
  listItems.forEach(li => {
    const element = li as HTMLElement;
    element.style.cssText = `
      margin: 4px 0;
      line-height: 1.6;
    `;
  });
  
  // Style code blocks
  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
    const element = pre as HTMLElement;
    element.style.cssText = `
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 16px;
      margin: 16px 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      page-break-inside: avoid;
    `;
  });
  
  // Style inline code
  const inlineCodes = container.querySelectorAll('code');
  inlineCodes.forEach(code => {
    const element = code as HTMLElement;
    if (!element.parentElement || element.parentElement.tagName !== 'PRE') {
      element.style.cssText = `
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 3px;
        padding: 2px 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #d63384;
      `;
    }
  });
  
  // Style blockquotes
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach(blockquote => {
    const element = blockquote as HTMLElement;
    element.style.cssText = `
      border-left: 4px solid #007bff;
      background-color: #f8f9fa;
      margin: 16px 0;
      padding: 12px 16px;
      font-style: italic;
      color: #495057;
      page-break-inside: avoid;
    `;
  });
  
  // Style tables
  const tables = container.querySelectorAll('table');
  tables.forEach(table => {
    const element = table as HTMLElement;
    element.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-family: 'Sarabun', sans-serif;
      font-size: 12px;
      page-break-inside: avoid;
    `;
  });
  
  const tableCells = container.querySelectorAll('th, td');
  tableCells.forEach(cell => {
    const element = cell as HTMLElement;
    element.style.cssText = `
      border: 1px solid #dee2e6;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    `;
    
    if (element.tagName === 'TH') {
      element.style.backgroundColor = '#f8f9fa';
      element.style.fontWeight = '600';
    }
  });
  
  // Style links
  const links = container.querySelectorAll('a');
  links.forEach(link => {
    const element = link as HTMLElement;
    element.style.cssText = `
      color: #007bff;
      text-decoration: underline;
    `;
  });
  
  // Style horizontal rules
  const hrs = container.querySelectorAll('hr');
  hrs.forEach(hr => {
    const element = hr as HTMLElement;
    element.style.cssText = `
      border: none;
      border-top: 2px solid #dee2e6;
      margin: 24px 0;
    `;
  });
  
  return container;
}

// Export content as PDF
export async function exportToPDF(
  content: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    format = 'a4',
    orientation = 'portrait',
    margin = 20,
    quality = 1.0
  } = options;
  
  try {
    // Create temporary container
    const container = await createPDFContainer(content);
    document.body.appendChild(container);
    
    // Wait for fonts to load
    await document.fonts.ready;
    
    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: quality,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight
    });
    
    // Remove temporary container
    document.body.removeChild(container);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });
    
    // Calculate dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    let heightLeft = imgHeight;
    let position = margin;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }
    
    // Save PDF
    pdf.save(filename);
    
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