import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Replace } from 'lucide-react';

interface FindReplaceDialogProps {
  isOpen: boolean;
  mode: 'find' | 'replace';
  onClose: () => void;
  onFind: (searchText: string, direction: 'next' | 'prev', isNewSearch?: boolean, caseSensitive?: boolean) => void;
  onReplace: (searchText: string, replaceText: string, replaceAll: boolean, caseSensitive: boolean) => void;
  currentMatch?: number;
  totalMatches?: number;
}

const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  isOpen,
  mode,
  onClose,
  onFind,
  onReplace,
  currentMatch = 0,
  totalMatches = 0
}) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [lastSearchText, setLastSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Removed auto-search on text change to prevent infinite loop
  // Search is now triggered only by user actions (Enter, buttons)
  
  // Trigger search when searchText or caseSensitive changes
  useEffect(() => {
    if (searchText && searchText !== lastSearchText) {
      // New search text - trigger search from beginning
      setLastSearchText(searchText);
      onFind(searchText, 'next', true, caseSensitive);
    } else if (searchText && caseSensitive !== undefined) {
      // Case sensitivity changed - re-run search
      onFind(searchText, 'next', true, caseSensitive);
    }
  }, [searchText, caseSensitive]);
  
  // Reset last search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLastSearchText('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFind(searchText, 'prev', false, caseSensitive);
      } else {
        onFind(searchText, 'next', false, caseSensitive);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-600 rounded-md m-2 p-3 min-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {mode === 'find' ? 'Find' : 'Find & Replace'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-2">
        <div className="flex items-center gap-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-find-search
          />
          <button
            onClick={() => onFind(searchText, 'prev', false, caseSensitive)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            disabled={!searchText || totalMatches === 0}
            title="Previous (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => onFind(searchText, 'next', false, caseSensitive)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            disabled={!searchText || totalMatches === 0}
            title="Next (Enter)"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        {searchText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {totalMatches > 0 ? `${currentMatch} of ${totalMatches}` : 'No results'}
          </div>
        )}
      </div>

      {/* Replace Input (only in replace mode) */}
      {mode === 'replace' && (
        <div className="mb-2">
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Replace"
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      )}

      {/* Options */}
      <div className="mb-3">
        <label className="flex items-center text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="mr-2"
          />
          Case sensitive
        </label>
      </div>

      {/* Action Buttons (only in replace mode) */}
      {mode === 'replace' && (
        <div className="flex gap-2">
          <button
            onClick={() => onReplace(searchText, replaceText, false, caseSensitive)}
            disabled={!searchText || totalMatches === 0}
            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Replace
          </button>
          <button
            onClick={() => onReplace(searchText, replaceText, true, caseSensitive)}
            disabled={!searchText || totalMatches === 0}
            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Replace size={14} />
            Replace All
          </button>
        </div>
      )}
    </div>
  );
};

export default FindReplaceDialog;
