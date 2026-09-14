import { useEditorStore, EditorMode } from '@/stores/editorStore';
import { csvToMarkdownTable } from './csvUtils';
import { messageBox } from './messageBox';

export interface ProcessFileResult {
  docId?: string;
  title: string;
  mode: EditorMode;
  isImage?: boolean;
  imageMarkdown?: string;
}

const MERMAID_DIAGRAM_KEYWORDS = [
  'graph',
  'flowchart',
  'sequencediagram',
  'classdiagram',
  'statediagram',
  'statediagram-v2',
  'erdiagram',
  'gantt',
  'pie',
  'gitgraph',
  'mindmap',
  'timeline',
  'quadrantchart',
  'sankey-beta',
  'block-beta',
  'packet-beta',
  'kanban',
  'architecture-beta',
  'requirementdiagram',
  'zenuml',
  'xychart-beta',
  'c4context',
  'c4container',
  'c4component',
  'c4dynamic',
  'c4deployment',
];

/**
 * Check if the content is exclusively a PlantUML diagram.
 * It must be a complete @start... to @end... block (or single plantuml code block)
 * with no external markdown headings or prose before/after.
 */
function isPurePlantUml(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // Case 1: Wrapped exclusively in a single ```plantuml ... ``` code block
  const codeBlockMatch = trimmed.match(/^```(?:plantuml|puml|uml)\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    // Inner must be plantuml syntax
    return /^\s*@start(uml|mindmap|wbs|gantt|json|yaml|ditaa|dot|latex|chen)\b/i.test(inner) ||
      /@end(uml|mindmap|wbs|gantt|json|yaml|ditaa|dot|latex|chen)\s*$/i.test(inner) ||
      inner.length > 0;
  }

  // Case 2: Raw PlantUML content starting with @start... and ending with @end...
  // Check that there is no markdown heading (# ) before @start or after @end
  const startMatch = trimmed.match(/^\s*@start(uml|mindmap|wbs|gantt|json|yaml|ditaa|dot|latex|chen)\b/i);
  const endMatch = trimmed.match(/@end(uml|mindmap|wbs|gantt|json|yaml|ditaa|dot|latex|chen)\s*$/i);

  if (startMatch && endMatch) {
    return true;
  }

  return false;
}

/**
 * Check if the content is exclusively a Mermaid diagram.
 * It must be exclusively a mermaid code block or raw mermaid syntax with no external markdown prose/headings.
 */
function isPureMermaid(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // Case 1: Wrapped exclusively in a single ```mermaid ... ``` code block with nothing before/after
  const singleCodeBlockMatch = trimmed.match(/^```mermaid\s*([\s\S]*?)\s*```$/i);
  if (singleCodeBlockMatch) {
    return true;
  }

  // If there are multiple code blocks or any code block mixed with text, it's not pure mermaid
  if (trimmed.includes('```')) {
    return false;
  }

  // Strip leading YAML frontmatter if present at the top (e.g. --- title: ... ---)
  let normalized = trimmed;
  if (normalized.startsWith('---')) {
    const frontmatterEnd = normalized.indexOf('---', 3);
    if (frontmatterEnd !== -1) {
      normalized = normalized.slice(frontmatterEnd + 3).trim();
    } else {
      return false;
    }
  }

  // Check if content has Markdown headings (# Heading), which mermaid raw diagrams do not use
  const lines = normalized.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^#{1,6}\s+\S+/.test(line)) {
      return false;
    }
  }

  // Find the first non-comment keyword line
  let firstKeywordLine = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('%%')) continue;
    firstKeywordLine = line;
    break;
  }

  if (!firstKeywordLine) return false;

  // Extract the first word before whitespace or delimiter
  const firstWord = firstKeywordLine.split(/[\s(:{\[]/)[0].toLowerCase();
  return MERMAID_DIAGRAM_KEYWORDS.includes(firstWord);
}

/**
 * Detect appropriate Editor Mode based on file extension and content.
 * Defaults to 'markdown' if content contains both markdown and diagrams,
 * or if it has any markdown formatting.
 * Only selects 'mermaid' or 'plantuml' if the file is exclusively a diagram.
 */
export function detectEditorMode(filename: string, content: string): EditorMode {
  const lowerName = filename.toLowerCase().trim();
  const trimmedContent = (content || '').trim();

  // 1. Explicit diagram file extensions
  if (lowerName.endsWith('.puml') || lowerName.endsWith('.plantuml') || lowerName.endsWith('.iuml')) {
    return 'plantuml';
  }
  if (lowerName.endsWith('.mermaid') || lowerName.endsWith('.mmd')) {
    return 'mermaid';
  }

  // If empty content, default to markdown
  if (!trimmedContent) {
    return 'markdown';
  }

  // 2. Check if content is exclusively a PlantUML diagram
  if (isPurePlantUml(trimmedContent)) {
    return 'plantuml';
  }

  // 3. Check if content is exclusively a Mermaid diagram
  if (isPureMermaid(trimmedContent)) {
    return 'mermaid';
  }

  // 4. Default to Markdown mode (which properly renders full markdown + embedded mermaid/plantuml blocks)
  return 'markdown';
}

/**
 * Read File as text with UTF-8 support
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Read File as Base64 Data URL (for images)
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Process a single dropped or uploaded file
 */
export async function processSingleFile(
  file: File,
  targetProjectId?: string
): Promise<ProcessFileResult | null> {
  const fileName = file.name;
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '') || 'Untitled';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Handle Image Files (embed as Markdown Image Data URL)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension) || file.type.startsWith('image/')) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const imageMarkdown = `![${cleanTitle}](${dataUrl})\n`;
      return {
        title: cleanTitle,
        mode: 'markdown',
        isImage: true,
        imageMarkdown,
      };
    } catch (err) {
      console.error('Failed to read image file:', err);
      return null;
    }
  }

  // 2. Handle Text / Markdown / Code Files
  const textExtensions = [
    'md', 'markdown', 'mdown', 'mkdn', 'txt', 'text', 'csv', 'json', 
    'puml', 'plantuml', 'uml', 'mermaid', 'mmd', 'js', 'ts', 'jsx', 
    'tsx', 'html', 'css', 'xml', 'yaml', 'yml', 'sql', 'py', 'sh'
  ];

  const isTextLike = textExtensions.includes(extension) || file.type.startsWith('text/') || file.type === '';

  if (!isTextLike) {
    throw new Error(`ไฟล์ "${fileName}" ไม่ใช่ไฟล์ข้อความหรือ Markdown ที่รองรับ`);
  }

  try {
    let fileContent = await readFileAsText(file);

    // If CSV file, convert to Markdown Table
    if (extension === 'csv') {
      fileContent = csvToMarkdownTable(fileContent, { title: cleanTitle });
    }

    const mode = detectEditorMode(fileName, fileContent);
    const createDocument = useEditorStore.getState().createDocument;

    const docId = await createDocument({
      title: cleanTitle,
      content: fileContent,
      tags: [extension || 'text'],
      mode: mode,
      folderId: targetProjectId,
    });

    return {
      docId,
      title: cleanTitle,
      mode,
    };
  } catch (error) {
    console.error(`Failed to process file ${fileName}:`, error);
    throw error;
  }
}

