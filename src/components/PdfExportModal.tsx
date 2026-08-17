import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Layout,
  Palette,
  AlignLeft,
  Download,
  Loader2,
  Check,
  Type,
  Sparkles,
  Layers,
  FileCode,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { PdfEngineOptions, THEME_PRESETS } from '@/utils/pdfEngine';

export interface DocumentExportModalOptions extends PdfEngineOptions {
  useTemplate?: boolean;
  exportFormat?: 'pdf' | 'docx';
}

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: DocumentExportModalOptions) => Promise<void>;
  defaultTitle?: string;
  initialFormat?: 'pdf' | 'docx';
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  defaultTitle = 'Document',
  initialFormat = 'pdf',
}) => {
  const [activeTab, setActiveTab] = useState<'template' | 'theme' | 'layout' | 'headerFooter'>('template');
  const [isExporting, setIsExporting] = useState(false);

  // Form State
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>(initialFormat);

  useEffect(() => {
    if (isOpen && initialFormat) {
      setExportFormat(initialFormat);
    }
  }, [isOpen, initialFormat]);
  const [useTemplate, setUseTemplate] = useState<boolean>(true);
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [theme, setTheme] = useState<'modern' | 'corporate' | 'minimal' | 'emerald'>('modern');
  const [fontFamily, setFontFamily] = useState<'Sarabun' | 'Kanit' | 'Prompt' | 'Inter'>('Sarabun');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'normal' | 'compact' | 'spacious'>('normal');
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [pageNumberFormat, setPageNumberFormat] = useState<'th' | 'en' | 'simple'>('th');

  if (!isOpen) return null;

  const handleExportClick = async () => {
    try {
      setIsExporting(true);
      await onExport({
        exportFormat,
        useTemplate,
        title,
        subtitle,
        author,
        theme,
        fontFamily,
        paperSize,
        orientation,
        margin,
        showHeader,
        showFooter,
        headerText: headerText || title,
        footerText,
        pageNumberFormat,
        date: new Date().toLocaleDateString('th-TH'),
      });
      onClose();
    } catch (err) {
      console.error('Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                ส่งออกเอกสาร (Export Document)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                  Smart Pagination
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                เลือกรูปแบบการส่งออก (PDF / DOCX) ตัวเลือก Template และการจัดวางประโยค
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/30 dark:bg-gray-900/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'template'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            รูปแบบ & Template
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'theme'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            ธีม & การจัดประโยค
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'layout'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Layout className="w-4 h-4" />
            ขนาดกระดาษ & ระยะขอบ
          </button>
          <button
            onClick={() => setActiveTab('headerFooter')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'headerFooter'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            Header & Footer
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: TEMPLATE & FORMAT SELECTOR */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              {/* Export Format Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ฟอร์แมตไฟล์ที่ต้องการส่งออก (Export File Format)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      exportFormat === 'pdf'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">PDF Document (.pdf)</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">จัดหน้าแม่นยำ ไม่เพี้ยน รองรับการพิมพ์</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('docx')}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      exportFormat === 'docx'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">MS Word Document (.docx)</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">นำไปแก้ไขต่อใน Microsoft Word ได้สะดวก</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Template Mode Options */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ตัวเลือกการใช้ Template โครงร่าง
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: No Template / Dynamic Engine */}
                  <button
                    type="button"
                    onClick={() => setUseTemplate(false)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      !useTemplate
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                          แนะนำ (Recommended)
                        </span>
                        {!useTemplate && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                        ⚡ ไม่ใช้ Template (Smart Pagination Engine)
                      </h4>
                      <p className="text-xs text-gray-550 dark:text-gray-400 leading-relaxed">
                        ปรับแต่งธีมสี แผงผังขอบกระดาษ ฟอนต์ภาษาไทย และการจัดวางประโยคได้อย่างอิสระ พร้อมระบบแบ่งหน้าอัจฉริยะไม่ให้ข้อความขาดครึ่ง
                      </p>
                    </div>
                  </button>

                  {/* Option B: Use Company Template */}
                  <button
                    type="button"
                    onClick={() => setUseTemplate(true)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      useTemplate
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold">
                          Official Template
                        </span>
                        {useTemplate && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                        🏢 ใช้ Template มาตรฐาน (adasoft-template.docx)
                      </h4>
                      <p className="text-xs text-gray-550 dark:text-gray-400 leading-relaxed">
                        ห่อเอกสารด้วยโครงร่างแม่แบบทางการของบริษัท พร้อมโลโก้ หัวกระดาษ และรูปเล่มมาตรฐาน Adasoft
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-semibold">Smart Pagination Active</span>: ในโหมดไม่ใช้ Template เอกสารจะถูกคำนวณระยะบรรทัดและเว้นวรรคประโยคภาษาไทยให้อัตโนมัติ เพื่อความสวยงามสูงสุดในการอ่านและการพิมพ์
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEME & TYPOGRAPHY */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Document Meta Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ชื่อเอกสาร (Document Title)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ใส่ชื่อเอกสาร..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    หัวข้อย่อย / แผนก (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="เช่น รายงานประจำเดือน..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ธีมและโทนสีเอกสาร
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(
                    [
                      { id: 'modern', name: 'Modern Blue', color: '#2563eb' },
                      { id: 'corporate', name: 'Corporate Deep', color: '#1e40af' },
                      { id: 'minimal', name: 'Minimal Slate', color: '#475569' },
                      { id: 'emerald', name: 'Emerald Clean', color: '#059669' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        theme === t.id
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {theme === t.id && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-gray-500" /> แบบอักษร (Font Family & Thai Typography)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { id: 'Sarabun', label: 'Sarabun (ทางการ)' },
                    { id: 'Kanit', label: 'Kanit (ทันสมัย)' },
                    { id: 'Prompt', label: 'Prompt (เรียบหรู)' },
                    { id: 'Inter', label: 'Inter (English)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id as any)}
                      className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                        fontFamily === f.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Typography Live Sentence Layout Preview */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                    ตัวอย่างการจัดวางประโยคภาษาไทย (Sentence Layout Preview):
                  </span>
                  <div
                    className="text-xs text-gray-800 dark:text-gray-200 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                    style={{
                      fontFamily: `'${fontFamily}', sans-serif`,
                      lineHeight: '1.85',
                      textAlign: 'justify',
                      letterSpacing: '0.012em',
                    }}
                  >
                    <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                      สถาปัตยกรรมระบบ AdaPos+ Unified Platform
                    </h3>
                    โครงการขยายระบบบริหารจัดการการจองตั๋วและจุดขาย POS อย่างสมบูรณ์แบบ ช่วยลดความหน่วงของข้อมูล
                    และเชื่อมต่อระบบสารสนเทศได้อย่างไร้รอยต่อ มีความเร็วสูงและเพิ่มประสิทธิภาพการทำงาน
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LAYOUT & MARGINS */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* Paper Size & Orientation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ขนาดกระดาษ (Paper Size)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'a4', label: 'A4 (210 x 297 mm)' },
                      { id: 'letter', label: 'Letter (8.5 x 11 in)' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPaperSize(p.id as any)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          paperSize === p.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    แนวการวางกระดาษ (Orientation)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'portrait', label: 'แนวตั้ง (Portrait)' },
                      { id: 'landscape', label: 'แนวนอน (Landscape)' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setOrientation(o.id as any)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          orientation === o.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Margins */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ระยะขอบกระดาษ (Margins)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'compact', label: 'แคบ (12mm)', desc: 'เน้นพื้นที่เนื้อหามาก' },
                    { id: 'normal', label: 'ปานกลาง (18mm)', desc: 'มาตรฐานเอกสารทั่วไป' },
                    { id: 'spacious', label: 'กว้าง (25mm)', desc: 'เน้นความโปร่งสบาย' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMargin(m.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        margin === m.id
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-0.5">{m.label}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEADER & FOOTER */}
          {activeTab === 'headerFooter' && (
            <div className="space-y-6">
              {/* Header Settings */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showHeader}
                      onChange={(e) => setShowHeader(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    แสดงหัวกระดาษ (Header)
                  </label>
                  <span className="text-[10px] text-gray-500">แสดงทุกหน้าของ PDF</span>
                </div>

                {showHeader && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      ข้อความด้านซ้ายใน Header
                    </label>
                    <input
                      type="text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder={title || 'ข้อความหัวกระดาษ...'}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Footer Settings */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showFooter}
                      onChange={(e) => setShowFooter(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    แสดงท้ายกระดาษ (Footer)
                  </label>
                  <span className="text-[10px] text-gray-500">แสดงทุกหน้าของ PDF</span>
                </div>

                {showFooter && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        ข้อความท้ายกระดาษด้านซ้าย (Left Footer Note)
                      </label>
                      <input
                        type="text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="เช่น เอกสารชั้นความลับ • แผนกพัฒนา..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                        รูปแบบการรันเลขหน้า (Page Number Format)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'th', label: 'หน้า X จาก Y' },
                          { id: 'en', label: 'Page X of Y' },
                          { id: 'simple', label: 'X / Y' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setPageNumberFormat(f.id as any)}
                            className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              pageNumberFormat === f.id
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังสร้างไฟล์เอกสาร...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                ส่งออกเอกสาร ({exportFormat.toUpperCase()})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
