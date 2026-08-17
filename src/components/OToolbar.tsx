import React, { useState } from 'react';
import { 
  FileText, 
  Save, 
  FileSpreadsheet,
  Loader2,
  Printer,
  Database,
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
  Wand2,
  FileTextIcon,
  GitBranch,
  Workflow,
  FileImage
} from 'lucide-react';
import { ExportService } from '@/utils/exportUtils';
import { useEditorStore, EditorMode } from '@/stores/editorStore';

import { DiagramExportService } from '@/utils/diagramExport';
import OThemeToggle from './OThemeToggle';
import DatabaseManagementModal from './DatabaseManagementModal';
import { PdfExportModal, DocumentExportModalOptions } from './PdfExportModal';
import { messageBox } from '@/utils/messageBox';
import '../styles/print.css';

interface OToolbarProps {
  className?: string;
  onFormatText?: (format: string, value?: string) => void;
  fontSize?: number;
  fontFamily?: string;
  onFontSizeChange?: (size: number) => void;
  onFontFamilyChange?: (family: string) => void;
}

// Mode Button Component
interface ModeButtonProps {
  mode: EditorMode;
  currentMode: EditorMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'blue' | 'orange' | 'purple';
}

const ModeButton: React.FC<ModeButtonProps> = ({ 
  mode, 
  currentMode, 
  onClick, 
  icon, 
  label, 
  color 
}) => {
  const isActive = currentMode === mode;
  
  const colorClasses = {
    blue: {
      active: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600',
      inactive: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/50'
    },
    orange: {
      active: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600',
      inactive: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/50'
    },
    purple: {
      active: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600',
      inactive: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/50'
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium
        transition-all duration-200 ease-in-out
        ${isActive ? colorClasses[color].active : colorClasses[color].inactive}
      `}
      title={`Switch to ${label} mode`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

const OToolbar: React.FC<OToolbarProps> = ({ 
  className = '',
  onFormatText,
  fontSize = 14,
  onFontSizeChange,
  onFontFamilyChange
}) => {
  const { 
    currentDocument, 
    documents, 
    saveDocument,
    currentMode,
    switchMode,
    content
  } = useEditorStore();
  
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showFontOptions, setShowFontOptions] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [plantUMLTheme, setPlantUMLTheme] = useState<string>('default');

  // Font options
  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32];
  const fontFamilies = [
    { name: 'Monospace', value: 'monospace' },
    { name: 'Sarabun', value: 'Sarabun, sans-serif' },
    { name: 'Kanit', value: 'Kanit, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' }
  ];

  // PlantUML themes
  const plantUMLThemes = [
    { name: 'Default', value: 'default' },
    { name: 'amiga', value: 'amiga' },
    { name: 'aws-orange', value: 'aws-orange' },
    { name: 'black-knight', value: 'black-knight' },
    { name: 'bluegray', value: 'bluegray' },
    { name: 'blueprint', value: 'blueprint' },
    { name: 'carbon-gray', value: 'carbon-gray' },
    { name: 'cerulean', value: 'cerulean' },
    { name: 'cloudscape-design', value: 'cloudscape-design' },
    { name: 'crt-amber', value: 'crt-amber' },
    { name: 'cyborg', value: 'cyborg' },
    { name: 'hacker', value: 'hacker' },
    { name: 'lightgray', value: 'lightgray' },
    { name: 'mars', value: 'mars' },
    { name: 'materia', value: 'materia' },
    { name: 'metal', value: 'metal' },
    { name: 'mimeograph', value: 'mimeograph' },
    { name: 'minty', value: 'minty' },
    { name: 'mono', value: 'mono' },
    { name: 'none', value: 'none' },
    { name: 'plain', value: 'plain' },
    { name: 'reddress-darkblue', value: 'reddress-darkblue' },
    { name: 'reddress-lightblue', value: 'reddress-lightblue' },
    { name: 'sandstone', value: 'sandstone' },
    { name: 'silver', value: 'silver' },
    { name: 'sketchy', value: 'sketchy' },
    { name: 'spacelab', value: 'spacelab' },
    { name: 'Sunlust', value: 'Sunlust' },
    { name: 'superhero', value: 'superhero' },
    { name: 'toy', value: 'toy' },
    { name: 'united', value: 'united' },
    { name: 'vibrant', value: 'vibrant' }
  ];

  // Detect current PlantUML theme from content
  React.useEffect(() => {
    if (currentMode === 'plantuml' && content) {
      const themeMatch = content.match(/^\s*!theme\s+(\S+)/m);
      if (themeMatch) {
        setPlantUMLTheme(themeMatch[1]);
      } else {
        setPlantUMLTheme('default');
      }
    }
  }, [currentMode, content]);

  // Handle PlantUML theme change
  const handlePlantUMLThemeChange = (newTheme: string) => {
    if (currentMode !== 'plantuml') return;
    
    setPlantUMLTheme(newTheme);
    
    let newContent = content;
    const themeRegex = /^(\s*)!theme\s+\S+/m;
    const startumlMatch = newContent.match(/(@startuml)/i);
    
    if (newTheme === 'default') {
      // Remove theme directive if exists
      newContent = newContent.replace(themeRegex, '');
    } else {
      const themeDirective = `!theme ${newTheme}`;
      
      if (themeRegex.test(newContent)) {
        // Replace existing theme
        newContent = newContent.replace(themeRegex, themeDirective);
      } else if (startumlMatch) {
        // Add theme after @startuml
        const startumlIndex = startumlMatch.index! + startumlMatch[0].length;
        newContent = 
          newContent.slice(0, startumlIndex) + 
          '\n' + themeDirective + 
          newContent.slice(startumlIndex);
      }
    }
    
    // Update content in store
    useEditorStore.getState().setContent(newContent);
  };

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
        await messageBox.error('Failed to save document');
      } finally {
        setIsExporting(null);
      }
    }
  };

  const handleAdjustSyntax = () => onFormatText?.('adjustSyntax');

  const handleExportMarkdown = async () => {
    try {
      setIsExporting('markdown');

      // ใช้ source ล่าสุดจาก editor store เสมอ
      let sourceContent = content || '';

      // รองรับทั้ง 3 โหมด: ห่อด้วย fenced block เมื่อเป็น Mermaid/PlantUML
      if (currentMode === 'mermaid') {
        sourceContent = `\`\`\`mermaid\n${sourceContent}\n\`\`\``;
      } else if (currentMode === 'plantuml') {
        sourceContent = `\`\`\`plantuml\n${sourceContent}\n\`\`\``;
      }

      const filename = (currentDocument?.title || 'Untitled') + '.md';
      ExportService.exportAsMarkdown(sourceContent, filename);
    } catch (error) {
      console.error('Failed to export markdown:', error);
      await messageBox.error('Failed to export markdown file');
    } finally {
      setIsExporting(null);
    }
  };

  const [exportModalFormat, setExportModalFormat] = useState<'pdf' | 'docx'>('pdf');

  const handleOpenPdfModal = (format: 'pdf' | 'docx' = 'pdf') => {
    if ((content || '').trim().length === 0) {
      messageBox.warning(`ไม่มีเนื้อหาสำหรับ export ${format.toUpperCase()}`);
      return;
    }
    setExportModalFormat(format);
    setShowPdfModal(true);
  };

  const handlePdfModalExport = async (options: DocumentExportModalOptions) => {
    const docTitle = currentDocument?.title || 'Untitled';
    try {
      if (options.exportFormat === 'docx') {
        setIsExporting('docx');
        await ExportService.exportAsDOCX(
          content || '',
          docTitle,
          `${docTitle}.docx`,
          {
            useTemplate: options.useTemplate,
            metadata: {
              created: currentDocument?.createdAt,
              updated: currentDocument?.updatedAt,
            },
          }
        );
      } else {
        setIsExporting('print');
        await ExportService.exportAsPDF(
          content || '',
          docTitle,
          `${docTitle}.pdf`,
          options
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      await messageBox.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งออกเอกสาร');
    } finally {
      setIsExporting(null);
    }
  };



  const handleExportDOCX = async () => {
    if ((content || '').trim().length === 0) {
      await messageBox.warning('ไม่มีเนื้อหาสำหรับส่งออก DOCX');
      return;
    }

    try {
      setIsExporting('docx');
      const docTitle = currentDocument?.title || 'Untitled';
      await ExportService.exportAsDOCX(
        content || '',
        docTitle,
        `${docTitle}.docx`,
        {
          metadata: {
            created: currentDocument?.createdAt,
            updated: currentDocument?.updatedAt,
          },
        }
      );
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      await messageBox.error('เกิดข้อผิดพลาดในการส่งออก DOCX');
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
      await messageBox.error('Failed to export Excel file');
    } finally {
      setIsExporting(null);
    }
  };

  // Diagram export handler (SVG only)


  const handleExportDiagramSVG = async () => {
    if ((content || '').trim().length === 0) {
      await messageBox.warning('ไม่มีเนื้อหาสำหรับส่งออก');
      return;
    }

    try {
      setIsExporting('diagram-svg');
      
      if (currentMode === 'mermaid') {
        if (!DiagramExportService.validateDiagramForExport('mermaid')) {
          await messageBox.warning('ไม่พบ Mermaid diagram ที่จะ export กรุณาตรวจสอบว่า diagram แสดงผลอย่างถูกต้อง');
          return;
        }
        
        await DiagramExportService.exportMermaidDiagram({
          format: 'svg',
          filename: `${currentDocument?.title || 'mermaid-diagram'}.svg`
        });
      } else if (currentMode === 'plantuml') {
        const sourceContent = content || '';
        if (!DiagramExportService.validateDiagramForExport('plantuml', sourceContent)) {
          await messageBox.warning('ไม่มีเนื้อหา PlantUML ที่จะ export');
          return;
        }
        
        await DiagramExportService.exportPlantUMLDiagram(sourceContent, {
          format: 'svg',
          filename: `${currentDocument?.title || 'plantuml-diagram'}.svg`
        });
      }
    } catch (error) {
      console.error('Failed to export diagram as SVG:', error);
      await messageBox.error(`เกิดข้อผิดพลาดในการส่งออก SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      flex items-center gap-3 px-4 py-2 
      bg-white dark:bg-gray-800 
      border-b border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* Mode Selector */}
      <div className="flex items-center gap-1 mr-2">
        <ModeButton
          mode="markdown"
          currentMode={currentMode}
          onClick={() => switchMode('markdown')}
          icon={<FileText className="w-4 h-4" />}
          label="Markdown"
          color="blue"
        />
        <ModeButton
          mode="mermaid"
          currentMode={currentMode}
          onClick={() => switchMode('mermaid')}
          icon={<GitBranch className="w-4 h-4" />}
          label="Mermaid"
          color="orange"
        />
        <ModeButton
          mode="plantuml"
          currentMode={currentMode}
          onClick={() => switchMode('plantuml')}
          icon={<Workflow className="w-4 h-4" />}
          label="PlantUML"
          color="purple"
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* File Operations */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={handleSave}
          icon={<Save className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Save Document (Ctrl+S)"
          disabled={false}
          loading={isExporting === 'save'}
        />
        <ToolbarButton
          onClick={handleAdjustSyntax}
          icon={<Wand2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="ปรับ Markdown Syntax (Ctrl+M)"
          disabled={false}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Font Controls */}
      <div className="flex items-center gap-2 relative">
        {/* PlantUML Theme Selector - Only show in PlantUML mode */}
        {currentMode === 'plantuml' && (
          <select
            value={plantUMLTheme}
            onChange={(e) => handlePlantUMLThemeChange(e.target.value)}
            className="
              px-2 py-1 text-sm rounded
              bg-white dark:bg-gray-800
              border border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300
              focus:outline-none focus:ring-2 focus:ring-purple-500
            "
            title="PlantUML Theme"
          >
            {plantUMLThemes.map(theme => (
              <option key={theme.value} value={theme.value}>
                {theme.name === 'Default' ? 'No Theme' : theme.name}
              </option>
            ))}
          </select>
        )}

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
          disabled={false}
        />
        
        <ToolbarButton
          onClick={handleItalic}
          icon={<Italic className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Italic (Ctrl+I)"
          disabled={false}
        />
        
        <ToolbarButton
          onClick={handleUnderline}
          icon={<Underline className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Underline (Ctrl+U)"
          disabled={false}
        />
        
        <ToolbarButton
          onClick={handleStrikethrough}
          icon={<Strikethrough className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Strikethrough"
          disabled={false}
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
          disabled={false}
        />
        
        <ToolbarButton
          onClick={() => handleHeading(2)}
          icon={<Heading2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Heading 2"
          disabled={false}
        />
        
        <ToolbarButton
          onClick={() => handleHeading(3)}
          icon={<Heading3 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Heading 3"
          disabled={false}
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
          disabled={false}
        />
        
        <ToolbarButton
          onClick={() => handleList(true)}
          icon={<ListOrdered className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Ordered List"
          disabled={false}
        />
        
        <ToolbarButton
          onClick={handleCode}
          icon={<Code className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Inline Code"
          disabled={false}
        />
        
        <ToolbarButton
          onClick={handleCodeBlock}
          icon={<Code2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="Code Block"
          disabled={false}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Export Operations */}
      <div className="flex items-center gap-2">
        {/* Save As Markdown - สำหรับทั้ง 3 โหมด ใช้ source ล่าสุด */}
        <ToolbarButton
          onClick={handleExportMarkdown}
          icon={<FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          title="บันทึกเป็น Markdown (.md)"
          disabled={(content || '').trim().length === 0}
          loading={isExporting === 'markdown'}
        />
        {/* Standard Export Buttons (for Markdown mode) */}
        {currentMode === 'markdown' && (
          <>
            <ToolbarButton
              onClick={() => handleOpenPdfModal('pdf')}
              icon={<Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              title="Export PDF (ตั้งค่าจัดหน้า & Header/Footer)"
              disabled={(content || '').trim().length === 0}
              loading={isExporting === 'print'}
            />
            
            <ToolbarButton
              onClick={() => handleOpenPdfModal('docx')}
              icon={<FileTextIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              title="ส่งออกเป็น DOCX (เลือก Template & ตั้งค่าจัดหน้า)"
              disabled={(content || '').trim().length === 0}
              loading={isExporting === 'docx'}
            />
            
            <ToolbarButton
              onClick={handleExportExcel}
              icon={<FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              title="Export All as Excel"
              disabled={documents.length === 0}
              loading={isExporting === 'excel'}
            />
          </>
        )}

        {/* Diagram Export Buttons (for Mermaid and PlantUML modes) */}
        {(currentMode === 'mermaid' || currentMode === 'plantuml') && (
          <>
            <ToolbarButton
              onClick={handleExportDiagramSVG}
              icon={<FileImage className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              title={`ส่งออก ${currentMode === 'mermaid' ? 'Mermaid' : 'PlantUML'} diagram เป็น SVG`}
              disabled={(content || '').trim().length === 0}
              loading={isExporting === 'diagram-svg'}
            />
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Database Tools */}
      <ToolbarButton
        onClick={() => setShowDatabaseModal(true)}
        icon={<Database className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
        title="Database Management Tools"
        disabled={false}
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Theme Toggle */}
      <OThemeToggle />

      {/* Database Management Modal */}
      {showDatabaseModal && (
        <DatabaseManagementModal
          isOpen={showDatabaseModal}
          onClose={() => setShowDatabaseModal(false)}
        />
      )}

      {/* PDF / Document Export Modal */}
      {showPdfModal && (
        <PdfExportModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          onExport={handlePdfModalExport}
          defaultTitle={currentDocument?.title || 'Untitled'}
          initialFormat={exportModalFormat}
        />
      )}
    </div>
  );
};

export default OToolbar;