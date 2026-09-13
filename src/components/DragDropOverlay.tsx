import React from 'react';
import { Upload, FileText, Sparkles, Image, FileCode } from 'lucide-react';

interface DragDropOverlayProps {
  isVisible: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-blue-900/20 dark:bg-black/60 backdrop-blur-md pointer-events-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl p-8 bg-white/95 dark:bg-gray-900/95 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-4 transform scale-100 transition-all">
        {/* Animated Icon */}
        <div className="relative">
          <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 animate-bounce">
            <Upload className="w-12 h-12" />
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            วางไฟล์ที่นี่เพื่อเปิดหรือนำเข้าเอกสาร
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag & Drop to Open or Import Documents Instantly
          </p>
        </div>

        {/* Supported formats badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <FileText className="w-3.5 h-3.5" /> Markdown (.md, .markdown)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <FileCode className="w-3.5 h-3.5" /> Text (.txt, .json, .csv)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" /> Diagram (.puml, .mermaid)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <Image className="w-3.5 h-3.5" /> Image (.png, .jpg)
          </span>
        </div>
      </div>
    </div>
  );
};

export default DragDropOverlay;
