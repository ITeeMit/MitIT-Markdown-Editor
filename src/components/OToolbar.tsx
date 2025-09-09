import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  FileText, 
  Save, 
  FolderOpen,
  FileSpreadsheet,
  Loader2,
  Printer,
  FileDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Code2,
  Type,
  Palette
} from 'lucide-react';
import { marked } from 'marked';
import { ExportService } from '@/utils/exportUtils';
import { useEditorStore } from '@/stores/editorStore';
import { quickExportPDF } from '@/utils/pdfExport';
import OThemeToggle from './OThemeToggle';
import '../styles/print.css';

interface OToolbarProps {
  className?: string;
  onFormatText?: (format: string, value?: string) => void;
  fontSize?: number;
  fontFamily?: string;
  onFontSizeChange?: (size: number) => void;
  onFontFamilyChange?: (family: string) => void;
}

const OToolbar: React.FC<OToolbarProps> = ({ 
  className = '',
  onFormatText,
  fontSize = 14,
  fontFamily = 'monospace',
  onFontSizeChange,
  onFontFamilyChange
}) => {
  const { 
    currentDocument, 
    documents, 
    saveDocument, 
    createDocument,
    updateDocument 
  } = useEditorStore();
  
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showFontOptions, setShowFontOptions] = useState(false);

  // Font options
  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32];
  const fontFamilies = [
    { name: 'Monospace', value: 'monospace' },
    { name: 'Sarabun', value: 'Sarabun, sans-serif' },
    { name: 'Kanit', value: 'Kanit, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' }
  ];

  // Format text functions
  const handleBold = () => onFormatText?.('bold');
  const handleItalic = () => onFormatText?.('italic');
  const handleUnderline = () => onFormatText?.('underline');
  const handleStrikethrough = () => onFormatText?.('strikethrough');
  const handleHeading = (level: number) => onFormatText?.('heading', level.toString());
  const handleList = (ordered: boolean) => onFormatText?.(ordered ? 'orderedList' : 'unorderedList');
  const handleCode = () => onFormatText?.('code');
  const handleCodeBlock = () => onFormatText?.('codeBlock');

  const handleSave = async () => {
    if (currentDocument) {
      try {
        setIsExporting('save');
        await saveDocument();
      } catch (error) {
        console.error('Failed to save document:', error);
        alert('Failed to save document');
      } finally {
        setIsExporting(null);
      }
    }
  };

  const handleImport = async () => {
    try {
      setIsExporting('import');
      const { content, filename } = await ExportService.importMarkdownFile();
      
      // Create new document with imported content
      const newDoc = {
        FTMdcTitle: filename || 'Imported Document',
        FTMdcContent: content,
        FTMdcTags: ['imported'],
        FNMdcSize: content.length,
        FBMdcFavorite: false,
        FDMdcCreated: new Date(),
        FDMdcModified: new Date(),
        // Legacy properties for compatibility
        title: filename || 'Imported Document',
        content: content,
        tags: ['imported']
      };
      
      await createDocument(newDoc);
    } catch (error) {
      console.error('Failed to import file:', error);
      if (error instanceof Error && error.message !== 'No file selected') {
        alert('Failed to import file');
      }
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportMarkdown = async () => {
    if (!currentDocument) {
      alert('No document to export');
      return;
    }

    try {
      setIsExporting('markdown');
      ExportService.exportAsMarkdown(
        currentDocument.content,
        currentDocument.title
      );
    } catch (error) {
      console.error('Failed to export markdown:', error);
      alert('Failed to export markdown file');
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = async () => {
    if (!currentDocument) {
      alert('ไม่มีเนื้อหาสำหรับพิมพ์');
      return;
    }

    try {
      setIsExporting('print');
      
      // Convert markdown to HTML
      const htmlContent = await marked(currentDocument.content);
      
      // Add print-specific class to body
      document.body.classList.add('printing');
      
      // Create a new window for printing with the content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาตป๊อปอัพ');
        document.body.classList.remove('printing');
        return;
      }

      // Create print-specific CSS
      const printCSS = `
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

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>พิมพ์เอกสาร - ${currentDocument.title}</title>
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
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        document.body.classList.remove('printing');
      }, 1000);
      
      console.log('เปิดหน้าต่างพิมพ์แล้ว');
    } catch (error) {
      console.error('Print error:', error);
      document.body.classList.remove('printing');
      alert('เกิดข้อผิดพลาดในการพิมพ์');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!currentDocument) {
      alert('ไม่มีเนื้อหาสำหรับส่งออก PDF');
      return;
    }

    try {
      setIsExporting('pdf');
      await quickExportPDF(
        currentDocument.content,
        `${currentDocument.title}.pdf`
      );
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก PDF');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      ExportService.exportAsExcel(documents, 'markdown-documents');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel file');
    } finally {
      setIsExporting(null);
    }
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    disabled?: boolean;
    loading?: boolean;
  }> = ({ onClick, icon, title, disabled = false, loading = false }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="
        flex items-center justify-center
        w-10 h-10 rounded-lg
        bg-white hover:bg-gray-50
        dark:bg-gray-800 dark:hover:bg-gray-700
        border border-gray-300 dark:border-gray-600
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      title={title}
      aria-label={title}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin" />
      ) : (
        icon
      )}
    </button>
  );

  return (
    <div className={`
      flex items-center gap-2 p-3
      bg-white dark:bg-gray-800
      border-b border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* File Operations */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={handleSave}
          icon={<Save className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Save Document (Ctrl+S)"
          disabled={!currentDocument}
          loading={isExporting === 'save'}
        />
        
        <ToolbarButton
          onClick={handleImport}
          icon={<Upload className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Import Markdown File"
          loading={isExporting === 'import'}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Font Controls */}
      <div className="flex items-center gap-2 relative">
        <ToolbarButton
          onClick={() => setShowFontOptions(!showFontOptions)}
          icon={<Type className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Font Options"
        />
        
        {/* Font Size Selector */}
        <select
          value={fontSize}
          onChange={(e) => onFontSizeChange?.(parseInt(e.target.value))}
          className="
            px-2 py-1 text-sm rounded
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            text-gray-700 dark:text-gray-300
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          title="Font Size"
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
        
        {/* Font Family Dropdown */}
        {showFontOptions && (
          <div className="
            absolute top-12 left-0 z-50
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg shadow-lg p-2 min-w-48
          ">
            {fontFamilies.map(font => (
              <button
                key={font.value}
                onClick={() => {
                  onFontFamilyChange?.(font.value);
                  setShowFontOptions(false);
                }}
                className="
                  w-full text-left px-3 py-2 rounded
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  text-sm text-gray-700 dark:text-gray-300
                "
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Text Formatting */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={handleBold}
          icon={<Bold className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Bold (Ctrl+B)"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={handleItalic}
          icon={<Italic className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Italic (Ctrl+I)"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={handleUnderline}
          icon={<Underline className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Underline (Ctrl+U)"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={handleStrikethrough}
          icon={<Strikethrough className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Strikethrough"
          disabled={!currentDocument}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Headers */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => handleHeading(1)}
          icon={<Heading1 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Heading 1"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={() => handleHeading(2)}
          icon={<Heading2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Heading 2"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={() => handleHeading(3)}
          icon={<Heading3 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Heading 3"
          disabled={!currentDocument}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Lists and Code */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={() => handleList(false)}
          icon={<List className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Unordered List"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={() => handleList(true)}
          icon={<ListOrdered className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Ordered List"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={handleCode}
          icon={<Code className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Inline Code"
          disabled={!currentDocument}
        />
        
        <ToolbarButton
          onClick={handleCodeBlock}
          icon={<Code2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Code Block"
          disabled={!currentDocument}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Export Operations */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={handleExportMarkdown}
          icon={<FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Export as Markdown"
          disabled={!currentDocument}
          loading={isExporting === 'markdown'}
        />
        
        <ToolbarButton
          onClick={handleExportPDF}
          icon={<FileDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="ส่งออกเป็น PDF (รองรับภาษาไทยและ Markdown)"
          disabled={!currentDocument}
          loading={isExporting === 'pdf'}
        />
        
        <ToolbarButton
          onClick={handlePrint}
          icon={<Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="พิมพ์เอกสาร (ใช้ Print Dialog ของเบราว์เซอร์)"
          disabled={!currentDocument}
          loading={isExporting === 'print'}
        />
        
        <ToolbarButton
          onClick={handleExportExcel}
          icon={<FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Export All as Excel"
          disabled={documents.length === 0}
          loading={isExporting === 'excel'}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <OThemeToggle />
    </div>
  );
};

export default OToolbar;