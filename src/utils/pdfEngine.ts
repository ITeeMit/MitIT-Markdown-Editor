import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

export interface PdfEngineOptions {
  title?: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  date?: string;
  paperSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: 'normal' | 'compact' | 'spacious';
  theme?: 'modern' | 'corporate' | 'minimal' | 'emerald';
  fontFamily?: 'Sarabun' | 'Kanit' | 'Prompt' | 'Inter';
  showHeader?: boolean;
  showFooter?: boolean;
  headerText?: string;
  footerText?: string;
  pageNumberFormat?: 'th' | 'en' | 'simple'; // 'หน้า {page} จาก {total}', 'Page {page} of {total}', '{page} / {total}'
  useTemplate?: boolean; // true = company template shell, false = custom smart pagination
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  headingText: string;
  ruleColor: string;
  headerBg: string;
  codeBg: string;
  tableHeaderBg: string;
}

export const THEME_PRESETS: Record<string, ThemeColors> = {
  modern: {
    primary: '#2563eb',
    secondary: '#3b82f6',
    background: '#ffffff',
    text: '#1e293b',
    headingText: '#0f172a',
    ruleColor: '#cbd5e1',
    headerBg: '#f8fafc',
    codeBg: '#f1f5f9',
    tableHeaderBg: '#eff6ff',
  },
  corporate: {
    primary: '#1e40af',
    secondary: '#1d4ed8',
    background: '#ffffff',
    text: '#1f2937',
    headingText: '#111827',
    ruleColor: '#d1d5db',
    headerBg: '#f3f4f6',
    codeBg: '#f3f4f6',
    tableHeaderBg: '#e0e7ff',
  },
  minimal: {
    primary: '#475569',
    secondary: '#64748b',
    background: '#ffffff',
    text: '#0f172a',
    headingText: '#0f172a',
    ruleColor: '#e2e8f0',
    headerBg: '#ffffff',
    codeBg: '#f8fafc',
    tableHeaderBg: '#f1f5f9',
  },
  emerald: {
    primary: '#059669',
    secondary: '#10b981',
    background: '#ffffff',
    text: '#064e3b',
    headingText: '#022c22',
    ruleColor: '#a7f3d0',
    headerBg: '#f0fdf4',
    codeBg: '#f0fdf4',
    tableHeaderBg: '#d1fae5',
  },
};