/**
 * Process multiple dropped files
 */
export async function processDroppedFiles(
  files: FileList | File[],
  targetProjectId?: string
): Promise<{ successCount: number; lastDocId?: string; images: string[] }> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) {
    return { successCount: 0, images: [] };
  }

  let successCount = 0;
  let lastDocId: string | undefined;
  const images: string[] = [];
  const errors: string[] = [];

  for (const file of fileArray) {
    try {
      const result = await processSingleFile(file, targetProjectId);
      if (result) {
        if (result.isImage && result.imageMarkdown) {
          images.push(result.imageMarkdown);
        } else if (result.docId) {
          lastDocId = result.docId;
          successCount++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
    }
  }

  // If new documents were created, switch to the last imported one
  if (lastDocId) {
    const documents = useEditorStore.getState().documents;
    const targetDoc = documents.find((d) => d.id === lastDocId);
    if (targetDoc) {
      useEditorStore.getState().setCurrentDocument(targetDoc);
    }
  }

  // Show summary toast
  if (successCount > 0) {
    await messageBox.success(`นำเข้าไฟล์สำเร็จ ${successCount} รายการ`);
  }

  if (images.length > 0) {
    const editorContent = useEditorStore.getState().content || '';
    useEditorStore.getState().setContent(editorContent + '\n\n' + images.join('\n'));
    await messageBox.success(`แทรกรูปภาพ ${images.length} รายการลงในเอกสารแล้ว`);
  }

  if (errors.length > 0 && successCount === 0 && images.length === 0) {
    await messageBox.error(errors.join('\n'));
  }

  return { successCount, lastDocId, images };
}
