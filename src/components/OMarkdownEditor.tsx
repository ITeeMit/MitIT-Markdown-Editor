import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import FindReplaceDialog from './FindReplaceDialog';

interface OMarkdownEditorProps {
  onFormatText?: (format: string, value?: string | number) => void;
}

const OMarkdownEditor: React.FC<OMarkdownEditorProps> = ({ 
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
  
  // Find & Replace state
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [lastSearchText, setLastSearchText] = useState('');

  // Handle content changes with auto-save
  const handleContentChange = useCallback((newContent: string) => {
    // Update content immediately in store
    console.log('Content changing from', content?.length || 0, 'to', newContent.length, 'characters');
    setContent(newContent);

    // Only schedule auto-save when a document is active
    if (currentDocument) {
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
    // Ctrl+F for Find
    if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'f' || e.code === 'KeyF')) {
      e.preventDefault();
      setFindReplaceMode('find');
      setFindReplaceOpen(true);
      return;
    }

    // Ctrl+H for Replace
    if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'h' || e.code === 'KeyH')) {
      e.preventDefault();
      setFindReplaceMode('replace');
      setFindReplaceOpen(true);
      return;
    }

    // Ctrl+S for manual save
    if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 's' || e.code === 'KeyS')) {
      e.preventDefault();
      console.log('Manual save triggered');
      saveCurrentDocument();
      return;
    }

    // Layout-agnostic keyboard shortcuts using physical key codes
    if (e.ctrlKey || e.metaKey) {
      const code = e.code; // e.g., 'KeyB', 'KeyI', 'KeyU', 'Backquote'
      const key = (e.key || '').toLowerCase();

      if (code === 'KeyB' || key === 'b') {
        e.preventDefault();
        onFormatText?.('bold');
        return;
      }
      if (code === 'KeyI' || key === 'i') {
        e.preventDefault();
        onFormatText?.('italic');
        return;
      }
      if (code === 'KeyU' || key === 'u') {
        e.preventDefault();
        onFormatText?.('underline');
        return;
      }
      if (code === 'KeyM' || key === 'm') {
        e.preventDefault();
        onFormatText?.('adjustSyntax');
        return;
      }
      if (code === 'Backquote' || key === '`') {
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

  // Find functionality
  const handleFind = useCallback((searchText: string, direction: 'next' | 'prev', isNewSearch: boolean = false) => {
    if (!searchText || !content) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    // Determine if this is truly a new search
    const isActuallyNewSearch = isNewSearch || searchText !== lastSearchText;
    
    if (isActuallyNewSearch) {
      setLastSearchText(searchText);
    }

    // Always recalculate matches for new search
    const matches: number[] = [];
    const text = content;
    const search = searchText;
    
    let index = text.indexOf(search);
    while (index !== -1) {
      matches.push(index);
      index = text.indexOf(search, index + 1);
    }

    setSearchMatches(matches);

    if (matches.length > 0) {
      const textarea = textareaRef.current;
      if (textarea) {
        let newIndex;
        
        if (isActuallyNewSearch) {
          // New search: start from beginning
          newIndex = 0;
        } else if (direction === 'next') {
          // Navigate to next match
          newIndex = (currentMatchIndex + 1) % matches.length;
        } else {
          // Navigate to previous match
          newIndex = currentMatchIndex - 1 < 0 ? matches.length - 1 : currentMatchIndex - 1;
        }
        
        setCurrentMatchIndex(newIndex);
        const matchPos = matches[newIndex];
        
        // Highlight the match without stealing focus from search input
        textarea.setSelectionRange(matchPos, matchPos + searchText.length);
        
        // Scroll to match
        const targetScroll = (matchPos / content.length) * textarea.scrollHeight;
        textarea.scrollTop = targetScroll - textarea.clientHeight / 2;
      }
    } else {
      setCurrentMatchIndex(0);
    }
  }, [content, currentMatchIndex, lastSearchText]);

  // Replace functionality
  const handleReplace = useCallback((searchText: string, replaceText: string, replaceAll: boolean, caseSensitive: boolean) => {
    if (!searchText || !content) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    if (replaceAll) {
      // Escape special regex characters
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(escapedSearch, flags);
      const newContent = content.replace(regex, replaceText);
      handleContentChange(newContent);
      
      // Clear highlights after replace all
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      setLastSearchText('');
      
      // Clear selection
      setTimeout(() => {
        if (textarea) {
          textarea.setSelectionRange(0, 0);
        }
      }, 0);
    } else {
      // Replace current match only
      if (searchMatches.length > 0 && currentMatchIndex < searchMatches.length) {
        const matchPos = searchMatches[currentMatchIndex];
        const before = content.substring(0, matchPos);
        const after = content.substring(matchPos + searchText.length);
        const newContent = before + replaceText + after;
        handleContentChange(newContent);
        
        // After replacing, find next match with updated content
        setTimeout(() => {
          // Manually recalculate matches with new content
          const text = newContent;
          const search = searchText;
          const newMatches: number[] = [];
          
          let index = text.indexOf(search);
          while (index !== -1) {
            newMatches.push(index);
            index = text.indexOf(search, index + 1);
          }
          
          if (newMatches.length > 0) {
            setSearchMatches(newMatches);
            // Stay at same index or wrap to 0 if we're at the end
            const nextIndex = currentMatchIndex < newMatches.length ? currentMatchIndex : 0;
            setCurrentMatchIndex(nextIndex);
            
            // Highlight next match
            const nextMatchPos = newMatches[nextIndex];
            textarea.setSelectionRange(nextMatchPos, nextMatchPos + searchText.length);
          } else {
            // No more matches
            setSearchMatches([]);
            setCurrentMatchIndex(0);
            setLastSearchText('');
            textarea.setSelectionRange(0, 0);
          }
        }, 0);
      }
    }
  }, [content, searchMatches, currentMatchIndex, handleContentChange]);

  // Reset search when dialog closes
  const handleCloseFindReplace = useCallback(() => {
    setFindReplaceOpen(false);
    setSearchMatches([]);
    setCurrentMatchIndex(0);
    setLastSearchText('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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
    <div className="h-full flex flex-col relative">
      {/* Find & Replace Dialog */}
      <FindReplaceDialog
        isOpen={findReplaceOpen}
        mode={findReplaceMode}
        onClose={handleCloseFindReplace}
        onFind={handleFind}
        onReplace={handleReplace}
        currentMatch={currentMatchIndex + 1}
        totalMatches={searchMatches.length}
      />
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