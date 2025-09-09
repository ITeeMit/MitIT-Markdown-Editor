import React, { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { ThemeProvider } from '@/contexts/ThemeContext';
import OToolbar from '@/components/OToolbar';
import OFileManager from '@/components/OFileManager';
import OMarkdownEditor from '@/components/OMarkdownEditor';
import OPreviewPanel from '@/components/OPreviewPanel';
import { Menu, X } from 'lucide-react';

const Home: React.FC = () => {
  const { initializeDatabase, documents, createDocument, currentDocument, setContent } = useEditorStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');

  // Initialize database and create default document if needed
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        
        // Create a welcome document if no documents exist
        if (documents.length === 0) {
          await createDocument({
            FTMdcTitle: 'Welcome to MitIT Markdown Editor',
            FTMdcContent: `# Welcome to Markdown Editor

This is a powerful markdown editor with real-time preview capabilities.

## Features

- **Real-time Preview**: See your markdown rendered as HTML instantly
- **Auto-save**: Your work is automatically saved as you type
- **Export Options**: Export to PDF, Excel, or Markdown files
- **Import Support**: Import existing markdown files
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Works offline with PWA capabilities

## Getting Started

1. Start typing in the editor panel on the left
2. See the live preview on the right
3. Use the toolbar to save, import, or export your documents
4. Create new documents using the file manager

## Markdown Syntax Examples

### Headers
\`\`\`
# H1 Header
## H2 Header
### H3 Header
\`\`\`

### Lists
- Unordered list item 1
- Unordered list item 2
  - Nested item

1. Ordered list item 1
2. Ordered list item 2

### Code
Inline \`code\` and code blocks:

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

### Links and Images
[Link text](https://example.com)
![Alt text](https://via.placeholder.com/300x200)

### Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | More     |
| Row 2    | Data     | More     |

### Blockquotes
> This is a blockquote
> It can span multiple lines

---

Happy writing! 🚀`,
            FTMdcTags: ['welcome'],
            FNMdcSize: 0,
            FBMdcFavorite: false,
            FDMdcCreated: new Date(),
            FDMdcModified: new Date(),
            // Legacy properties for compatibility
            title: 'Welcome to MitIT Markdown Editor',
            content: `# Welcome to Markdown Editor

This is a powerful markdown editor with real-time preview capabilities.

## Features

- **Real-time Preview**: See your markdown rendered as HTML instantly
- **Auto-save**: Your work is automatically saved as you type
- **Export Options**: Export to PDF, Excel, or Markdown files
- **Import Support**: Import existing markdown files
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Works offline with PWA capabilities

## Getting Started

1. Start typing in the editor panel on the left
2. See the live preview on the right
3. Use the toolbar to save, import, or export your documents
4. Create new documents using the file manager

## Markdown Syntax Examples

### Headers
\`\`\`
# H1 Header
## H2 Header
### H3 Header
\`\`\`

### Lists
- Unordered list item 1
- Unordered list item 2
  - Nested item

1. Ordered list item 1
2. Ordered list item 2

### Code
Inline \`code\` and code blocks:

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

### Links and Images
[Link text](https://example.com)
![Alt text](https://via.placeholder.com/300x200)

### Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | More     |
| Row 2    | Data     | More     |

### Blockquotes
> This is a blockquote
> It can span multiple lines

---

Happy writing! 🚀`,
            tags: ['welcome']
          });
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [initializeDatabase, documents.length, createDocument]);

  // Format text function
  const handleFormatText = (format: string, value?: string | number) => {
    if (!currentDocument) return;

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let newText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        newCursorPos = selectedText ? start + newText.length : start + 2;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        newCursorPos = selectedText ? start + newText.length : start + 1;
        break;
      case 'underline':
        newText = `<u>${selectedText}</u>`;
        newCursorPos = selectedText ? start + newText.length : start + 3;
        break;
      case 'strikethrough':
        newText = `~~${selectedText}~~`;
        newCursorPos = selectedText ? start + newText.length : start + 2;
        break;
      case 'heading':
        const level = value as number;
        const headingPrefix = '#'.repeat(level) + ' ';
        newText = `${headingPrefix}${selectedText}`;
        newCursorPos = start + headingPrefix.length + selectedText.length;
        break;
      case 'list':
        const isOrdered = typeof value === 'boolean' ? value : false;
        const listPrefix = isOrdered ? '1. ' : '- ';
        newText = `${listPrefix}${selectedText}`;
        newCursorPos = start + listPrefix.length + selectedText.length;
        break;
      case 'code':
        newText = `\`${selectedText}\``;
        newCursorPos = selectedText ? start + newText.length : start + 1;
        break;
      case 'codeblock':
        newText = `\`\`\`\n${selectedText}\n\`\`\``;
        newCursorPos = selectedText ? start + newText.length : start + 4;
        break;
      default:
        return;
    }

    const updatedContent = beforeText + newText + afterText;
    setContent(updatedContent);

    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Markdown Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        {/* Toolbar */}
        <OToolbar 
          fontSize={fontSize}
          fontFamily={fontFamily}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onFormatText={handleFormatText}
        />
        
        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* File Manager Sidebar */}
          <div className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static
            fixed left-0 top-0 z-50
            w-80 h-full
            transition-transform duration-300 ease-in-out
            lg:transition-none
          `}>
            <div className="h-full flex flex-col">
              {/* Mobile Header */}
              <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  File Manager
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              <OFileManager className="flex-1" />
            </div>
          </div>
          
          {/* Editor and Preview */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed top-20 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {/* Editor Panel */}
            <div className="flex-1 lg:flex-1" onClick={() => console.log('🔥 Editor panel clicked!')}>
              <OMarkdownEditor 
                fontSize={fontSize}
                fontFamily={fontFamily}
                onFormatText={handleFormatText}
              />
            </div>
            
            {/* Preview Panel - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:block md:flex-1">
              <OPreviewPanel />
            </div>
          </div>
        </div>
        
        {/* Status Bar with MitIT Watermark */}
        <div className="relative bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentDocument ? `Document: ${currentDocument.title}` : 'No document selected'}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono opacity-60 hover:opacity-100 transition-opacity">
              MitIT
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Home;