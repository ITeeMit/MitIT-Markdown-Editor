import React, { useEffect, useState, useMemo } from 'react';
import { marked } from 'marked';
import { useEditorStore } from '@/stores/editorStore';
import { Eye, EyeOff } from 'lucide-react';

interface OPreviewPanelProps {
  className?: string;
}

const OPreviewPanel: React.FC<OPreviewPanelProps> = ({ className = '' }) => {
  const { currentDocument, content } = useEditorStore();
  const [isVisible, setIsVisible] = useState(true);

  // Configure marked options for better rendering
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }, []);

  // Convert markdown to HTML
  const convertedHtml = useMemo(() => {
    // ใช้ content จาก store เป็นหลัก เพื่อให้ live preview ทำงานแบบ real-time
    const markdownContent = content || currentDocument?.FTMdcContent || currentDocument?.content || '';
    if (!markdownContent) {
      return '<div class="empty-state"><p>Start writing to see the preview...</p></div>';
    }
    
    try {
      return marked(markdownContent);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<div class="error-state"><p>Error parsing markdown</p></div>';
    }
  }, [content, currentDocument?.FTMdcContent, currentDocument?.content]);

  // Custom CSS for preview styling
  const previewStyles = `
    <style>
      .preview-content {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #374151;
        max-width: none;
      }
      
      .dark .preview-content {
        color: #f3f4f6;
      }
      
      .preview-content h1 {
        font-size: 2rem;
        font-weight: 700;
        margin: 1.5rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
        color: #1f2937;
      }
      
      .dark .preview-content h1 {
        color: #f9fafb;
        border-bottom-color: #4b5563;
      }
      
      .preview-content h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 1.25rem 0 0.75rem 0;
        color: #374151;
      }
      
      .dark .preview-content h2 {
        color: #e5e7eb;
      }
      
      .preview-content h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 1rem 0 0.5rem 0;
        color: #4b5563;
      }
      
      .dark .preview-content h3 {
        color: #d1d5db;
      }
      
      .preview-content p {
        margin: 0.75rem 0;
        line-height: 1.7;
      }
      
      .preview-content ul, .preview-content ol {
        margin: 0.75rem 0;
        padding-left: 1.5rem;
      }
      
      .preview-content li {
        margin: 0.25rem 0;
      }
      
      .preview-content blockquote {
        margin: 1rem 0;
        padding: 0.75rem 1rem;
        border-left: 4px solid #3b82f6;
        background-color: #f8fafc;
        font-style: italic;
      }
      
      .dark .preview-content blockquote {
        background-color: #1e293b;
        border-left-color: #60a5fa;
      }
      
      .preview-content code {
        background-color: #f1f5f9;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.875rem;
        color: #dc2626;
      }
      
      .dark .preview-content code {
        background-color: #334155;
        color: #fca5a5;
      }
      
      .preview-content pre {
        background-color: #f8fafc;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 1rem 0;
        border: 1px solid #e2e8f0;
      }
      
      .dark .preview-content pre {
        background-color: #1e293b;
        border-color: #475569;
      }
      
      .preview-content pre code {
        background-color: transparent;
        padding: 0;
        color: inherit;
      }
      
      .preview-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      
      .preview-content th, .preview-content td {
        border: 1px solid #e5e7eb;
        padding: 0.5rem 0.75rem;
        text-align: left;
      }
      
      .dark .preview-content th, .dark .preview-content td {
        border-color: #4b5563;
      }
      
      .preview-content th {
        background-color: #f9fafb;
        font-weight: 600;
      }
      
      .dark .preview-content th {
        background-color: #374151;
      }
      
      .preview-content a {
        color: #3b82f6;
        text-decoration: underline;
      }
      
      .dark .preview-content a {
        color: #60a5fa;
      }
      
      .preview-content img {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
        margin: 1rem 0;
      }
      
      .preview-content hr {
        border: none;
        border-top: 2px solid #e5e7eb;
        margin: 2rem 0;
      }
      
      .dark .preview-content hr {
        border-top-color: #4b5563;
      }
      
      .empty-state, .error-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #9ca3af;
        font-style: italic;
      }
      
      .dark .empty-state, .dark .error-state {
        color: #6b7280;
      }
    </style>
  `;

  if (!isVisible) {
    return (
      <div className={`
        flex items-center justify-center h-full
        bg-white dark:bg-gray-900
        border-l border-gray-200 dark:border-gray-700
        ${className}
      `}>
        <button
          onClick={() => setIsVisible(true)}
          className="
            flex items-center gap-2 px-4 py-2
            bg-blue-500 hover:bg-blue-600
            text-white rounded-lg
            transition-colors duration-200
          "
        >
          <Eye className="w-4 h-4" />
          Show Preview
        </button>
      </div>
    );
  }

  return (
    <div className={`
      flex flex-col h-full
      bg-white dark:bg-gray-900
      border-l border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* Preview Header */}
      <div className="
        flex items-center justify-between p-4
        border-b border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800
      ">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Preview
        </h3>
        
        <button
          onClick={() => setIsVisible(false)}
          className="
            flex items-center gap-2 px-3 py-1
            text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-gray-100
            transition-colors duration-200
          "
          title="Hide Preview"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div 
            className="preview-content"
            dangerouslySetInnerHTML={{ 
              __html: previewStyles + convertedHtml 
            }}
          />
        </div>
      </div>

      {/* Preview Status */}
      <div className="
        px-4 py-2
        bg-gray-50 dark:bg-gray-800
        border-t border-gray-200 dark:border-gray-700
        text-xs text-gray-500 dark:text-gray-400
      ">
        {currentDocument ? (
          <span>Previewing: {currentDocument.FTMdcTitle || currentDocument.title}</span>
        ) : (
          <span>No document selected</span>
        )}
      </div>
    </div>
  );
};

export default OPreviewPanel;