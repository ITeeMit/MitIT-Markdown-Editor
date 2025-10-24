import React, { useEffect, useState, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { useEditorStore } from '@/stores/editorStore';
import { Eye, EyeOff } from 'lucide-react';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';

interface OPreviewPanelProps {
  className?: string;
}

const OPreviewPanel: React.FC<OPreviewPanelProps> = ({ className = '' }) => {
  const { currentDocument, content, currentMode } = useEditorStore();
  const [isVisible, setIsVisible] = useState(true);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const plantumlRef = useRef<HTMLDivElement>(null);

  // Configure marked options for better rendering
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace'
    });
  }, []);

  // Render content based on current mode
  const renderContent = useMemo(() => {
    const currentContent = content || currentDocument?.content || '';
    
    if (!currentContent) {
      return '<div class="empty-state"><p>Start writing to see the preview...</p></div>';
    }

    switch (currentMode) {
      case 'markdown':
        try {
          return marked(currentContent);
        } catch (error) {
          console.error('Markdown parsing error:', error);
          return '<div class="error-state"><p>Error parsing markdown</p></div>';
        }
      
      case 'mermaid':
        return `<div id="mermaid-preview" class="mermaid-container">${currentContent}</div>`;
      
      case 'plantuml':
        return `<div id="plantuml-preview" class="plantuml-container">${currentContent}</div>`;
      
      default:
        return '<div class="empty-state"><p>Unknown mode</p></div>';
    }
  }, [content, currentDocument?.content, currentMode]);

  // Handle Mermaid rendering
  useEffect(() => {
    if (currentMode === 'mermaid' && mermaidRef.current) {
      const currentContent = content || currentDocument?.content || '';
      
      if (currentContent.trim()) {
        try {
          // Clear previous content
          mermaidRef.current.innerHTML = '';
          
          // Extract mermaid code from markdown code blocks
          let mermaidCode = currentContent;
          const mermaidMatch = currentContent.match(/```mermaid\n([\s\S]*?)\n```/);
          if (mermaidMatch) {
            mermaidCode = mermaidMatch[1];
          }
          
          // Render mermaid diagram
          mermaid.render('mermaid-diagram', mermaidCode).then(({ svg }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          }).catch((error) => {
            console.error('Mermaid rendering error:', error);
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = '<div class="error-state"><p>Error rendering Mermaid diagram</p></div>';
            }
          });
        } catch (error) {
          console.error('Mermaid processing error:', error);
          mermaidRef.current.innerHTML = '<div class="error-state"><p>Error processing Mermaid diagram</p></div>';
        }
      }
    }
  }, [currentMode, content, currentDocument?.content]);

  // Handle PlantUML rendering
  useEffect(() => {
    if (currentMode === 'plantuml' && plantumlRef.current) {
      const currentContent = content || currentDocument?.content || '';
      
      if (currentContent.trim()) {
        try {
          // Clear previous content
          plantumlRef.current.innerHTML = '';
          
          // Extract PlantUML code from markdown code blocks or use raw content
          let plantumlCode = currentContent;
          const plantumlMatch = currentContent.match(/```plantuml\n([\s\S]*?)\n```/);
          if (plantumlMatch) {
            plantumlCode = plantumlMatch[1];
          }
          
          // Encode PlantUML code
          const encoded = plantumlEncoder.encode(plantumlCode);
          
          // Create PlantUML server URL (using public PlantUML server)
          const plantumlUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
          
          // Create image element to display the diagram
          const img = document.createElement('img');
          img.src = plantumlUrl;
          img.alt = 'PlantUML Diagram';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '0 auto';
          
          // Handle image load success
          img.onload = () => {
            if (plantumlRef.current) {
              plantumlRef.current.innerHTML = '';
              plantumlRef.current.appendChild(img);
            }
          };
          
          // Handle image load error
          img.onerror = () => {
            if (plantumlRef.current) {
              plantumlRef.current.innerHTML = `
                <div class="plantuml-error">
                  <p><strong>PlantUML Rendering Error</strong></p>
                  <p>Unable to render the PlantUML diagram. Please check your syntax.</p>
                  <details>
                    <summary>PlantUML Code</summary>
                    <pre class="plantuml-code">${plantumlCode}</pre>
                  </details>
                </div>
              `;
            }
          };
          
          // Show loading state
          plantumlRef.current.innerHTML = `
            <div class="plantuml-loading">
              <p>Rendering PlantUML diagram...</p>
            </div>
          `;
          
        } catch (error) {
          console.error('PlantUML processing error:', error);
          if (plantumlRef.current) {
            plantumlRef.current.innerHTML = `
              <div class="plantuml-error">
                <p><strong>PlantUML Processing Error</strong></p>
                <p>Error processing PlantUML diagram: ${error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            `;
          }
        }
      } else {
        // Show empty state
        plantumlRef.current.innerHTML = `
          <div class="plantuml-empty">
            <p>Enter PlantUML code to see the diagram preview...</p>
          </div>
        `;
      }
    }
  }, [currentMode, content, currentDocument?.content]);

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
      
      /* Mermaid specific styles */
      .mermaid-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        padding: 1rem;
      }
      
      .mermaid-container svg {
        max-width: 100%;
        height: auto;
      }
      
      /* PlantUML specific styles */
      .plantuml-container {
        padding: 1rem;
      }
      
      .plantuml-preview {
        background-color: #f8fafc;
        border-radius: 0.5rem;
        padding: 1rem;
        border: 1px solid #e2e8f0;
      }
      
      .dark .plantuml-preview {
        background-color: #1e293b;
        border-color: #475569;
      }
      
      .plantuml-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        color: #6b7280;
        font-style: italic;
      }
      
      .plantuml-error {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        padding: 0.75rem;
        color: #dc2626;
      }
      
      .dark .plantuml-error {
        background-color: #7f1d1d;
        border-color: #dc2626;
        color: #fecaca;
      }
      
      .plantuml-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #9ca3af;
        font-style: italic;
      }
      
      .dark .plantuml-empty {
        color: #6b7280;
      }
      
      .plantuml-code {
        background-color: #f1f5f9;
        padding: 1rem;
        border-radius: 0.375rem;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.875rem;
        line-height: 1.5;
        overflow-x: auto;
        white-space: pre-wrap;
        color: #374151;
      }
      
      .dark .plantuml-code {
        background-color: #334155;
        color: #f1f5f9;
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
          Preview - {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
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
          {currentMode === 'mermaid' ? (
            <div ref={mermaidRef} className="mermaid-container" />
          ) : currentMode === 'plantuml' ? (
            <div ref={plantumlRef} className="plantuml-container" />
          ) : (
            <div 
              className="preview-content"
              dangerouslySetInnerHTML={{ 
                __html: previewStyles + renderContent 
              }}
            />
          )}
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
          <span>Previewing: {currentDocument.title}</span>
        ) : (
          <span>No document selected</span>
        )}
      </div>
    </div>
  );
};

export default OPreviewPanel;