import React, { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { ThemeProvider } from '@/contexts/ThemeContext';
import OToolbar from '@/components/OToolbar';
import OFileManager from '@/components/OFileManager';
import OMarkdownEditor from '@/components/OMarkdownEditor';
import OPreviewPanel from '@/components/OPreviewPanel';
import ResizablePanel from '@/components/ResizablePanel';
import CollapsibleSidebar from '@/components/CollapsibleSidebar';
import { Toaster } from '@/components/ui/Toaster';
import MessageBox from '@/components/ui/MessageBox';
import { messageBox } from '@/utils/messageBox';
import { Menu, X } from 'lucide-react';

const Home: React.FC = () => {
  const { initializeDatabase, createDocument, currentDocument, setContent } = useEditorStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');

  // Initialize database
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [initializeDatabase]);

  // Function to create the welcome document
  const createWelcomeDocument = async () => {
    try {
      await createDocument({
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
        tags: ['welcome'],
        mode: 'markdown'
      });
      
      // Set the welcome document as current
      // setCurrentDocument(welcomeDoc);
    } catch (error) {
      console.error('Failed to create welcome document:', error);
      await messageBox.error('Failed to create welcome document');
    }
  };

  // Format text function
  const handleFormatText = (format: string, value?: string | number) => {
    // อนุญาตให้จัดรูปแบบแม้ยังไม่มีเอกสารที่ active
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let newText = '';
    let newCursorPos = start;

    const convertAgencyDoc = (text: string) => {
      const lines = text.replace(/\r\n?/g, '\n').split('\n');
      const out: string[] = [];
      let i = 0; let section = '';
      const push = (s: string) => out.push(s);
      const next = () => (i < lines.length ? lines[i].trim() : '');
      const take = () => lines[i++] || '';
      const splitCols = (s: string) => s.split(/\t+|\s{2,}/).map(t => t.trim()).filter(Boolean);
      const isTableHeaderCandidate = (s: string) => {
        if (!s || /^\*\s/.test(s) || /^\-\s/.test(s) || /^\d+[\.|\)|-]\s+/.test(s) || /^\|/.test(s) || /^#{1,6}\s/.test(s)) return false;
        const cols = splitCols(s);
        return cols.length >= 2;
      };
      while (i < lines.length && /ปรับเป็น markdown format/i.test(next())) i++;
      if (i < lines.length) { push(`# ${next()}`); i++; push(''); }
      while (i < lines.length) {
        const s = next(); if (!s) { take(); push(''); continue; }
        if (/^\d+\.0\s/.test(s)) { section = s.match(/^\d+\.0/)![0]; push(`## ${s}`); take(); push(''); continue; }
        if (/^\d+\.\d+\s/.test(s)) { push(`### ${s}`); take(); push(''); continue; }
        if (/^\*\s+([^:]+):\s*(.+)/.test(s)) { const m = s.match(/^\*\s+([^:]+):\s*(.+)/)!; push(`- **${m[1].trim()}**: ${m[2].trim()}  `); take(); continue; }
        if (/^\*\s+(.+)/.test(s)) { push(`- ${s.replace(/^\*\s+/, '')}`); take(); continue; }
        if (section.startsWith('3.0') && /^\*\s+([^:]+):\s*(.+)/.test(s)) { const m = s.match(/^\*\s+([^:]+):\s*(.+)/)!; push(`- **${m[1].trim()}**: ${m[2].trim()}`); take(); continue; }
        if (isTableHeaderCandidate(s)) {
          const headerRaw = take();
          const headerCols = splitCols(headerRaw);
          push('| ' + headerCols.map(c => `**${c}**`).join(' | ') + ' |');
          push('|' + headerCols.map(() => '---').join(' | ') + ' |');
          while (i < lines.length) {
            const r = lines[i].trim();
            if (!r || /^\d+\.0\s/.test(r) || /^\d+\.\d+\s/.test(r) || /^\*\s/.test(r) || /^\-\s/.test(r)) break;
            const cols = splitCols(lines[i]);
            if (cols.length < 2) break;
            const cells = headerCols.map((_, idx) => (idx < cols.length ? cols[idx] : ''));
            push('| ' + cells.join(' | ') + ' |');
            i++;
          }
          push('');
          continue;
        }
        if (/^\d+[\.|\)|-]\s+/.test(s)) { const m = s.match(/^(\d+)[\.|\)|-]\s+(.*)$/)!; push(`${m[1]}. ${m[2]}`); take(); continue; }
        if (/^ผู้รับผิดชอบหลัก:\s*(.+)/.test(s)) { const m = s.match(/^ผู้รับผิดชอบหลัก:\s*(.+)/)!; push(`**ผู้รับผิดชอบหลัก**: ${m[1]}`); take(); continue; }
        push(take());
      }
      return out.join('\n');
    };

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
      case 'heading': {
        const levelNum = Number(value) || 1;
        const headingPrefix = '#'.repeat(levelNum) + ' ';
        newText = `${headingPrefix}${selectedText}`;
        newCursorPos = start + headingPrefix.length + selectedText.length;
        break;
      }
      case 'orderedList': {
        const listPrefix = '1. ';
        newText = `${listPrefix}${selectedText}`;
        newCursorPos = start + listPrefix.length + selectedText.length;
        break;
      }
      case 'unorderedList': {
        const listPrefix = '- ';
        newText = `${listPrefix}${selectedText}`;
        newCursorPos = start + listPrefix.length + selectedText.length;
        break;
      }
      case 'list': {
        const isOrdered = typeof value === 'boolean' ? value : false;
        const listPrefix = isOrdered ? '1. ' : '- ';
        newText = `${listPrefix}${selectedText}`;
        newCursorPos = start + listPrefix.length + selectedText.length;
        break;
      }
      case 'code':
        newText = `\`${selectedText}\``;
        newCursorPos = selectedText ? start + newText.length : start + 1;
        break;
      case 'codeBlock':
      case 'codeblock':
        newText = `\`\`\`\n${selectedText}\n\`\`\``;
        newCursorPos = selectedText ? start + newText.length : start + 4;
        break;
      case 'adjustSyntax': {
        const scope = selectedText && selectedText.length > 0 ? selectedText : textarea.value;
        const converted = convertAgencyDoc(scope);
        if (selectedText && selectedText.length > 0) {
          newText = converted;
          newCursorPos = start + converted.length;
          const updatedContent = beforeText + newText + afterText;
          setContent(updatedContent);
        } else {
          setContent(converted);
          newCursorPos = converted.length;
        }
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        return;
      }
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
          
          {/* File Manager Sidebar - Collapsible on desktop, mobile overlay */}
          <div className="hidden lg:block">
            <CollapsibleSidebar>
              <OFileManager createWelcomeDocument={createWelcomeDocument} />
            </CollapsibleSidebar>
          </div>
          
          {/* Mobile sidebar */}
          <div className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:hidden fixed left-0 top-0 z-50
            w-80 h-full
            transition-transform duration-300 ease-in-out
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
              
              <OFileManager className="flex-1" createWelcomeDocument={createWelcomeDocument} />
            </div>
          </div>
          
          {/* Editor and Preview - Resizable */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed top-20 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {/* Resizable Editor and Preview */}
            <ResizablePanel
              leftPanel={
                <OMarkdownEditor 
                  onFormatText={handleFormatText}
                />
              }
              rightPanel={<OPreviewPanel />}
              initialLeftWidth={50}
              minLeftWidth={30}
              maxLeftWidth={70}
            />
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
        
        {/* Toast Notifications */}
        <Toaster />
        <MessageBox />
      </div>
    </ThemeProvider>
  );
};

export default Home;
