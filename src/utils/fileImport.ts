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

/**
 * Detect appropriate Editor Mode based on file extension and content
 */
export function detectEditorMode(filename: string, content: string): EditorMode {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.endsWith('.puml') || lowerName.endsWith('.plantuml') || /^\s*@startuml/im.test(content)) {
    return 'plantuml';
  }
  
  if (lowerName.endsWith('.mermaid') || /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)\b/im.test(content)) {
    return 'mermaid';
  }
  
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
