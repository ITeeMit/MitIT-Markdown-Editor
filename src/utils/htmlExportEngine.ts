import { marked } from 'marked';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';
import { fixMermaidSyntax, fixPlantUmlSyntax } from './adaExportPipeline';
import { THEME_PRESETS, ThemeColors } from './pdfEngine';

export interface HtmlExportOptions {
  title?: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  date?: string;
  theme?: 'modern' | 'corporate' | 'minimal' | 'emerald';
  fontFamily?: 'Sarabun' | 'Kanit' | 'Prompt' | 'Inter';
  defaultThemeMode?: 'light' | 'dark' | 'system';
  showToc?: boolean;
  showSearch?: boolean;
  showReadingProgress?: boolean;
  showCopyButtons?: boolean;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Generates a self-contained, beautiful, standard Interactive Single HTML Document
 */
export async function generateInteractiveHtmlString(
  markdownContent: string,
  options: HtmlExportOptions = {}
): Promise<string> {
  const title = options.title || 'เอกสาร (Document)';
  const subtitle = options.subtitle || '';
  const author = options.author || '';
  const date = options.date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const themeName = options.theme || 'modern';
  const fontFamily = options.fontFamily || 'Sarabun';
  const showToc = options.showToc !== false;
  const showSearch = options.showSearch !== false;
  const showReadingProgress = options.showReadingProgress !== false;
  const showCopyButtons = options.showCopyButtons !== false;

  const themeColors: ThemeColors = THEME_PRESETS[themeName] || THEME_PRESETS.modern;

  // Initialize Mermaid for pre-rendering
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: `'${fontFamily}', sans-serif`,
    });
  } catch (e) {
    console.warn('Mermaid init error in HTML export:', e);
  }

  // Collect Table of Contents (TOC) & Render Markdown
  const tocItems: TocItem[] = [];
  const renderer = new marked.Renderer();
  let headingIndex = 0;
  let diagramIndex = 0;

  renderer.heading = function (token: any) {
    const text = (typeof token === 'object' && token !== null ? token.text : token) || '';
    const level = (typeof token === 'object' && token !== null ? token.depth : arguments[1]) || 1;
    const rawText = text.replace(/<[^>]*>/g, '').trim();
    const headingId = `heading-${headingIndex++}-${rawText
      .toLowerCase()
      .replace(/[^\wก-๙]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'}`;

    tocItems.push({
      id: headingId,
      text: rawText,
      level,
    });

    return `
      <h${level} id="${headingId}" class="doc-heading doc-heading-${level}">
        <a href="#${headingId}" class="heading-anchor" aria-label="Link to section">#</a>
        <span class="heading-text">${text}</span>
      </h${level}>
    `;
  };

  // Custom table renderer to ensure modern responsive wrapper
  renderer.table = function (token: any) {
    let header = '';
    let body = '';
    if (typeof token === 'object' && token !== null) {
      if (token.header) {
        header = token.header.map((cell: any) => `<th>${cell.text}</th>`).join('');
        header = `<thead><tr>${header}</tr></thead>`;
      }
      if (token.rows) {
        body = token.rows
          .map((row: any) => `<tr>${row.map((cell: any) => `<td>${cell.text}</td>`).join('')}</tr>`)
          .join('');
        body = `<tbody>${body}</tbody>`;
      }
    }
    return `
      <div class="table-responsive-wrapper">
        <table class="doc-table">
          ${header}
          ${body}
        </table>
      </div>
    `;
  };

  // Extract and pre-render diagrams
  const diagramMap: Map<string, { type: 'mermaid' | 'plantuml'; renderedHtml: string; code: string }> = new Map();

  // Find all mermaid and plantuml blocks in markdown
  const codeBlockRegex = /```(mermaid|plantuml|puml|uml)[\r\n]+([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  const diagramPromises: Promise<void>[] = [];

  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const rawLang = match[1].toLowerCase();
    const code = match[2].trim();
    const diagType: 'mermaid' | 'plantuml' = rawLang === 'mermaid' ? 'mermaid' : 'plantuml';
    const diagId = `diag-export-${diagramIndex++}`;

    if (diagType === 'mermaid') {
      const fixedCode = fixMermaidSyntax(code);
      diagramPromises.push(
        (async () => {
          try {
            const renderId = `m-export-${Math.random().toString(36).substring(2, 9)}`;
            const { svg } = await mermaid.render(renderId, fixedCode);
            diagramMap.set(diagId, {
              type: 'mermaid',
              renderedHtml: `<div class="mermaid-svg-wrapper">${svg}</div>`,
              code: fixedCode,
            });
          } catch (err) {
            console.warn('Mermaid export render error, using fallback:', err);
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ code: fixedCode }))));
            const fallbackUrl = `https://mermaid.ink/svg/${encoded}`;
            diagramMap.set(diagId, {
              type: 'mermaid',
              renderedHtml: `<img src="${fallbackUrl}" alt="Mermaid Diagram" class="diagram-img" loading="lazy" />`,
              code: fixedCode,
            });
          }
        })()
      );
    } else {
      const fixedCode = fixPlantUmlSyntax(code);
      const encoded = plantumlEncoder.encode(fixedCode);
      const plantumlUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      diagramMap.set(diagId, {
        type: 'plantuml',
        renderedHtml: `<img src="${plantumlUrl}" alt="PlantUML Diagram" class="diagram-img" loading="lazy" />`,
        code: fixedCode,
      });
    }
  }

  await Promise.all(diagramPromises);

  // Custom code renderer for marked
  let replaceDiagIndex = 0;
  renderer.code = function (token: any) {
    const text = (typeof token === 'object' && token !== null ? token.text : token) || '';
    const rawLang = ((typeof token === 'object' && token !== null ? token.lang : arguments[1]) || '').trim().toLowerCase();

    if (rawLang === 'mermaid' || ['plantuml', 'puml', 'uml'].includes(rawLang)) {
      const diagId = `diag-export-${replaceDiagIndex++}`;
      const diagData = diagramMap.get(diagId);
      const diagType = rawLang === 'mermaid' ? 'Mermaid' : 'PlantUML';
      const renderedVisual = diagData?.renderedHtml || '<div class="diagram-fallback">Diagram rendering</div>';
      const escapedCode = (diagData?.code || text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      return `
        <div class="interactive-diagram-card" id="${diagId}">
          <div class="diagram-card-header">
            <div class="diagram-badge-group">
              <span class="diagram-type-badge ${rawLang === 'mermaid' ? 'badge-mermaid' : 'badge-plantuml'}">
                ${rawLang === 'mermaid' ? '📊 Mermaid' : '📐 PlantUML'}
              </span>
              <span class="diagram-title">${diagType} Diagram</span>
            </div>
            <div class="diagram-actions">
              <button type="button" class="btn-diag-action btn-zoom" onclick="openDiagramZoom('${diagId}')" title="ขยายดูภาพขนาดเต็ม (Zoom)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                <span>ขยาย</span>
              </button>
              <button type="button" class="btn-diag-action btn-toggle-code" onclick="toggleDiagramCode('${diagId}')" title="แสดง/ซ่อนโค้ด (Toggle Code)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <span>โค้ด</span>
              </button>
            </div>
          </div>
          <div class="diagram-visual-area" id="visual-${diagId}">
            ${renderedVisual}
          </div>
          <div class="diagram-code-area" id="code-${diagId}" style="display: none;">
            <div class="code-header">
              <span class="code-lang-label">${diagType} Source Code</span>
              <button type="button" class="btn-copy-code" onclick="copySnippet('${diagId}-raw')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>คัดลอก</span>
              </button>
            </div>
            <pre class="diagram-pre"><code id="${diagId}-raw">${escapedCode}</code></pre>
          </div>
        </div>
      `;
    }

    // Standard code block with 1-click copy
    const blockId = `code-block-${Math.random().toString(36).substring(2, 9)}`;
    const escapedCode = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `
      <div class="interactive-code-block" id="${blockId}">
        <div class="code-header">
          <span class="code-lang-label">${rawLang || 'text'}</span>
          ${
            showCopyButtons
              ? `
            <button type="button" class="btn-copy-code" onclick="copySnippet('${blockId}-content')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>คัดลอกโค้ด</span>
            </button>
          `
              : ''
          }
        </div>
        <pre><code id="${blockId}-content" class="language-${rawLang}">${escapedCode}</code></pre>
      </div>
    `;
  };

  const parsedHtml = (await marked.parse(markdownContent, { renderer, breaks: true, gfm: true })) as string;

  // Approximate Reading Time
  const wordCount = markdownContent.replace(/[^\wก-๙]+/g, ' ').trim().split(/\s+/).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Build TOC HTML
  let tocHtml = '';
  if (showToc && tocItems.length > 0) {
    tocHtml = `
      <nav class="doc-toc" aria-label="Table of contents">
        <div class="toc-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span>สารบัญเนื้อหา</span>
        </div>
        <ul class="toc-list">
          ${tocItems
            .filter((item) => item.level <= 3)
            .map(
              (item) => `
            <li class="toc-item toc-level-${item.level}">
              <a href="#${item.id}" class="toc-link" data-target="${item.id}">
                ${item.text}
              </a>
            </li>
          `
            )
            .join('')}
        </ul>
      </nav>
    `;
  }

  // Full HTML Template
  return `<!DOCTYPE html>
<html lang="th" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="AdaPos Markdown Interactive Exporter">
  <title>${escapeHtml(title)}</title>
  
  <!-- Thai Google Fonts Preconnect -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kanit:wght@300;400;500;600&family=Prompt:wght@300;400;500;600&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    /* CSS Variables & Theming */
    :root {
      --primary: ${themeColors.primary};
      --primary-hover: ${themeColors.secondary};
      --primary-light: ${themeColors.primary}18;
      --font-family: '${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      
      /* Light Theme */
      --bg-body: #f8fafc;
      --bg-surface: #ffffff;
      --bg-surface-elevated: #ffffff;
      --bg-sidebar: #ffffff;
      --bg-header: rgba(255, 255, 255, 0.88);
      --bg-code: #0f172a;
      --bg-code-header: #1e293b;
      --bg-card: #ffffff;
      --bg-table-zebra: #f8fafc;
      --bg-blockquote: #eff6ff;
      --border-color: #e2e8f0;
      --border-color-subtle: #f1f5f9;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --text-heading: #0f172a;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }

    [data-theme="dark"] {
      --bg-body: #0b0f17;
      --bg-surface: #111827;
      --bg-surface-elevated: #1e293b;
      --bg-sidebar: #0f172a;
      --bg-header: rgba(15, 23, 42, 0.9);
      --bg-code: #030712;
      --bg-code-header: #111827;
      --bg-card: #131d2e;
      --bg-table-zebra: #162235;
      --bg-blockquote: #172554;
      --border-color: #1f293d;
      --border-color-subtle: #162032;
      --text-main: #e2e8f0;
      --text-muted: #94a3b8;
      --text-heading: #f8fafc;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.45);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.55);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
      font-size: 16px;
    }

    body {
      font-family: var(--font-family);
      background-color: var(--bg-body);
      color: var(--text-main);
      line-height: 1.75;
      transition: background-color 0.25s ease, color 0.25s ease;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Reading Progress Bar */
    .reading-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, var(--primary), #38bdf8);
      z-index: 1000;
      transition: width 0.1s ease-out;
    }

    /* Sticky Navbar */
    .doc-navbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: var(--bg-header);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      z-index: 100;
      padding: 0.6rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      transition: background-color 0.25s, border-color 0.25s;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-heading);
      font-weight: 700;
      font-size: 1.05rem;
      min-width: 0;
    }

    .navbar-brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .navbar-title-wrap {
      min-width: 0;
    }

    .navbar-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .navbar-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    .navbar-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* Search Box */
    .search-box-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.38rem 0.75rem 0.38rem 2rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-family: var(--font-family);
      outline: none;
      width: 180px;
      transition: width 0.2s, border-color 0.2s, box-shadow 0.2s;
    }

    .search-input:focus {
      width: 240px;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .search-icon {
      position: absolute;
      left: 0.6rem;
      width: 14px;
      height: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-count {
      position: absolute;
      right: 0.5rem;
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 600;
      background: var(--bg-body);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }

    /* Action Buttons */
    .btn-icon {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.45rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-icon:hover {
      background: var(--border-color-subtle);
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
      border: none;
      padding: 0.42rem 0.85rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: background-color 0.15s, transform 0.1s;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    /* Layout Structure */
    .doc-layout {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      min-height: calc(100vh - 57px);
    }

    /* Sidebar TOC */
    .doc-sidebar {
      width: 280px;
      flex-shrink: 0;
      position: sticky;
      top: 57px;
      height: calc(100vh - 57px);
      overflow-y: auto;
      padding: 1.5rem 1rem 2rem 1.5rem;
      border-right: 1px solid var(--border-color);
      background: var(--bg-sidebar);
      transition: transform 0.25s ease, width 0.25s ease;
    }

    .toc-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      margin: 0.2rem 0;
    }

    .toc-level-1 { font-weight: 600; }
    .toc-level-2 { padding-left: 0.85rem; font-size: 0.88rem; }
    .toc-level-3 { padding-left: 1.6rem; font-size: 0.82rem; color: var(--text-muted); }

    .toc-link {
      display: block;
      color: var(--text-main);
      text-decoration: none;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      transition: all 0.15s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-left: 2px solid transparent;
    }

    .toc-link:hover {
      background: var(--primary-light);
      color: var(--primary);
    }

    .toc-link.active {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
      border-left-color: var(--primary);
    }

    /* Main Content Area */
    .doc-main {
      flex: 1;
      min-width: 0;
      padding: 2.5rem 3.5rem 5rem 3.5rem;
    }

    .doc-container {
      max-width: 880px;
      margin: 0 auto;
      background: var(--bg-surface);
      padding: 3rem 3.5rem;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
    }

    /* Document Header Banner */
    .doc-meta-banner {
      margin-bottom: 2.5rem;
      padding-bottom: 1.75rem;
      border-bottom: 2px solid var(--border-color);
    }

    .doc-main-title {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text-heading);
      line-height: 1.25;
      letter-spacing: -0.02em;
      margin-bottom: 0.6rem;
    }

    .doc-main-subtitle {
      font-size: 1.15rem;
      color: var(--text-muted);
      margin-bottom: 1.2rem;
    }

    .doc-meta-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--bg-body);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }

    /* Markdown Typography */
    .doc-content {
      font-size: 1rem;
      color: var(--text-main);
      text-align: justify;
      text-justify: inter-word;
    }

    .doc-heading {
      position: relative;
      font-weight: 700;
      color: var(--text-heading);
      scroll-margin-top: 80px;
    }

    .doc-heading-1 {
      font-size: 1.75rem;
      margin: 2.25rem 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--primary);
    }

    .doc-heading-2 {
      font-size: 1.4rem;
      margin: 1.85rem 0 0.85rem 0;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--border-color);
    }

    .doc-heading-3 {
      font-size: 1.18rem;
      margin: 1.4rem 0 0.6rem 0;
    }

    .doc-heading-4 {
      font-size: 1.05rem;
      margin: 1.1rem 0 0.4rem 0;
    }

    .heading-anchor {
      position: absolute;
      left: -1.4rem;
      color: var(--text-muted);
      opacity: 0;
      text-decoration: none;
      font-weight: 400;
      transition: opacity 0.15s;
    }

    .doc-heading:hover .heading-anchor {
      opacity: 1;
      color: var(--primary);
    }

    .doc-content p {
      margin: 0.95rem 0;
      line-height: 1.8;
    }

    .doc-content ul, .doc-content ol {
      margin: 0.85rem 0;
      padding-left: 2rem;
    }

    .doc-content li {
      margin: 0.35rem 0;
      line-height: 1.75;
    }

    .doc-content blockquote {
      margin: 1.4rem 0;
      padding: 0.9rem 1.4rem;
      border-left: 4px solid var(--primary);
      background: var(--bg-blockquote);
      border-radius: 0 8px 8px 0;
      color: var(--text-main);
      font-style: normal;
    }

    .doc-content hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 2rem 0;
    }

    .doc-content a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .doc-content a:hover {
      color: var(--primary-hover);
    }

    /* Inline Code */
    .doc-content :not(pre) > code {
      font-family: var(--font-mono);
      font-size: 0.86em;
      background: var(--primary-light);
      color: var(--primary);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 500;
    }

    /* Responsive Modern Tables */
    .table-responsive-wrapper {
      width: 100%;
      overflow-x: auto;
      margin: 1.5rem 0;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      box-shadow: var(--shadow-sm);
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
      background: var(--bg-surface);
      text-align: left;
    }

    .doc-table th {
      background: var(--bg-table-zebra);
      color: var(--text-heading);
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 2px solid var(--border-color);
    }

    .doc-table td {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    .doc-table tr:nth-child(even) td {
      background: var(--bg-table-zebra);
    }

    .doc-table tr:hover td {
      background: var(--primary-light);
    }

    /* Interactive Code Blocks */
    .interactive-code-block {
      margin: 1.5rem 0;
      border-radius: 10px;
      background: var(--bg-code);
      border: 1px solid var(--border-color);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: var(--bg-code-header);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .interactive-code-block pre, .diagram-code-area pre {
      margin: 0;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.88rem;
      line-height: 1.65;
      color: #38bdf8;
    }

    .btn-copy-code {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      font-size: 0.72rem;
      font-family: var(--font-family);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }

    .btn-copy-code:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    /* Interactive Diagram Cards */
    .interactive-diagram-card {
      margin: 2rem 0;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .interactive-diagram-card:hover {
      box-shadow: var(--shadow-lg);
    }

    .diagram-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 1.2rem;
      background: var(--bg-table-zebra);
      border-bottom: 1px solid var(--border-color);
    }

    .diagram-badge-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .diagram-type-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 20px;
    }

    .badge-mermaid {
      background: #dbeafe;
      color: #1e40af;
    }

    [data-theme="dark"] .badge-mermaid {
      background: #1e3a8a;
      color: #93c5fd;
    }

    .badge-plantuml {
      background: #d1fae5;
      color: #065f46;
    }

    [data-theme="dark"] .badge-plantuml {
      background: #064e3b;
      color: #a7f3d0;
    }

    .diagram-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-heading);
    }

    .diagram-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-diag-action {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }

    .btn-diag-action:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .diagram-visual-area {
      padding: 1.75rem;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow-x: auto;
      background: var(--bg-surface);
      min-height: 160px;
    }

    .diagram-img, .mermaid-svg-wrapper svg {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    .diagram-code-area {
      border-top: 1px solid var(--border-color);
      background: var(--bg-code);
    }

    /* Lightbox Modal */
    .lightbox-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 2000;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }

    .lightbox-modal.active {
      display: flex;
    }

    .lightbox-content {
      background: var(--bg-surface);
      border-radius: 16px;
      max-width: 95vw;
      max-height: 92vh;
      width: 1100px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border-color);
    }

    .lightbox-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-table-zebra);
    }

    .lightbox-body {
      padding: 2rem;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      max-height: 75vh;
    }

    .lightbox-body img, .lightbox-body svg {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
    }

    /* Search Highlight Marker */
    mark.search-highlight {
      background: #fef08a;
      color: #854d0e;
      padding: 0.1em 0.25em;
      border-radius: 3px;
    }

    [data-theme="dark"] mark.search-highlight {
      background: #ca8a04;
      color: #ffffff;
    }

    mark.search-highlight.current {
      background: #f97316;
      color: #ffffff;
    }

    /* Toast Notification */
    .toast-popup {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e293b;
      color: #ffffff;
      padding: 0.65rem 1.2rem;
      border-radius: 8px;
      font-size: 0.85rem;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.25s ease;
      z-index: 3000;
    }

    .toast-popup.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* Footer */
    .doc-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Responsive Mobile Media Queries */
    @media (max-width: 1024px) {
      .doc-sidebar {
        display: none;
      }
      .doc-main {
        padding: 1.5rem 1rem;
      }
      .doc-container {
        padding: 2rem 1.5rem;
      }
      .search-input {
        width: 130px;
      }
      .search-input:focus {
        width: 170px;
      }
    }

    /* Print Stylesheet Optimization */
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 11pt;
      }
      .reading-progress-bar,
      .doc-navbar,
      .doc-sidebar,
      .diagram-actions,
      .btn-copy-code,
      .toast-popup,
      .heading-anchor {
        display: none !important;
      }
      .doc-layout {
        display: block !important;
        min-height: auto !important;
      }
      .doc-main {
        padding: 0 !important;
      }
      .doc-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .interactive-diagram-card, .interactive-code-block, .table-responsive-wrapper {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .doc-heading {
        break-after: avoid;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Reading Progress Bar -->
  ${showReadingProgress ? '<div id="readingProgress" class="reading-progress-bar"></div>' : ''}

  <!-- Top Sticky Navigation Bar -->
  <header class="doc-navbar">
    <div class="navbar-brand">
      <div class="navbar-brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </div>
      <div class="navbar-title-wrap">
        <div class="navbar-title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="navbar-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
    </div>

    <div class="navbar-controls">
      <!-- In-page Search -->
      ${
        showSearch
          ? `
        <div class="search-box-container">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="searchInput" class="search-input" placeholder="ค้นหาในเอกสาร..." />
          <span id="searchCount" class="search-count" style="display: none;">0/0</span>
        </div>
      `
          : ''
      }

      <!-- Theme Switcher Button -->
      <button type="button" id="themeToggleBtn" class="btn-icon" title="สลับ Dark / Light Mode">
        <svg id="sunIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg id="moonIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>

      <!-- Print Button -->
      <button type="button" class="btn-primary" onclick="window.print()" title="พิมพ์หรือบันทึกเป็น PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>พิมพ์ / PDF</span>
      </button>
    </div>
  </header>

  <!-- Document Layout (Sidebar + Content) -->
  <div class="doc-layout">
    <!-- Collapsible Sidebar TOC -->
    ${
      showToc && tocItems.length > 0
        ? `
      <aside class="doc-sidebar">
        ${tocHtml}
      </aside>
    `
        : ''
    }

    <!-- Main Article Body -->
    <main class="doc-main">
      <div class="doc-container">
        <!-- Meta Banner -->
        <header class="doc-meta-banner">
          <h1 class="doc-main-title">${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="doc-main-subtitle">${escapeHtml(subtitle)}</p>` : ''}
          <div class="doc-meta-tags">
            ${author ? `<span class="meta-tag">👤 ${escapeHtml(author)}</span>` : ''}
            <span class="meta-tag">📅 ${escapeHtml(date)}</span>
            <span class="meta-tag">⏱️ เวลาอ่านประมาณ ${readingTimeMin} นาที</span>
            ${tocItems.length > 0 ? `<span class="meta-tag">📑 ${tocItems.length} หัวข้อ</span>` : ''}
          </div>
        </header>

        <!-- Markdown Rendered Content -->
        <article class="doc-content" id="docContent">
          ${parsedHtml}
        </article>

        <!-- Document Footer -->
        <footer class="doc-footer">
          <div>จัดทำโดยระบบ <strong>AdaPos Markdown Suite</strong></div>
          <div>อัปเดตล่าสุด: ${escapeHtml(date)}</div>
        </footer>
      </div>
    </main>
  </div>

  <!-- Fullscreen Diagram Zoom Modal -->
  <div id="diagramLightbox" class="lightbox-modal" onclick="closeDiagramZoom(event)">
    <div class="lightbox-content" onclick="event.stopPropagation()">
      <div class="lightbox-header">
        <strong id="lightboxTitle" style="font-size: 0.95rem;">ภาพขยาย Diagram</strong>
        <button type="button" class="btn-icon" onclick="closeDiagramZoom()" title="ปิด (Esc)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="lightbox-body" id="lightboxBody"></div>
    </div>
  </div>

  <!-- Toast Notification Pop-up -->
  <div id="toastPopup" class="toast-popup">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    <span id="toastMsg">คัดลอกสำเร็จ!</span>
  </div>

  <!-- Embedded Client JavaScript for Interactivity -->
  <script>
    (function() {
      // 1. Theme Management (Light / Dark)
      const themeToggleBtn = document.getElementById('themeToggleBtn');
      const sunIcon = document.getElementById('sunIcon');
      const moonIcon = document.getElementById('moonIcon');
      
      const savedTheme = localStorage.getItem('adapos_export_theme') || '${options.defaultThemeMode || 'light'}';
      setTheme(savedTheme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : savedTheme);

      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme') || 'light';
          const next = current === 'light' ? 'dark' : 'light';
          setTheme(next);
          localStorage.setItem('adapos_export_theme', next);
        });
      }

      function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          if (sunIcon) sunIcon.style.display = 'block';
          if (moonIcon) moonIcon.style.display = 'none';
        } else {
          if (sunIcon) sunIcon.style.display = 'none';
          if (moonIcon) moonIcon.style.display = 'block';
        }
      }

      // 2. Reading Progress Bar
      const progressBar = document.getElementById('readingProgress');
      if (progressBar) {
        window.addEventListener('scroll', () => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
          progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
        });
      }

      // 3. Table of Contents Scroll-Spy
      const tocLinks = document.querySelectorAll('.toc-link');
      const headings = Array.from(document.querySelectorAll('.doc-heading'));

      if (tocLinks.length > 0 && headings.length > 0) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const activeId = entry.target.getAttribute('id');
              tocLinks.forEach((link) => {
                if (link.getAttribute('data-target') === activeId) {
                  link.classList.add('active');
                } else {
                  link.classList.remove('active');
                }
              });
            }
          });
        }, {
          rootMargin: '-80px 0px -70% 0px',
          threshold: 0.1
        });

        headings.forEach((h) => observer.observe(h));
      }

      // 4. In-page Search with Keyword Highlighting
      const searchInput = document.getElementById('searchInput');
      const searchCount = document.getElementById('searchCount');
      let searchMatches = [];
      let currentMatchIdx = -1;

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.trim();
          clearHighlights();

          if (!query) {
            if (searchCount) searchCount.style.display = 'none';
            return;
          }

          highlightMatches(query);
        });

        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && searchMatches.length > 0) {
            currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
            focusMatch(currentMatchIdx);
          }
        });
      }

      function clearHighlights() {
        document.querySelectorAll('mark.search-highlight').forEach((mark) => {
          const parent = mark.parentNode;
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        });
        searchMatches = [];
        currentMatchIdx = -1;
      }

      function highlightMatches(query) {
        const contentEl = document.getElementById('docContent');
        if (!contentEl) return;

        const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
        const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.parentElement && !['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.parentElement.tagName)) {
            textNodes.push(node);
          }
        }

        textNodes.forEach((node) => {
          if (regex.test(node.nodeValue)) {
            const span = document.createElement('span');
            span.innerHTML = node.nodeValue.replace(regex, '<mark class="search-highlight">$1</mark>');
            node.parentNode.replaceChild(span, node);
          }
        });

        searchMatches = Array.from(document.querySelectorAll('mark.search-highlight'));
        if (searchCount) {
          searchCount.style.display = searchMatches.length > 0 ? 'inline' : 'none';
          searchCount.textContent = searchMatches.length > 0 ? '1/' + searchMatches.length : '0/0';
        }

        if (searchMatches.length > 0) {
          currentMatchIdx = 0;
          focusMatch(0);
        }
      }

      function focusMatch(idx) {
        searchMatches.forEach((m, i) => {
          m.classList.toggle('current', i === idx);
        });
        if (searchMatches[idx]) {
          searchMatches[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (searchCount) searchCount.textContent = (idx + 1) + '/' + searchMatches.length;
        }
      }

      function escapeRegExp(string) {
        return string.replace(/[.*+?^$\\{}()|[\\]\\\\]/g, '\\\\$&');
      }

      // 5. Lightbox Modal Helpers
      window.openDiagramZoom = function(cardId) {
        const visualArea = document.getElementById('visual-' + cardId);
        const modal = document.getElementById('diagramLightbox');
        const body = document.getElementById('lightboxBody');
        if (!visualArea || !modal || !body) return;

        body.innerHTML = visualArea.innerHTML;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      };

      window.closeDiagramZoom = function(e) {
        const modal = document.getElementById('diagramLightbox');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      };

      window.toggleDiagramCode = function(cardId) {
        const codeArea = document.getElementById('code-' + cardId);
        if (codeArea) {
          const isHidden = codeArea.style.display === 'none';
          codeArea.style.display = isHidden ? 'block' : 'none';
        }
      };

      // 6. Clipboard Helpers
      window.copySnippet = function(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const text = el.innerText || el.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('คัดลอกโค้ดเรียบร้อย');
        }).catch(() => {
          showToast('ไม่สามารถคัดลอกได้');
        });
      };

      function showToast(msg) {
        const toast = document.getElementById('toastPopup');
        const toastMsg = document.getElementById('toastMsg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2200);
      }

      // Keyboard Esc to close lightbox
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDiagramZoom();
        }
      });
    })();
  </script>
</body>
</html>
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
