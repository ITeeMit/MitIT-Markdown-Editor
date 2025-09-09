import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface OMarkdownEditorProps {
  className?: string;
  placeholder?: string;
  fontSize?: number;
  fontFamily?: string;
  onFormatText?: (format: string, value?: string | number) => void;
}

const OMarkdownEditor: React.FC<OMarkdownEditorProps> = ({ 
  className = '',
  placeholder = 'Start writing your markdown here...',
  fontSize = 14,
  fontFamily = 'Inter, system-ui, sans-serif',
  onFormatText
}) => {

  const { 
    currentDocument, 
    content,
    setContent, 
    saveCurrentDocument 
  } = useEditorStore();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle content changes with auto-save
  const handleContentChange = useCallback((newContent: string) => {
    if (currentDocument) {
      // Update content immediately in store
      console.log('Content changing from', content?.length || 0, 'to', newContent.length, 'characters');
      setContent(newContent);
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new auto-save timeout (2 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveCurrentDocument();
      }, 2000);
    }
  }, [currentDocument, content, setContent, saveCurrentDocument]);

  // Handle textarea input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    handleContentChange(newContent);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S for manual save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      console.log('Manual save triggered');
      saveCurrentDocument();
      return;
    }

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          onFormatText?.('bold');
          return;
        case 'i':
          e.preventDefault();
          onFormatText?.('italic');
          return;
        case 'u':
          e.preventDefault();
          onFormatText?.('underline');
          return;
        case '`':
          e.preventDefault();
          onFormatText?.('code');
          return;
      }
    }

    // Tab handling for better UX
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      // Insert tab character
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      handleContentChange(newValue);
      
      // Set cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  // Adjust height when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Focus textarea when document changes
  useEffect(() => {
    if (textareaRef.current && currentDocument) {
      textareaRef.current.focus();
    }
  }, [currentDocument?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <textarea
        ref={textareaRef}
        value={content || ''}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your markdown here..."
        className="flex-1 p-4 border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        style={{
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5'
        }}
      />
      
      {/* Status bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
        <span>Lines: {(content || '').split('\n').length}</span>
        <span>Characters: {(content || '').length}</span>
      </div>
    </div>
  );
};

export default OMarkdownEditor;