/** Load web fonts into document if needed */
async function ensurePdfFonts(fontFamily: string): Promise<void> {
  const fontUrlMap: Record<string, string> = {
    Sarabun: 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
    Kanit: 'https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
    Prompt: 'https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
    Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  };

  const url = fontUrlMap[fontFamily];
  if (url && !document.querySelector(`link[href="${url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    await new Promise((r) => setTimeout(r, 300));
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/** Sanitize HTML string */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Build printable CSS for the Page-by-Page PDF sandbox with enhanced Thai typography */
function getPageCss(options: PdfEngineOptions, theme: ThemeColors, font: string): string {
  const fontSize = '13.5px';
  const lineHeight = '1.85';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');

    .pdf-sandbox-root {
      font-family: '${font}', 'Noto Sans Thai', 'Arial', sans-serif !important;
      font-size: ${fontSize};
      line-height: ${lineHeight};
      color: ${theme.text};
      background: transparent;
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      padding: 0;
      letter-spacing: 0.012em;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    .pdf-sandbox-root h1, 
    .pdf-sandbox-root h2, 
    .pdf-sandbox-root h3, 
    .pdf-sandbox-root h4, 
    .pdf-sandbox-root h5, 
    .pdf-sandbox-root h6 {
      font-family: '${font === 'Sarabun' ? 'Kanit' : font}', sans-serif !important;
      color: ${theme.headingText} !important;
      font-weight: 600;
      line-height: 1.35;
      margin-top: 1.3em;
      margin-bottom: 0.6em;
      letter-spacing: 0;
    }

    .pdf-sandbox-root h1 {
      font-size: 23px !important;
      border-bottom: 2px solid ${theme.primary} !important;
      padding-bottom: 6px;
      margin-top: 0.4em;
    }

    .pdf-sandbox-root h2 {
      font-size: 18.5px !important;
      border-bottom: 1px solid ${theme.ruleColor} !important;
      padding-bottom: 4px;
    }

    .pdf-sandbox-root h3 { font-size: 16px !important; }
    .pdf-sandbox-root h4 { font-size: 14.5px !important; }
    .pdf-sandbox-root h5, .pdf-sandbox-root h6 { font-size: 13.5px !important; }

    .pdf-sandbox-root p {
      margin: 0.65em 0;
      text-align: justify;
      word-break: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .pdf-sandbox-root ul, .pdf-sandbox-root ol {
      margin: 0.5em 0;
      padding-left: 22px;
    }

    .pdf-sandbox-root li {
      margin: 0.3em 0;
    }

    .pdf-sandbox-root pre {
      background: ${theme.codeBg} !important;
      border: 1px solid ${theme.ruleColor} !important;
      border-left: 4px solid ${theme.primary} !important;
      border-radius: 6px;
      padding: 10px 14px !important;
      margin: 0.8em 0 !important;
      font-family: 'Courier New', Consolas, monospace !important;
      font-size: 11.5px !important;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .pdf-sandbox-root code {
      font-family: 'Courier New', Consolas, monospace !important;
      background: ${theme.codeBg} !important;
      color: ${theme.primary} !important;
      padding: 2px 5px !important;
      border-radius: 4px;
      font-size: 0.9em;
    }

    .pdf-sandbox-root pre code {
      background: transparent !important;
      color: inherit !important;
      padding: 0 !important;
    }

    .pdf-sandbox-root table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8em 0 !important;
      font-size: 12px;
    }

    .pdf-sandbox-root th, .pdf-sandbox-root td {
      border: 1px solid ${theme.ruleColor} !important;
      padding: 6px 10px !important;
      text-align: left;
    }

    .pdf-sandbox-root th {
      background: ${theme.tableHeaderBg} !important;
      color: ${theme.headingText} !important;
      font-weight: 600;
    }

    .pdf-sandbox-root blockquote {
      border-left: 4px solid ${theme.primary} !important;
      background: ${theme.headerBg} !important;
      margin: 0.8em 0 !important;
      padding: 8px 14px !important;
      border-radius: 0 6px 6px 0;
      font-style: italic;
    }

    .pdf-sandbox-root img, .pdf-sandbox-root svg {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0.8em auto;
    }
  `;
}

/**
 * Split a multi-line paragraph element into smaller paragraph chunks if it overflows remaining space
 */
function splitParagraphToFit(
  pEl: HTMLParagraphElement,
  bodyEl: HTMLElement,
  maxHeight: number
): { fitEl: HTMLParagraphElement | null; remainingEl: HTMLParagraphElement | null } {
  const text = pEl.textContent || '';
  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];

  if (sentences.length <= 1) {
    return { fitEl: null, remainingEl: pEl };
  }

  let fitText = '';
  let splitIdx = 0;

  const tempP = document.createElement('p');
  tempP.className = pEl.className;
  bodyEl.appendChild(tempP);

  for (let i = 0; i < sentences.length; i++) {
    const testText = fitText + sentences[i];
    tempP.textContent = testText;
    if (bodyEl.scrollHeight > maxHeight) {
      break;
    }
    fitText = testText;
    splitIdx = i + 1;
  }

  tempP.remove();

  if (splitIdx === 0 || splitIdx >= sentences.length) {
    return { fitEl: null, remainingEl: pEl };
  }

  const firstPartP = document.createElement('p');
  firstPartP.className = pEl.className;
  firstPartP.textContent = sentences.slice(0, splitIdx).join('');

  const secondPartP = document.createElement('p');
  secondPartP.className = pEl.className;
  secondPartP.textContent = sentences.slice(splitIdx).join('');

  return { fitEl: firstPartP, remainingEl: secondPartP };
}

/**
 * Generate a PDF Blob dynamically using Page-by-Page DOM Container Pagination
 * This guarantees zero cut text lines and crisp HTML headers/footers.
 */
export async function generateDynamicPdfBlob(
  markdownContent: string,
  options: PdfEngineOptions = {}
): Promise<Blob> {
  const themeName = options.theme || 'modern';
  const theme = THEME_PRESETS[themeName] || THEME_PRESETS.modern;
  const fontFamily = options.fontFamily || 'Sarabun';

  await ensurePdfFonts(fontFamily);

  // 1. Convert markdown to HTML
  marked.setOptions({ breaks: true, gfm: true });
  let rawHtml = '';
  try {
    rawHtml = await marked(markdownContent);
  } catch (err) {
    console.error('Markdown parsing error:', err);
    rawHtml = `<p>${escapeHtml(markdownContent)}</p>`;
  }

  // 2. Paper dimensions & Margins (in mm & pixels @ 96 DPI: 1mm = 3.7795 px)
  const isLandscape = options.orientation === 'landscape';
  const isLetter = options.paperSize === 'letter';

  const mmWidth = isLetter ? (isLandscape ? 279.4 : 215.9) : (isLandscape ? 297 : 210);
  const mmHeight = isLetter ? (isLandscape ? 215.9 : 279.4) : (isLandscape ? 210 : 297);

  const marginConfig = options.margin || 'normal';
  const marginMm = marginConfig === 'compact' ? 12 : marginConfig === 'spacious' ? 25 : 18;

  const pxPerMm = 3.7795;
  const pagePxWidth = Math.round(mmWidth * pxPerMm);
  const pagePxHeight = Math.round(mmHeight * pxPerMm);
  const marginPx = Math.round(marginMm * pxPerMm);

  // 3. Create offscreen host
  const host = document.createElement('div');
  host.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${pagePxWidth}px;
    background: #ffffff;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
  `;
  document.body.appendChild(host);

  const styleEl = document.createElement('style');
  styleEl.textContent = getPageCss(options, theme, fontFamily);
  host.appendChild(styleEl);

  // Temporary stage element to parse top-level markdown HTML nodes
  const stage = document.createElement('div');
  stage.className = 'pdf-sandbox-root';
  stage.style.cssText = `width: ${pagePxWidth - marginPx * 2}px; position: absolute; visibility: hidden;`;
  stage.innerHTML = rawHtml;
  host.appendChild(stage);

  // Wait for images & fonts
  const images = stage.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve(null);
          else {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
          }
        })
    )
  );

  await new Promise((r) => setTimeout(r, 200));

  const elements = Array.from(stage.children) as HTMLElement[];

  // 4. Create Page-by-Page Container Structure
  const pagesWrapper = document.createElement('div');
  pagesWrapper.className = 'pdf-pages-wrapper';
  host.appendChild(pagesWrapper);

  const docTitle = options.title || 'Document';
  const docSubtitle = options.subtitle || options.organization || '';
  const dateStr = options.date || new Date().toLocaleDateString('th-TH');

  const pageList: { pageEl: HTMLElement; bodyEl: HTMLElement; footerEl: HTMLElement }[] = [];

  const createNewPage = (pageNum: number) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'pdf-page-sheet';
    const topPadPx = options.useTemplate ? Math.round(10 * pxPerMm) : Math.round(12 * pxPerMm);
    const bottomPadPx = options.useTemplate ? Math.round(14 * pxPerMm) : marginPx;
    const sidePadPx = marginPx;

    pageEl.style.cssText = `
      width: ${pagePxWidth}px;
      height: ${pagePxHeight}px;
      padding: ${topPadPx}px ${sidePadPx}px ${bottomPadPx}px ${sidePadPx}px;
      box-sizing: border-box;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
    `;

    // Top Accent Bar (only in custom theme mode)
    if (!options.useTemplate) {
      const topBar = document.createElement('div');
      topBar.style.cssText = `background: ${theme.primary}; height: 4px; width: 100%; position: absolute; top: 0; left: 0;`;
      pageEl.appendChild(topBar);
    }

    // Header Region
    const headerEl = document.createElement('div');
    headerEl.className = 'pdf-header-region';
    if (options.showHeader !== false) {
      if (options.useTemplate) {
        headerEl.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 6px;
          border-bottom: 1px solid #b0b0b0;
          margin-bottom: 12px;
          width: 100%;
          box-sizing: border-box;
        `;
        headerEl.innerHTML = `
          <div style="flex: 0 0 auto;">
            <img src="/adasoft-logo.png" alt="Adasoft" style="max-height: 42px; width: auto; display: block;" />
          </div>
          <div style="flex: 1 1 auto; text-align: left; margin-left: 16px; font-family: '${fontFamily}', sans-serif; font-size: 10px; color: #555555; line-height: 1.45;">
            <div>26/5-8 Soi Ladprao83 (Chit Ari) Ladprao Rd. Khlong Chaokhun Sing, Wangthonglang Bangkok 10310 Thailand.</div>
            <div>Tel. +662 530-1681(auto)&nbsp;&nbsp;Fax. +662 25301681 ext. 1109&nbsp;&nbsp;email : <span style="color: #0066cc; text-decoration: underline;">info@ada-soft.com</span></div>
          </div>
        `;
      } else {
        headerEl.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: '${fontFamily}', sans-serif;
          font-size: 11px;
          color: #64748b;
          padding-bottom: 6px;
          border-bottom: 1px solid ${theme.ruleColor};
          margin-bottom: 12px;
          margin-top: 4px;
          width: 100%;
          box-sizing: border-box;
        `;
        headerEl.innerHTML = `
          <span style="font-weight:600; color:${theme.headingText};">${escapeHtml(options.headerText || docTitle)}</span>
          <span>${escapeHtml(docSubtitle)}</span>
        `;
      }
    }
    pageEl.appendChild(headerEl);

    // Body Region
    const bodyEl = document.createElement('div');
    bodyEl.className = 'pdf-body-region pdf-sandbox-root';
    bodyEl.style.cssText = `
      flex: 1;
      overflow: hidden;
      box-sizing: border-box;
      width: 100%;
    `;
    pageEl.appendChild(bodyEl);

    // Footer Region
    const footerEl = document.createElement('div');
    footerEl.className = 'pdf-footer-region';
    if (options.showFooter !== false) {
      footerEl.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: '${fontFamily}', sans-serif;
        font-size: 11px;
        color: #64748b;
        padding-top: 6px;
        border-top: 1px solid ${theme.ruleColor};
        margin-top: 12px;
        width: 100%;
        box-sizing: border-box;
      `;
      footerEl.innerHTML = `
        <span>${escapeHtml(options.footerText || options.author || `Markdown Editor • ${dateStr}`)}</span>
        <span class="page-num-placeholder">--</span>
      `;
    }
    pageEl.appendChild(footerEl);

    pagesWrapper.appendChild(pageEl);
    return { pageEl, bodyEl, footerEl };
  };

  // Create Page 1
  let currentPage = createNewPage(1);
  pageList.push(currentPage);

  await new Promise((r) => setTimeout(r, 50));
  const maxBodyHeight = currentPage.bodyEl.clientHeight;

  // 5. Flow Elements into Pages safely without overflow
  const elementQueue = [...elements];

  while (elementQueue.length > 0) {
    const origEl = elementQueue.shift()!;
    const clone = origEl.cloneNode(true) as HTMLElement;

    currentPage.bodyEl.appendChild(clone);

    // Check if adding clone caused body container to overflow available height
    if (currentPage.bodyEl.scrollHeight > maxBodyHeight) {
      clone.remove();

      const tagName = origEl.tagName.toLowerCase();

      // Special Handling for Table Row Splitting
      if (tagName === 'table') {
        const table = origEl as HTMLTableElement;
        const thead = table.querySelector('thead');
        const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLTableRowElement[];

        let currentTable = document.createElement('table');
        currentTable.className = table.className;
        if (thead) currentTable.appendChild(thead.cloneNode(true));
        let tbody = document.createElement('tbody');
        currentTable.appendChild(tbody);
        currentPage.bodyEl.appendChild(currentTable);

        const remainingRows: HTMLTableRowElement[] = [];

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          const rowClone = row.cloneNode(true);
          tbody.appendChild(rowClone);

          if (currentPage.bodyEl.scrollHeight > maxBodyHeight) {
            tbody.removeChild(rowClone);
            remainingRows.push(...rows.slice(rIdx));
            break;
          }
        }

        if (remainingRows.length > 0) {
          currentPage = createNewPage(pageList.length + 1);
          pageList.push(currentPage);

          const newTable = document.createElement('table');
          newTable.className = table.className;
          if (thead) newTable.appendChild(thead.cloneNode(true));
          const newTbody = document.createElement('tbody');
          newTable.appendChild(newTbody);

          remainingRows.forEach((r) => newTbody.appendChild(r.cloneNode(true)));
          elementQueue.unshift(newTable);
        }
      } 
      // Special Handling for Paragraph Splitting
      else if (tagName === 'p' && (origEl.textContent || '').length > 100) {
        const { fitEl, remainingEl } = splitParagraphToFit(
          origEl as HTMLParagraphElement,
          currentPage.bodyEl,
          maxBodyHeight
        );

        if (fitEl) {
          currentPage.bodyEl.appendChild(fitEl);
        }

        currentPage = createNewPage(pageList.length + 1);
        pageList.push(currentPage);

        if (remainingEl) {
          elementQueue.unshift(remainingEl);
        }
      } 
      // Default: Move whole element to next page
      else {
        currentPage = createNewPage(pageList.length + 1);
        pageList.push(currentPage);

        currentPage.bodyEl.appendChild(origEl.cloneNode(true));
      }
    }
  }

  // 6. Update Total Page Numbers in Footers
  const totalPages = pageList.length;
  pageList.forEach(({ footerEl }, idx) => {
    const pageNum = idx + 1;
    const pageNumSpan = footerEl.querySelector('.page-num-placeholder');
    if (pageNumSpan) {
      let pageNumText = `${pageNum} / ${totalPages}`;
      if (options.pageNumberFormat === 'th') {
        pageNumText = `หน้า ${pageNum} จาก ${totalPages}`;
      } else if (options.pageNumberFormat === 'en') {
        pageNumText = `Page ${pageNum} of ${totalPages}`;
      }
      pageNumSpan.textContent = pageNumText;
    }
  });

  stage.remove();
  await new Promise((r) => setTimeout(r, 200));

  // 7. Render Each Page Container with html2canvas and assemble jsPDF
  const pdf = new jsPDF({
    orientation: isLandscape ? 'l' : 'p',
    unit: 'mm',
    format: isLetter ? 'letter' : 'a4',
  });

  try {
    for (let pIdx = 0; pIdx < pageList.length; pIdx++) {
      if (pIdx > 0) pdf.addPage();

      const pageEl = pageList[pIdx].pageEl;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: pagePxWidth,
        windowHeight: pagePxHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight);
    }

    return pdf.output('blob');
  } finally {
    host.remove();
  }
}
