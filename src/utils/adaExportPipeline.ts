import { marked } from 'marked';
import PizZip from 'pizzip';

const TEMPLATE_URL = '/adasoft-template.docx';
/** A4 content width for 6.2in diagrams (adamd2pdf) @ 96dpi */
const DIAGRAM_MAX_WIDTH_PX = Math.round(6.2 * 96);

/** Heading sizes — H3 (12pt) is baseline; H1/H2 kept modest (Word uses half-points = pt × 2) */
export const ADA_HEADING_PT = {
  h1: 13,
  h2: 12.5,
  h3: 12,
  h4: 10.5,
  h5: 9,
  h6: 9,
} as const;

const ADA_HEADING_HALF_PT = {
  h1: 26,
  h2: 25,
  h3: 24,
  h4: 21,
  h5: 18,
  h6: 18,
} as const;

/** Printable area inside adasoft-template.docx (pgMar from template, twips ÷ 1440) */
const ADA_PAGE_MARGIN = {
  top: '1.38in',
  right: '0.79in',
  bottom: '0.32in',
  left: '0.79in',
} as const;
/** altChunk body — Word already positions below header; no extra @page top inset */
const ADA_ALTCHUNK_PAGE_MARGIN = {
  top: '0',
  right: ADA_PAGE_MARGIN.right,
  bottom: ADA_PAGE_MARGIN.bottom,
  left: ADA_PAGE_MARGIN.left,
} as const;
/** Tighter pgMar for export (twips) — less gap above header & below header rule */
const ADA_SECTION_PG_MAR = {
  top: 1720,
  right: 1134,
  bottom: 454,
  left: 1134,
  header: 420,
  footer: 680,
} as const;
const ADA_CONTENT_WIDTH_IN = 6.45;
const ADA_CONTENT_WIDTH_PX = Math.round(ADA_CONTENT_WIDTH_IN * 96);
const ADA_TABLE_FONT_PT = 9;

marked.setOptions({ breaks: true, gfm: true });

const MERMAID_INIT_DIRECTIVE =
  "%%{init: {'theme':'default','themeVariables':{'fontSize':'13px'},'flowchart':{'useMaxWidth':true,'htmlLabels':true},'sequence':{'useMaxWidth':true,'actorMargin':55,'messageMargin':30,'boxMargin':8,'mirrorActors':false}}}%%\n";

export interface AdaExportMetadata {
  created?: Date;
  updated?: Date;
}

/** DOCX build options — diagram media embed is PDF-only (Word COM); DOCX keeps data URLs */
export interface AdaDocxBuildOptions {
  /** Embed diagram PNGs in word/media/ for Word COM PDF; default false for DOCX download */
  embedDiagramImages?: boolean;
}

export function fixMermaidSyntax(code: string): string {
  let fixed = code.replace(
    /participant\s+([A-Za-z0-9_]+)\s+as\s+([^"\n\r]+)/g,
    (_, id, label) => `participant ${id} as "${label.trim()}"`
  );
  if (fixed.includes('graph') || fixed.includes('flowchart')) {
    fixed = fixed.replace(/ -> /g, ' --> ');
  }
  const lines = fixed.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (const [open, close] of [['[', ']'], ['(', ')'], ['{', '}']] as const) {
      const diff = (line.match(new RegExp(`\\${open}`, 'g')) || []).length -
        (line.match(new RegExp(`\\${close}`, 'g')) || []).length;
      if (diff > 0) line += close.repeat(diff);
    }
    if ((line.match(/"/g) || []).length % 2 !== 0) line += '"';
    lines[i] = line;
  }
  return lines.join('\n');
}

export function fixPlantUmlSyntax(code: string): string {
  const lines = code.trim().split('\n');
  if (!lines.some((l) => l.includes('@start'))) lines.unshift('@startuml');
  if (!lines.some((l) => l.includes('@end'))) lines.push('@enduml');
  return lines.join('\n');
}

function prependMermaidConfig(code: string): string {
  if (code.includes('%%{init:')) return code.trim();
  return `${MERMAID_INIT_DIRECTIVE}${code.trim()}`;
}

async function scaleImageToFit(
  dataUrl: string,
  maxWidthPx: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      if (!width || width <= maxWidthPx) {
        resolve({ dataUrl, width: width || maxWidthPx, height: height || 0 });
        return;
      }

      const scale = maxWidthPx / width;
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width, height });
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: newWidth, height: newHeight });
    };
    img.onerror = () => resolve({ dataUrl, width: maxWidthPx, height: 0 });
    img.src = dataUrl;
  });
}

async function fetchMermaidImage(code: string): Promise<string | null> {
  try {
    const preparedCode = prependMermaidConfig(fixMermaidSyntax(code));
    const payload = JSON.stringify({
      code: preparedCode,
      mermaid: {
        theme: 'default',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true, actorMargin: 55, messageMargin: 30, boxMargin: 8, mirrorActors: false },
        gantt: { useMaxWidth: true },
      },
    });
    const base64 = btoa(unescape(encodeURIComponent(payload)));
    const response = await fetch(
      `https://mermaid.ink/img/${base64}?width=${DIAGRAM_MAX_WIDTH_PX}`
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function fetchPlantUmlImage(code: string): Promise<string | null> {
  try {
    const response = await fetch('https://kroki.io/plantuml/png', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: fixPlantUmlSyntax(code),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapCodeBlock(code: string): string {
  const safe = escapeHtml(code);
  return `
    <table class="code-block-table" role="presentation">
      <tr>
        <td class="code-block-cell">
          <pre class="code-block-pre"><code>${safe}</code></pre>
        </td>
      </tr>
    </table>`;
}

function wrapDiagramImage(
  dataUrl: string,
  alt: string,
  widthPx: number,
  heightPx: number
): string {
  const widthIn = (widthPx / 96).toFixed(2);
  const heightAttr = heightPx > 0 ? ` height="${heightPx}"` : '';

  return `
    <table class="diagram-table" role="presentation">
      <tr>
        <td class="diagram-cell">
          <img
            src="${dataUrl}"
            alt="${escapeHtml(alt)}"
            class="diagram-image"
            width="${widthPx}"${heightAttr}
            style="display:block;margin:0 auto;max-width:100%;width:${widthIn}in;height:auto;"
          />
        </td>
      </tr>
    </table>`;
}

/** adamd2pdf document CSS — TH Sarabun, headings without boxes, code in gray cells */
export function getAdasoftDocumentCss(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

    @page { size: A4; margin: 2.54cm; }

    body {
      font-family: 'TH Sarabun New', 'Sarabun', 'Tahoma', sans-serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .export-container {
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      overflow: visible;
    }

    img {
      max-width: 100% !important;
      height: auto !important;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'TH Sarabun New', 'Sarabun', 'Tahoma', sans-serif;
      font-weight: bold;
      color: #000000 !important;
      text-align: left !important;
      border: none !important;
      background: none !important;
      box-shadow: none !important;
      page-break-after: avoid;
    }
    h1 { font-size: ${ADA_HEADING_PT.h1}pt !important; margin: 2pt 0 4pt; }
    h2 { font-size: ${ADA_HEADING_PT.h2}pt !important; margin: 8pt 0 4pt; }
    h3 { font-size: ${ADA_HEADING_PT.h3}pt !important; margin: 8pt 0 3pt; }
    h4 { font-size: ${ADA_HEADING_PT.h4}pt !important; margin: 8pt 0 3pt; }
    h5, h6 { font-size: ${ADA_HEADING_PT.h5}pt !important; margin: 6pt 0 3pt; }

    p { margin: 0 0 8pt; line-height: 1.35; text-align: left; }
    ul, ol { margin: 0 0 8pt; padding-left: 24pt; }
    li { margin-bottom: 4pt; line-height: 1.35; }

    .export-container > :first-child {
      margin-top: 0 !important;
    }

    strong, b { font-weight: bold; }
    em, i { font-style: italic; color: #333333; }

    hr {
      border: none;
      border-top: 1px solid #cccccc;
      margin: 12pt 0;
    }

    table:not(.code-block-table) {
      border-collapse: collapse;
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      mso-table-layout-alt: fixed;
      margin: 8pt 0 12pt;
    }
    table:not(.code-block-table) th,
    table:not(.code-block-table) td {
      border: 1px solid #000000;
      padding: 3pt 4pt;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: ${ADA_TABLE_FONT_PT}pt;
    }
    table:not(.code-block-table) th {
      background: #f2f2f2;
      font-weight: bold;
    }

    .code-block-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 12pt;
      page-break-inside: avoid;
    }
    .code-block-cell {
      background: #F8F9FA;
      border: 1px solid #D3D3D3;
      padding: 10pt 12pt;
    }
    .code-block-pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 7.5pt;
      color: #282C34;
      background: transparent;
      border: none;
    }
    .code-block-pre code {
      font-family: inherit;
      background: transparent;
      padding: 0;
    }

    p code, li code {
      font-family: Consolas, 'Courier New', monospace;
      color: #C7254E;
      background: #F8F9FA;
      padding: 1pt 3pt;
    }

    .diagram-table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      page-break-inside: avoid;
      table-layout: fixed;
    }
    .diagram-cell {
      text-align: center;
      padding: 0;
      border: none;
      vertical-align: middle;
      overflow: hidden;
    }
    .diagram-image {
      display: block;
      margin: 0 auto;
      max-width: 100% !important;
      width: auto !important;
      height: auto !important;
    }

    blockquote {
      border-left: 4px solid #cccccc;
      margin: 8pt 0;
      padding: 4pt 12pt;
      color: #666666;
      font-style: italic;
    }

    .export-meta {
      margin-top: 24pt;
      font-size: 9pt;
      color: #666666;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

/** CSS for altChunk body — @page margins match adasoft-template pgMar so Word does not overflow */
export function getAdasoftAltChunkCss(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

    @page {
      size: A4 portrait;
      margin: ${ADA_ALTCHUNK_PAGE_MARGIN.top} ${ADA_ALTCHUNK_PAGE_MARGIN.right} ${ADA_ALTCHUNK_PAGE_MARGIN.bottom} ${ADA_ALTCHUNK_PAGE_MARGIN.left};
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden !important;
    }

    body {
      font-family: 'TH Sarabun New', 'Sarabun', 'Tahoma', sans-serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .export-container {
      width: 100%;
      max-width: ${ADA_CONTENT_WIDTH_IN}in;
      box-sizing: border-box;
      overflow: hidden;
    }

    img {
      max-width: 100% !important;
      height: auto !important;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'TH Sarabun New', 'Sarabun', 'Tahoma', sans-serif;
      font-weight: bold;
      color: #000000 !important;
      text-align: left !important;
      border: none !important;
      background: none !important;
      max-width: 100%;
      page-break-after: avoid;
    }
    h1 { font-size: ${ADA_HEADING_PT.h1}pt !important; margin: 2pt 0 4pt; }
    h2 { font-size: ${ADA_HEADING_PT.h2}pt !important; margin: 8pt 0 4pt; }
    h3 { font-size: ${ADA_HEADING_PT.h3}pt !important; margin: 8pt 0 3pt; }
    h4 { font-size: ${ADA_HEADING_PT.h4}pt !important; margin: 8pt 0 3pt; }
    h5, h6 { font-size: ${ADA_HEADING_PT.h5}pt !important; margin: 6pt 0 3pt; }

    p, ul, ol, blockquote, hr, pre {
      max-width: 100%;
      box-sizing: border-box;
    }
    p { margin: 0 0 8pt; line-height: 1.35; text-align: left; }
    ul, ol { margin: 0 0 8pt; padding-left: 24pt; }
    li { margin-bottom: 4pt; line-height: 1.35; word-break: break-word; }

    .export-container > :first-child {
      margin-top: 0 !important;
    }

    hr {
      border: none;
      border-top: 1px solid #cccccc;
      margin: 12pt 0;
      width: 100%;
    }

    table:not(.code-block-table):not(.diagram-table) {
      border-collapse: collapse;
      width: ${ADA_CONTENT_WIDTH_PX}px;
      max-width: 100%;
      table-layout: fixed;
      mso-table-layout-alt: fixed;
      margin: 8pt 0 12pt;
    }
    table:not(.code-block-table) th,
    table:not(.code-block-table) td {
      border: 1px solid #000000;
      padding: 3pt 4pt;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: ${ADA_TABLE_FONT_PT}pt;
    }
    table:not(.code-block-table) th {
      background: #f2f2f2;
      font-weight: bold;
    }

    .code-block-table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 12pt;
      table-layout: fixed;
      mso-table-layout-alt: fixed;
    }
    .code-block-cell {
      background: #F8F9FA;
      border: 1px solid #D3D3D3;
      padding: 8pt 10pt;
    }
    .code-block-pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 7.5pt;
      color: #282C34;
    }

    p code, li code {
      font-family: Consolas, 'Courier New', monospace;
      color: #C7254E;
      background: #F8F9FA;
      padding: 1pt 3pt;
      word-break: break-all;
    }

    .diagram-table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      table-layout: fixed;
    }
    .diagram-image {
      display: block;
      margin: 0 auto;
      max-width: 100% !important;
      height: auto !important;
    }
  `;
}

export function buildTemplateHtmlDocument(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>${getAdasoftAltChunkCss()}</style>
</head>
<body>
  <div class="export-container" style="width:100%;max-width:${ADA_CONTENT_WIDTH_IN}in;box-sizing:border-box;overflow:hidden;">${bodyHtml}</div>
</body>
</html>`;
}

async function renderDiagramBlock(code: string, lang: string): Promise<string> {
  let imageUrl: string | null = null;

  if (lang === 'mermaid') {
    imageUrl = await fetchMermaidImage(fixMermaidSyntax(code));
    if (!imageUrl) imageUrl = await fetchMermaidImage(fixMermaidSyntax(code));
  } else if (['plantuml', 'puml', 'uml'].includes(lang)) {
    imageUrl = await fetchPlantUmlImage(code);
    if (!imageUrl) imageUrl = await fetchPlantUmlImage(fixPlantUmlSyntax(code));
  }

  const parts: string[] = [];
  if (imageUrl) {
    const scaled = await scaleImageToFit(imageUrl, DIAGRAM_MAX_WIDTH_PX);
    parts.push(wrapDiagramImage(scaled.dataUrl, `${lang} diagram`, scaled.width, scaled.height));
  }
  parts.push(wrapCodeBlock(code));
  return parts.join('\n');
}

/** Process markdown → HTML body with adamd2pdf diagram & code-block rules */
export async function processMarkdownToExportHtml(
  content: string,
  metadata?: AdaExportMetadata
): Promise<string> {
  const html = await marked(content);
  const container = document.createElement('div');
  container.innerHTML = html;

  const pres = Array.from(container.querySelectorAll('pre'));
  for (const pre of pres) {
    const codeEl = pre.querySelector('code');
    if (!codeEl) continue;

    const classes = Array.from(codeEl.classList);
    const langClass = classes.find((c) => c.startsWith('language-'));
    const lang = langClass?.replace('language-', '') || '';
    const codeText = codeEl.textContent || '';

    if (lang === 'mermaid' || ['plantuml', 'puml', 'uml'].includes(lang)) {
      const replacement = document.createElement('div');
      replacement.innerHTML = await renderDiagramBlock(codeText, lang);
      pre.replaceWith(...Array.from(replacement.childNodes));
      continue;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = wrapCodeBlock(codeText);
    pre.replaceWith(wrapper.firstElementChild!);
  }

  if (metadata?.created || metadata?.updated) {
    const meta = document.createElement('div');
    meta.className = 'export-meta';
    if (metadata.created) {
      meta.innerHTML += `<p>Created: ${metadata.created.toLocaleDateString()}</p>`;
    }
    if (metadata.updated) {
      meta.innerHTML += `<p>Updated: ${metadata.updated.toLocaleDateString()}</p>`;
    }
    container.appendChild(meta);
  }

  applyInlineHeadingStyles(container);
  normalizeDiagramImagesForWordExport(container);
  normalizeTablesForWordExport(container);
  return container.innerHTML;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/[\w+.-]+;base64,/, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Word altChunk reads only the HTML part — not word/media/ siblings (broken img links).
 * Kept for reference; export uses inline data: URLs like DOCX download.
 */
function embedDiagramImagesInDocx(zip: PizZip, html: string): string {
  const relationships: string[] = [];
  let index = 0;

  const embeddedHtml = html.replace(
    /src="(data:image\/(?:png|jpeg|jpg);base64,[^"]+)"/gi,
    (_match, dataUrl: string) => {
      const ext =
        /image\/jpe?g/i.test(dataUrl.split(',')[0] ?? '') ? 'jpeg' : 'png';
      const filename = `export-diagram-${index}.${ext}`;
      zip.file(`word/media/${filename}`, dataUrlToBytes(dataUrl));
      relationships.push(
        `<Relationship Id="diagRid${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`
      );
      index += 1;
      return `src="media/${filename}"`;
    }
  );

  if (relationships.length > 0) {
    zip.file(
      'word/_rels/document.html.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relationships.join('\n')}
</Relationships>`
    );
  }

  return embeddedHtml;
}

/** Inline diagram sizing for Word MSHTML (image above code block, max 6.2in) */
function normalizeDiagramImagesForWordExport(container: HTMLElement): void {
  const widthIn = (DIAGRAM_MAX_WIDTH_PX / 96).toFixed(2);
  container.querySelectorAll('.diagram-table').forEach((table) => {
    const el = table as HTMLTableElement;
    el.style.width = '100%';
    el.style.maxWidth = `${ADA_CONTENT_WIDTH_IN}in`;
    el.style.margin = '12pt auto';
    el.style.pageBreakInside = 'avoid';
  });
  container.querySelectorAll('.diagram-image').forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.display = 'block';
    el.style.margin = '0 auto';
    el.style.width = `${widthIn}in`;
    el.style.maxWidth = '100%';
    el.style.height = 'auto';
  });
}

/** Word MSHTML ignores CSS — force table width + column split + cell wrap */
function normalizeTablesForWordExport(container: HTMLElement): void {
  container.querySelectorAll('table:not(.code-block-table):not(.diagram-table)').forEach((table) => {
    const el = table as HTMLTableElement;
    const colCount = el.rows[0]?.cells.length ?? 1;
    const colPct = Math.floor(100 / colCount);

    el.setAttribute('width', String(ADA_CONTENT_WIDTH_PX));
    el.style.width = `${ADA_CONTENT_WIDTH_PX}px`;
    el.style.maxWidth = '100%';
    el.style.tableLayout = 'fixed';
    (el.style as CSSStyleDeclaration & { msoTableLayoutAlt?: string }).msoTableLayoutAlt = 'fixed';

    el.querySelectorAll('colgroup').forEach((g) => g.remove());
    const colgroup = document.createElement('colgroup');
    for (let i = 0; i < colCount; i += 1) {
      const col = document.createElement('col');
      col.setAttribute('width', `${colPct}%`);
      col.style.width = `${colPct}%`;
      colgroup.appendChild(col);
    }
    el.insertBefore(colgroup, el.firstChild);

    el.querySelectorAll('th, td').forEach((cell) => {
      const node = cell as HTMLElement;
      node.style.wordBreak = 'break-word';
      node.style.overflowWrap = 'anywhere';
      node.style.fontSize = `${ADA_TABLE_FONT_PT}pt`;
      node.style.padding = '3pt 4pt';
      node.style.maxWidth = `${Math.floor(ADA_CONTENT_WIDTH_PX / colCount)}px`;
    });
  });

  container.querySelectorAll('p, li').forEach((node) => {
    (node as HTMLElement).style.wordBreak = 'break-word';
    (node as HTMLElement).style.overflowWrap = 'anywhere';
  });
}

/** Word altChunk often ignores stylesheet — inline sizes + patch styles.xml */
function applyInlineHeadingStyles(container: HTMLElement): void {
  const map: Array<[keyof typeof ADA_HEADING_PT, string]> = [
    ['h1', 'h1'],
    ['h2', 'h2'],
    ['h3', 'h3'],
    ['h4', 'h4'],
    ['h5', 'h5'],
    ['h6', 'h6'],
  ];
  for (const [tag, sizeKey] of map) {
    const pt = ADA_HEADING_PT[sizeKey];
    container.querySelectorAll(tag).forEach((el) => {
      const node = el as HTMLElement;
      node.style.fontSize = `${pt}pt`;
      node.style.fontWeight = 'bold';
      node.style.color = '#000000';
      node.style.textAlign = 'left';
      node.style.lineHeight = '1.25';
      if (tag === 'h1') {
        node.style.marginTop = '2pt';
        node.style.marginBottom = '4pt';
      }
    });
  }
  const firstBlock = container.firstElementChild as HTMLElement | null;
  if (firstBlock?.matches('h1,h2,h3,h4,h5,h6')) {
    firstBlock.style.marginTop = '0';
  }
}

function patchHeadingStyleBlock(block: string, halfPt: number): string {
  return block
    .replace(/<w:sz w:val="[^"]+"\/>/g, `<w:sz w:val="${halfPt}"/>`)
    .replace(/<w:szCs w:val="[^"]+"\/>/g, `<w:szCs w:val="${halfPt}"/>`);
}

function patchTemplateStyles(stylesXml: string): string {
  let xml = stylesXml;
  xml = xml.replace(
    /(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:color w:val="[^"]+"\/>/g,
    '$1<w:color w:val="000000"/>'
  );
  xml = xml.replace(
    /(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:pBdr>[\s\S]*?<\/w:pBdr>/g,
    '$1'
  );
  xml = xml.replace(
    /(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:jc w:val="center"\/>/g,
    '$1<w:jc w:val="left"/>'
  );

  for (let level = 1; level <= 6; level += 1) {
    const halfPt = ADA_HEADING_HALF_PT[`h${level}` as keyof typeof ADA_HEADING_HALF_PT];
    const re = new RegExp(
      `<w:style w:type="paragraph" w:styleId="${level}"[^>]*>[\\s\\S]*?</w:style>`,
      'g'
    );
    xml = xml.replace(re, (block) => {
      if (!block.includes(`<w:name w:val="heading ${level}"/>`)) return block;
      return patchHeadingStyleBlock(block, halfPt);
    });
  }

  return xml;
}

/** Rebuild header1.xml — logo left, contact 2 lines left-aligned (matches adasoft-template) */
function buildCleanHeader1Xml(logoScale = 1): string {
  const logoCx = Math.round(1047750 * logoScale);
  const logoCy = Math.round(409575 * logoScale);
  const tableW = 9638;
  const logoCol = 2400;
  const contactCol = tableW - logoCol;
  const contactRun = `<w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${tableW}" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="${logoCol}"/>
      <w:gridCol w:w="${contactCol}"/>
    </w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${logoCol}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="${logoCx}" cy="${logoCy}"/>
                <wp:docPr id="1" name="Adasoft Logo"/>
                <wp:cNvGraphicFramePr>
                  <a:graphicFrameLocks noChangeAspect="1"/>
                </wp:cNvGraphicFramePr>
                <a:graphic>
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic>
                      <pic:nvPicPr>
                        <pic:cNvPr id="0" name="Adasoft Logo"/>
                        <pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="rId2"/>
                        <a:stretch><a:fillRect/></a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${logoCx}" cy="${logoCy}"/></a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${contactCol}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="0"/></w:pPr>
          <w:r>${contactRun}
            <w:t>26/5-8 Soi Ladprao83 (Chit Ari) Ladprao Rd. Khlong Chaokhun Sing, Wangthonglang Bangkok 10310 Thailand.</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>${contactRun}
            <w:t xml:space="preserve">Tel. +662 530-1681(auto)  Fax. +662 25301681 ext. 1109  email : </w:t>
          </w:r>
          <w:hyperlink r:id="rId1" w:history="1">
            <w:r>${contactRun}
              <w:t>info@ada-soft.com</w:t>
            </w:r>
          </w:hyperlink>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
  <w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:pBdr>
    </w:pPr>
  </w:p>
</w:hdr>`;
}

function patchTemplateSectionSpacing(docXml: string): string {
  const mar = ADA_SECTION_PG_MAR;
  return docXml.replace(
    /<w:pgMar[^/]*\/>/,
    `<w:pgMar w:top="${mar.top}" w:right="${mar.right}" w:bottom="${mar.bottom}" w:left="${mar.left}" w:header="${mar.header}" w:footer="${mar.footer}" w:gutter="0"/>`
  );
}

/** Replace legacy VML header with fixed-width table layout */
function patchTemplateHeader(_headerXml: string, logoScale = 1): string {
  return buildCleanHeader1Xml(logoScale);
}

/** Inject HTML into adasoft-template.docx via altChunk (same as adamd2pdf DOCX path) */
export async function buildDocxFromTemplate(
  fullHtml: string,
  options: AdaDocxBuildOptions = {}
): Promise<Blob> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Template not found: ${TEMPLATE_URL}`);
  }

  const templateBuffer = await response.arrayBuffer();
  const zip = new PizZip(templateBuffer);

  const stylesFile = zip.file('word/styles.xml');
  if (stylesFile) {
    zip.file('word/styles.xml', patchTemplateStyles(stylesFile.asText()));
  }

  const headerFile = zip.file('word/header1.xml');
  if (headerFile) {
    zip.file('word/header1.xml', patchTemplateHeader(headerFile.asText()));
  }

  const htmlForChunk = options.embedDiagramImages
    ? embedDiagramImagesInDocx(zip, fullHtml)
    : fullHtml;
  zip.file('word/document.html', htmlForChunk);

  let relsXml = zip.file('word/_rels/document.xml.rels')!.asText();
  if (!relsXml.includes('htmlChunk')) {
    relsXml = relsXml.replace(
      '</Relationships>',
      '  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="document.html"/>\n</Relationships>'
    );
    zip.file('word/_rels/document.xml.rels', relsXml);
  }

  let docXml = zip.file('word/document.xml')!.asText();
  const sectPrMatch = docXml.match(/<w:sectPr[^>]*>.*?<\/w:sectPr>/);
  const sectPr = sectPrMatch?.[0] ?? '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>';
  docXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body><w:altChunk r:id="htmlChunk"/>${sectPr}</w:body>`);
  docXml = patchTemplateSectionSpacing(docXml);
  zip.file('word/document.xml', docXml);

  let contentTypes = zip.file('[Content_Types].xml')!.asText();
  if (!contentTypes.includes('text/html')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '  <Default Extension="html" ContentType="text/html"/>\n</Types>'
    );
    zip.file('[Content_Types].xml', contentTypes);
  }

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * adamd2pdf step 1: Markdown → DOCX via public/adasoft-template.docx
 * Shared by DOCX download and PDF print flows.
 */
export async function buildAdasoftDocxBlob(
  content: string,
  title: string,
  metadata?: AdaExportMetadata,
  options: AdaDocxBuildOptions = {}
): Promise<Blob> {
  const fullHtml = await buildAdasoftExportHtml(content, title, metadata);
  try {
    return await buildDocxFromTemplate(fullHtml, options);
  } catch (templateError) {
    console.warn('Template DOCX failed, falling back to html-docx-js-typescript', templateError);
    const { asBlob } = await import('html-docx-js-typescript');
    return (await asBlob(fullHtml)) as Blob;
  }
}

function waitForDocumentImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            })
    )
  ).then(() => undefined);
}

/** Print via hidden iframe — avoids pop-up blocker (window.open fails after async work) */
export async function openAdasoftPrintToPdf(fullHtml: string, _title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = 'PDF export preview';
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      iframe.remove();
      reject(new Error('ไม่สามารถเตรียมหน้าต่างพิมพ์ได้'));
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      iframe.remove();
      resolve();
    };

    const doPrint = async () => {
      try {
        await waitForDocumentImages(doc);
        await new Promise((r) => setTimeout(r, 400));
        win.focus();
        win.print();
      } catch (err) {
        iframe.remove();
        reject(err instanceof Error ? err : new Error('พิมพ์ไม่สำเร็จ'));
        return;
      }

      win.addEventListener('afterprint', finish, { once: true });
      setTimeout(finish, 3000);
    };

    doc.open();
    doc.write(fullHtml);
    doc.close();

    if (doc.readyState === 'complete') {
      void doPrint();
    } else {
      iframe.onload = () => void doPrint();
    }
  });
}

export function buildFullHtmlDocument(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>${getAdasoftDocumentCss()}</style>
</head>
<body>
  <div class="export-container">${bodyHtml}</div>
</body>
</html>`;
}

export async function buildAdasoftExportHtml(
  content: string,
  title: string,
  metadata?: AdaExportMetadata
): Promise<string> {
  const bodyHtml = await processMarkdownToExportHtml(content, metadata);
  return buildTemplateHtmlDocument(bodyHtml, title);
}

export function sanitizeExportFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'document';
}

export interface AdasoftTemplateShell {
  headerHtml: string;
  footerHtml: string;
}

function bytesToDataUrl(bytes: Uint8Array, ext: string): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const mime =
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/png';
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Extract header images referenced by word/header1.xml (not all media) */
export async function loadAdasoftTemplateShell(): Promise<AdasoftTemplateShell> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error(`Template not found: ${TEMPLATE_URL}`);

  const zip = new PizZip(await response.arrayBuffer());
  const headerRels = zip.file('word/_rels/header1.xml.rels')?.asText() ?? '';
  const mediaTargets = [...headerRels.matchAll(/Target="(media\/[^"]+)"/g)].map((m) => `word/${m[1]}`);

  const images = mediaTargets
    .map((mediaPath) => {
      const file = zip.file(mediaPath);
      if (!file) return null;
      const ext = mediaPath.split('.').pop()?.toLowerCase() ?? 'png';
      return bytesToDataUrl(file.asUint8Array(), ext);
    })
    .filter(Boolean) as string[];

  const headerHtml =
    images.length > 0
      ? `<div class="adasoft-template-header">${images
          .map(
            (src, i) =>
              `<img src="${src}" alt="Adasoft header ${i + 1}" class="template-header-image" />`
          )
          .join('')}</div>`
      : '';

  const footerHtml = `<div class="adasoft-template-footer"><span>Adasoft</span></div>`;

  return { headerHtml, footerHtml };
}

function getTemplateShellCss(): string {
  return `
    .adasoft-template-header {
      margin-bottom: 6pt;
      padding-bottom: 4pt;
      border-bottom: 1px solid #cccccc;
    }
    .template-header-image {
      display: block;
      max-width: 72%;
      max-height: 0.55in;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .adasoft-template-footer {
      margin-top: 16pt;
      padding-top: 6pt;
      border-top: 1px solid #cccccc;
      font-size: 8pt;
      color: #666666;
      text-align: center;
    }
  `;
}

export function buildPdfReadyHtmlDocument(
  bodyHtml: string,
  title: string,
  shell: AdasoftTemplateShell
): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${getAdasoftDocumentCss()}
    ${getTemplateShellCss()}
  </style>
</head>
<body>
  <div id="pdf-export-root" style="width:210mm;box-sizing:border-box;padding:${ADA_PAGE_MARGIN.top} ${ADA_PAGE_MARGIN.right} ${ADA_PAGE_MARGIN.bottom} ${ADA_PAGE_MARGIN.left};">
    ${shell.headerHtml}
    <div class="export-container" style="width:100%;max-width:${ADA_CONTENT_WIDTH_IN}in;box-sizing:border-box;overflow:hidden;">${bodyHtml}</div>
    ${shell.footerHtml}
  </div>
</body>
</html>`;
}

async function waitForFontsAndImages(doc: Document): Promise<void> {
  await waitForDocumentImages(doc);
  if (doc.fonts?.ready) await doc.fonts.ready;
  await new Promise((r) => setTimeout(r, 600));
}

/** Browser fallback: template shell + adamd2pdf HTML → PDF blob (html2canvas + jsPDF) */
export async function generatePdfBlobInBrowser(
  content: string,
  title: string,
  metadata?: AdaExportMetadata
): Promise<Blob> {
  const bodyHtml = await processMarkdownToExportHtml(content, metadata);
  const shell = await loadAdasoftTemplateShell();
  const fullHtml = buildPdfReadyHtmlDocument(bodyHtml, title, shell);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:0;top:0;width:210mm;background:#fff;opacity:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(host);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:210mm;border:0;display:block;';
  host.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    host.remove();
    throw new Error('ไม่สามารถเตรียม PDF renderer ได้');
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  await waitForFontsAndImages(doc);

  const root = doc.getElementById('pdf-export-root');
  if (!root) {
    host.remove();
    throw new Error('PDF root element not found');
  }

  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight - pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    host.remove();
  }
}

/** Try template DOCX → PDF, then MD API, then browser fallback */
export async function exportPdfBlob(
  content: string,
  title: string,
  metadata?: AdaExportMetadata
): Promise<Blob> {
  // Primary: altChunk DOCX (data-URI diagrams) → flatten → PDF via Word COM
  try {
    const docxBlob = await buildAdasoftDocxBlob(content, title, metadata);
    const response = await fetch('/api/export/pdf-from-docx', {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'X-Export-Title': encodeURIComponent(title),
      },
      body: docxBlob,
    });
    if (response.ok) {
      return await response.blob();
    }
    console.warn('Template DOCX PDF export failed:', await response.text());
  } catch (error) {
    console.warn('Template DOCX PDF export unavailable:', error);
  }

  // Secondary: server MD → DOCX → PDF (Python pipeline)
  try {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, metadata }),
    });
    if (response.ok) {
      return await response.blob();
    }
    console.warn('Server PDF export failed:', await response.text());
  } catch (error) {
    console.warn('Server PDF export unavailable:', error);
  }

  return generatePdfBlobInBrowser(content, title, metadata);
}
