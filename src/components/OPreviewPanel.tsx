import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { marked } from 'marked';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Maximize2,
  X,
  Code2,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { messageBox } from '@/utils/messageBox';
import mermaid from 'mermaid';
import plantumlEncoder from 'plantuml-encoder';
import { fixMermaidSyntax, fixPlantUmlSyntax } from '@/utils/adaExportPipeline';

interface OPreviewPanelProps {
  className?: string;
}

interface DiagramCardData {
  id: string;
  type: 'mermaid' | 'plantuml';
  code: string;
}

const OPreviewPanel: React.FC<OPreviewPanelProps> = ({ className = '' }) => {
  const { currentDocument, content, currentMode } = useEditorStore();
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [collapsedCodeMap, setCollapsedCodeMap] = useState<Record<string, boolean>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [zoomModalDiagram, setZoomModalDiagram] = useState<{
    title: string;
    type: 'mermaid' | 'plantuml';
    svgContent?: string;
    imgSrc?: string;
    code: string;
  } | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const plantumlRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid with appropriate theme
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: "'Sarabun', 'Noto Sans Thai', 'Segoe UI', system-ui, sans-serif",
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: false,
        },
      });
    } catch (err) {
      console.warn('Mermaid initialization warning:', err);
    }
  }, [theme]);

  // Configure marked options
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  // Extract all diagram blocks from markdown content for tracked rendering
  const diagramList = useMemo<DiagramCardData[]>(() => {
    const rawContent = content || currentDocument?.content || '';
    if (!rawContent || currentMode !== 'markdown') return [];

    const diagrams: DiagramCardData[] = [];
    const codeBlockRegex = /```(mermaid|plantuml|puml|uml)[\r\n]+([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = codeBlockRegex.exec(rawContent)) !== null) {
      const lang = match[1].toLowerCase();
      const type: 'mermaid' | 'plantuml' = lang === 'mermaid' ? 'mermaid' : 'plantuml';
      const code = match[2].trim();
      diagrams.push({
        id: `diag-${type}-${index}`,
        type,
        code,
      });
      index++;
    }

    return diagrams;
  }, [content, currentDocument?.content, currentMode]);

  // Convert markdown to HTML with enhanced diagram and table card containers
  const renderContent = useMemo(() => {
    const currentContent = content || currentDocument?.content || '';

    if (!currentContent.trim()) {
      return '<div class="empty-state"><p>พิมพ์หรือวางข้อความ Markdown เพื่อเริ่มดูตัวอย่าง...</p></div>';
    }

    if (currentMode === 'mermaid') {
      return `<div id="mermaid-preview" class="mermaid-container"></div>`;
    }

    if (currentMode === 'plantuml') {
      return `<div id="plantuml-preview" class="plantuml-container"></div>`;
    }

    try {
      // Custom parser to inject diagram containers into marked output
      let diagramIndex = 0;
      const renderer = new marked.Renderer();
      renderer.code = function (token: any) {
        const text = (typeof token === 'object' && token !== null ? token.text : token) || '';
        const rawLang = ((typeof token === 'object' && token !== null ? token.lang : arguments[1]) || '').trim().toLowerCase();
            if (rawLang === 'mermaid' || ['plantuml', 'puml', 'uml'].includes(rawLang)) {
              const diagType: 'mermaid' | 'plantuml' = rawLang === 'mermaid' ? 'mermaid' : 'plantuml';
              const cardId = `diag-${diagType}-${diagramIndex++}`;
              const langTitle = diagType === 'mermaid' ? 'Mermaid Diagram' : 'PlantUML Diagram';
              const badgeClass =
                diagType === 'mermaid'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

              const escapedCode = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

              return `
                <div class="diagram-card my-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg" id="${cardId}" data-diagram-id="${cardId}" data-diagram-type="${diagType}">
                  <!-- Diagram Card Header -->
                  <div class="diagram-card-header flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/70 dark:from-gray-800 dark:to-gray-800/80 border-b border-gray-200 dark:border-gray-700 select-none">
                    <div class="flex items-center gap-2.5">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}">
                        ${diagType === 'mermaid' ? '📊 Mermaid' : '📐 PlantUML'}
                      </span>
                      <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">${langTitle}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button class="diagram-zoom-btn flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" data-card-id="${cardId}" title="ขยายดูภาพขนาดเต็ม (Zoom Fullscreen)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                        <span>ขยายภาพ</span>
                      </button>
                      <button class="diagram-toggle-code-btn flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" data-card-id="${cardId}" title="ซ่อน/แสดงโค้ด (Toggle Code)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        <span>โค้ด</span>
                      </button>
                    </div>
                  </div>

                  <!-- Diagram Visual Area -->
                  <div class="diagram-visual-container p-6 bg-slate-50/50 dark:bg-gray-900/40 flex justify-center items-center overflow-x-auto min-h-[140px]" id="visual-${cardId}">
                    <div class="diagram-placeholder flex flex-col items-center gap-2 py-6 text-gray-400">
                      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span class="text-xs">กำลังเรนเดอร์ ${langTitle}...</span>
                    </div>
                  </div>

                  <!-- Source Code Area (Placed Below the Diagram as requested) -->
                  <div class="diagram-code-container border-t border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100" id="code-container-${cardId}">
                    <div class="flex items-center justify-between px-3.5 py-1.5 bg-gray-800/90 text-xs text-gray-400 border-b border-gray-700 select-none">
                      <div class="flex items-center gap-1.5 font-mono text-[11px] text-gray-300">
                        <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        <span>${diagType === 'mermaid' ? 'Mermaid Code' : 'PlantUML Code'}</span>
                      </div>
                      <button class="diagram-copy-code-btn flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors" data-card-id="${cardId}" title="คัดลอกโค้ด">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        <span>คัดลอกโค้ด</span>
                      </button>
                    </div>
                    <pre class="m-0 p-3.5 text-xs font-mono text-emerald-400 bg-transparent overflow-x-auto leading-relaxed whitespace-pre" id="code-pre-${cardId}"><code>${escapedCode}</code></pre>
                  </div>
                </div>
              `;
            }

        // Normal code blocks
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<pre><code class="language-${rawLang}">${escaped}</code></pre>`;
      };

      const parsedHtml = marked.parse(currentContent, { renderer }) as string;
      return parsedHtml;
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<div class="error-state"><p>เกิดข้อผิดพลาดในการประมวลผล Markdown</p></div>';
    }
  }, [content, currentDocument?.content, currentMode]);

  // Render Mermaid diagrams asynchronously in Markdown mode
  useEffect(() => {
    if (currentMode !== 'markdown') return;

    let isCancelled = false;

    const renderAllDiagrams = async () => {
      for (const diag of diagramList) {
        if (isCancelled) break;

        const visualEl = document.getElementById(`visual-${diag.id}`);
        if (!visualEl) continue;

        if (diag.type === 'mermaid') {
          try {
            const fixedCode = fixMermaidSyntax(diag.code);
            const renderId = `mermaid-svg-${diag.id}-${Date.now().toString(36)}`;
            
            const { svg } = await mermaid.render(renderId, fixedCode);
            if (isCancelled) return;

            visualEl.innerHTML = `
              <div class="mermaid-rendered-svg w-full flex justify-center items-center py-2" style="max-width: 100%;">
                ${svg}
              </div>
            `;

            // Style rendered SVG for perfect responsiveness
            const svgEl = visualEl.querySelector('svg');
            if (svgEl) {
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.display = 'block';
              svgEl.style.margin = '0 auto';
            }
          } catch (err) {
            console.warn(`Mermaid render fallback for ${diag.id}:`, err);
            // Clean up any stray error elements mermaid injected
            const strayErr = document.getElementById(`d${diag.id}`);
            if (strayErr) strayErr.remove();

            if (!isCancelled && visualEl) {
              // Fallback to Kroki / Mermaid image or helpful error view
              const encodedMermaid = btoa(unescape(encodeURIComponent(JSON.stringify({ code: fixMermaidSyntax(diag.code) }))));
              const fallbackUrl = `https://mermaid.ink/svg/${encodedMermaid}`;

              visualEl.innerHTML = `
                <div class="mermaid-fallback-wrapper w-full flex flex-col items-center justify-center py-2">
                  <img src="${fallbackUrl}" alt="Mermaid Diagram" class="max-w-full h-auto mx-auto rounded" onerror="this.parentElement.innerHTML='<div class=\\'flex items-center gap-2 p-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800\\'><span>⚠️ กำลังแก้ไข syntax ของ Mermaid...</span></div>'" />
                </div>
              `;
            }
          }
        } else if (diag.type === 'plantuml') {
          try {
            const fixedCode = fixPlantUmlSyntax(diag.code);
            const encoded = plantumlEncoder.encode(fixedCode);
            const plantumlUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;

            visualEl.innerHTML = `
              <div class="plantuml-rendered-wrapper w-full flex justify-center items-center py-2">
                <img 
                  src="${plantumlUrl}" 
                  alt="PlantUML Diagram" 
                  class="max-w-full h-auto mx-auto rounded shadow-sm"
                  style="display: block; max-height: 600px; width: auto;"
                  onerror="this.parentElement.innerHTML='<div class=\\'flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800\\'><span>❌ ไม่สามารถโหลดภาพ PlantUML ได้ กรุณาตรวจสอบ Syntax</span></div>'"
                />
              </div>
            `;
          } catch (err) {
            console.error('PlantUML encode error:', err);
            if (!isCancelled && visualEl) {
              visualEl.innerHTML = `
                <div class="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800">
                  <span>เกิดข้อผิดพลาดในการประมวลผล PlantUML</span>
                </div>
              `;
            }
          }
        }
      }
    };

    const timer = setTimeout(() => {
      renderAllDiagrams();
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentMode, renderContent, diagramList, theme]);

  // Attach button click listeners (Zoom, Toggle Code, Copy Code) to diagram cards
  useEffect(() => {
    if (currentMode !== 'markdown') return;

    const container = previewContainerRef.current;
    if (!container) return;

    const handleContainerClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle Zoom Button
      const zoomBtn = target.closest('.diagram-zoom-btn') as HTMLElement;
      if (zoomBtn) {
        const cardId = zoomBtn.getAttribute('data-card-id');
        const cardEl = document.getElementById(cardId || '');
        if (cardEl && cardId) {
          const diagType = cardEl.getAttribute('data-diagram-type') as 'mermaid' | 'plantuml';
          const visualEl = document.getElementById(`visual-${cardId}`);
          const codeEl = document.getElementById(`code-pre-${cardId}`);
          const codeText = codeEl?.textContent || '';
          const svgEl = visualEl?.querySelector('svg');
          const imgEl = visualEl?.querySelector('img');

          setZoomModalDiagram({
            title: diagType === 'mermaid' ? 'Mermaid Diagram Viewer' : 'PlantUML Diagram Viewer',
            type: diagType,
            svgContent: svgEl ? svgEl.outerHTML : undefined,
            imgSrc: imgEl ? imgEl.src : undefined,
            code: codeText,
          });
        }
        return;
      }

      // Handle Toggle Code Button
      const toggleCodeBtn = target.closest('.diagram-toggle-code-btn') as HTMLElement;
      if (toggleCodeBtn) {
        const cardId = toggleCodeBtn.getAttribute('data-card-id');
        if (cardId) {
          const codeContainer = document.getElementById(`code-container-${cardId}`);
          if (codeContainer) {
            const isHidden = codeContainer.style.display === 'none';
            codeContainer.style.display = isHidden ? 'block' : 'none';
            setCollapsedCodeMap((prev) => ({ ...prev, [cardId]: !isHidden }));
          }
        }
        return;
      }

      // Handle Copy Code Button
      const copyCodeBtn = target.closest('.diagram-copy-code-btn') as HTMLElement;
      if (copyCodeBtn) {
        const cardId = copyCodeBtn.getAttribute('data-card-id');
        if (cardId) {
          const codeEl = document.getElementById(`code-pre-${cardId}`);
          const codeText = codeEl?.textContent || '';
          if (codeText) {
            await navigator.clipboard.writeText(codeText);
            setCopiedCodeId(cardId);
            await messageBox.success('คัดลอกโค้ดสำเร็จ');
            setTimeout(() => setCopiedCodeId(null), 2000);
          }
        }
        return;
      }
    };

    container.addEventListener('click', handleContainerClick);
    return () => {
      container.removeEventListener('click', handleContainerClick);
    };
  }, [currentMode, renderContent]);

  // Handle dedicated Mermaid mode
  useEffect(() => {
    if (currentMode === 'mermaid' && mermaidRef.current) {
      const currentContent = content || currentDocument?.content || '';

      if (currentContent.trim()) {
        try {
          mermaidRef.current.innerHTML = '';

          let mermaidCode = currentContent;
          const mermaidMatch = currentContent.match(/```mermaid\n([\s\S]*?)\n```/);
          if (mermaidMatch) {
            mermaidCode = mermaidMatch[1];
          }

          const fixedCode = fixMermaidSyntax(mermaidCode);
          const renderId = `mermaid-mode-svg-${Date.now().toString(36)}`;

          mermaid
            .render(renderId, fixedCode)
            .then(({ svg }) => {
              if (mermaidRef.current) {
                mermaidRef.current.innerHTML = `
                  <div class="diagram-card rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
                    <div class="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        📊 Mermaid Diagram
                      </span>
                    </div>
                    <div class="p-6 bg-slate-50/50 dark:bg-gray-900/40 flex justify-center items-center overflow-x-auto">
                      ${svg}
                    </div>
                    <div class="border-t border-gray-200 dark:border-gray-700 bg-gray-900 p-3">
                      <div class="text-xs text-gray-400 font-mono mb-1">Source Code:</div>
                      <pre class="m-0 p-2 text-xs font-mono text-emerald-400 bg-black/40 rounded overflow-x-auto"><code>${fixedCode}</code></pre>
                    </div>
                  </div>
                `;
              }
            })
            .catch((error) => {
              console.error('Mermaid rendering error:', error);
              if (mermaidRef.current) {
                mermaidRef.current.innerHTML = `
                  <div class="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                    <p class="font-bold">Error rendering Mermaid diagram</p>
                    <p class="text-xs mt-1 font-mono">${error instanceof Error ? error.message : 'Syntax error'}</p>
                  </div>
                `;
              }
            });
        } catch (error) {
          console.error('Mermaid processing error:', error);
        }
      }
    }
  }, [currentMode, content, currentDocument?.content, theme]);

  // Handle dedicated PlantUML mode
  useEffect(() => {
    if (currentMode === 'plantuml' && plantumlRef.current) {
      const currentContent = content || currentDocument?.content || '';

      if (currentContent.trim()) {
        try {
          plantumlRef.current.innerHTML = '';

          let plantumlCode = currentContent;
          const plantumlMatch = currentContent.match(/```plantuml\n([\s\S]*?)\n```/);
          if (plantumlMatch) {
            plantumlCode = plantumlMatch[1];
          }

          const fixedCode = fixPlantUmlSyntax(plantumlCode);
          const encoded = plantumlEncoder.encode(fixedCode);
          const plantumlUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;

          plantumlRef.current.innerHTML = `
            <div class="diagram-card rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              <div class="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  📐 PlantUML Diagram
                </span>
              </div>
              <div class="p-6 bg-slate-50/50 dark:bg-gray-900/40 flex justify-center items-center overflow-x-auto">
                <img src="${plantumlUrl}" alt="PlantUML Diagram" class="max-w-full h-auto rounded shadow-sm" />
              </div>
              <div class="border-t border-gray-200 dark:border-gray-700 bg-gray-900 p-3">
                <div class="text-xs text-gray-400 font-mono mb-1">Source Code:</div>
                <pre class="m-0 p-2 text-xs font-mono text-emerald-400 bg-black/40 rounded overflow-x-auto"><code>${fixedCode}</code></pre>
              </div>
            </div>
          `;
        } catch (error) {
          console.error('PlantUML processing error:', error);
        }
      }
    }
  }, [currentMode, content, currentDocument?.content]);

  // Handle Rich Copy for MS Word & Email
  const handleCopyFormattedContent = async () => {
    const currentContent = content || currentDocument?.content || '';
    if (!currentContent.trim()) {
      await messageBox.warning('ไม่มีเนื้อหาสำหรับคัดลอก');
      return;
    }

    try {
      const previewEl = previewContainerRef.current?.querySelector('.preview-content');
      let htmlToCopy = '';

      if (previewEl) {
        // Clone preview container to clean up for Word export
        const clone = previewEl.cloneNode(true) as HTMLElement;

        // Remove interactive action buttons from copied HTML
        clone.querySelectorAll('.diagram-card-header button').forEach((b) => b.remove());

        htmlToCopy = `
          <div style="font-family: 'Sarabun', 'Noto Sans Thai', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">
            ${clone.innerHTML}
          </div>
        `;
      } else {
        const parsedHtml = await marked(currentContent);
        htmlToCopy = `
          <div style="font-family: 'Sarabun', 'Noto Sans Thai', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">
            ${parsedHtml}
          </div>
        `;
      }

      const plainText = currentContent;

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
        await navigator.clipboard.write([item]);
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlToCopy;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('copy');
          selection.removeAllRanges();
        }
        document.body.removeChild(tempDiv);
      }

      setIsCopied(true);
      await messageBox.success('คัดลอกเนื้อหาพร้อมรูป Diagram และตารางสำเร็จ! (วางใน Word / Email ได้ทันที)');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
      await messageBox.error('เกิดข้อผิดพลาดในการคัดลอกไปยังคลิปบอร์ด');
    }
  };

  // Custom CSS for preview styling with enhanced Thai Sarabun font & modern tables
  const previewStyles = `
    <style>
      .preview-content {
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.7;
        color: #374151;
        max-width: none;
        word-break: break-word;
      }
      
      .dark .preview-content {
        color: #e5e7eb;
      }
      
      .preview-content h1 {
        font-size: 1.85rem;
        font-weight: 700;
        margin: 1.75rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #3b82f6;
        color: #1e3a8a;
      }
      
      .dark .preview-content h1 {
        color: #60a5fa;
        border-bottom-color: #2563eb;
      }
      
      .preview-content h2 {
        font-size: 1.45rem;
        font-weight: 700;
        margin: 1.5rem 0 0.75rem 0;
        padding-bottom: 0.35rem;
        border-bottom: 1px solid #e5e7eb;
        color: #1f2937;
      }
      
      .dark .preview-content h2 {
        color: #f3f4f6;
        border-bottom-color: #374151;
      }
      
      .preview-content h3 {
        font-size: 1.2rem;
        font-weight: 600;
        margin: 1.25rem 0 0.5rem 0;
        color: #374151;
      }
      
      .dark .preview-content h3 {
        color: #d1d5db;
      }

      .preview-content h4, .preview-content h5, .preview-content h6 {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 1rem 0 0.4rem 0;
        color: #4b5563;
      }
      
      .dark .preview-content h4, .dark .preview-content h5, .dark .preview-content h6 {
        color: #9ca3af;
      }
      
      .preview-content p {
        margin: 0.75rem 0;
        line-height: 1.75;
      }
      
      .preview-content ul, .preview-content ol {
        margin: 0.75rem 0;
        padding-left: 1.75rem;
      }
      
      .preview-content li {
        margin: 0.35rem 0;
      }
      
      .preview-content blockquote {
        margin: 1rem 0;
        padding: 0.75rem 1.25rem;
        border-left: 4px solid #3b82f6;
        background-color: #f0fdf4;
        border-radius: 0 0.5rem 0.5rem 0;
        font-style: italic;
        color: #1e293b;
      }
      
      .dark .preview-content blockquote {
        background-color: #1e293b;
        border-left-color: #60a5fa;
        color: #cbd5e1;
      }
      
      .preview-content code {
        background-color: #f1f5f9;
        padding: 0.15rem 0.35rem;
        border-radius: 0.25rem;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.875rem;
        color: #be123c;
        border: 1px solid #e2e8f0;
      }
      
      .dark .preview-content code {
        background-color: #1e293b;
        color: #fb7185;
        border-color: #334155;
      }
      
      .preview-content pre:not([class*="diagram-code"]) {
        background-color: #0f172a;
        color: #e2e8f0;
        padding: 1rem 1.25rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 1rem 0;
        border: 1px solid #1e293b;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      }
      
      .preview-content pre:not([class*="diagram-code"]) code {
        background-color: transparent;
        padding: 0;
        color: #38bdf8;
        border: none;
      }
      
      /* Modern Responsive Table Styles */
      .preview-table-wrapper {
        width: 100%;
        margin: 1.25rem 0;
      }

      .preview-content table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 0.925rem;
        background-color: #ffffff;
      }
      
      .dark .preview-content table {
        background-color: #111827;
      }

      .preview-content th {
        background-color: #f8fafc;
        color: #1e293b;
        font-weight: 600;
        padding: 0.75rem 1rem;
        border-bottom: 2px solid #cbd5e1;
        border-right: 1px solid #e2e8f0;
        text-align: left;
      }
      
      .dark .preview-content th {
        background-color: #1f2937;
        color: #f9fafb;
        border-bottom-color: #4b5563;
        border-right-color: #374151;
      }

      .preview-content td {
        padding: 0.65rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        border-right: 1px solid #e2e8f0;
        color: #334151;
      }
      
      .dark .preview-content td {
        border-bottom-color: #374151;
        border-right-color: #374151;
        color: #d1d5db;
      }

      .preview-content tr:nth-child(even) td {
        background-color: #f9fafb;
      }
      
      .dark .preview-content tr:nth-child(even) td {
        background-color: #182234;
      }

      .preview-content tr:hover td {
        background-color: #f1f5f9;
      }
      
      .dark .preview-content tr:hover td {
        background-color: #1e293b;
      }

      .preview-content th:last-child, .preview-content td:last-child {
        border-right: none;
      }

      .preview-content tr:last-child td {
        border-bottom: none;
      }
      
      .preview-content hr {
        border: none;
        border-top: 2px solid #e5e7eb;
        margin: 2rem 0;
      }
      
      .dark .preview-content hr {
        border-top-color: #374151;
      }
      
      .empty-state, .error-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 240px;
        color: #9ca3af;
        font-style: italic;
      }
      
      /* Mermaid & PlantUML specific styling */
      .mermaid-rendered-svg svg {
        max-width: 100% !important;
        height: auto !important;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
      }
    </style>
  `;

  if (!isVisible) {
    return (
      <div
        className={`
        flex items-center justify-center h-full
        bg-white dark:bg-gray-900
        border-l border-gray-200 dark:border-gray-700
        ${className}
      `}
      >
        <button
          onClick={() => setIsVisible(true)}
          className="
            flex items-center gap-2 px-4 py-2
            bg-blue-500 hover:bg-blue-600
            text-white rounded-lg shadow-sm
            transition-colors duration-200
          "
        >
          <Eye className="w-4 h-4" />
          Show Preview
        </button>
      </div>
    );
  }

  return (
    <div
      ref={previewContainerRef}
      className={`
      flex flex-col h-full
      bg-white dark:bg-gray-900
      border-l border-gray-200 dark:border-gray-700
      ${className}
    `}
    >
      {/* Preview Header */}
      <div
        className="
        flex items-center justify-between px-4 py-3
        border-b border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/90
      "
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Preview - {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Clipboard Copy Button for MS Word & Email */}
          <button
            onClick={handleCopyFormattedContent}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
              shadow-sm transition-all duration-200
              ${
                isCopied
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'
              }
            `}
            title="คัดลอกข้อความพร้อมรูปภาพ Diagram และตาราง (นำไปวางใน MS Word หรือ Email ได้ทันที)"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>คัดลอกเรียบร้อย!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>คัดลอกไป Word/Email</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsVisible(false)}
            className="
              flex items-center gap-2 px-2 py-1
              text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-gray-100
              transition-colors duration-200
            "
            title="ซ่อน Preview"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <div className="p-6 max-w-4xl mx-auto">
          {currentMode === 'mermaid' ? (
            <div ref={mermaidRef} className="mermaid-container" />
          ) : currentMode === 'plantuml' ? (
            <div ref={plantumlRef} className="plantuml-container" />
          ) : (
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{
                __html: previewStyles + renderContent,
              }}
            />
          )}
        </div>
      </div>

      {/* Preview Status Footer */}
      <div
        className="
        px-4 py-2
        bg-gray-50 dark:bg-gray-800
        border-t border-gray-200 dark:border-gray-700
        text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between
      "
      >
        <span>
          {currentDocument ? `เอกสาร: ${currentDocument.title}` : 'ไม่ได้เลือกเอกสาร'}
        </span>
        {diagramList.length > 0 && (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            ตรวจพบ {diagramList.length} Diagrams
          </span>
        )}
      </div>

      {/* Fullscreen Zoom Lightbox Modal */}
      {zoomModalDiagram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {zoomModalDiagram.type === 'mermaid' ? 'Mermaid' : 'PlantUML'}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {zoomModalDiagram.title}
                </h3>
              </div>
              <button
                onClick={() => setZoomModalDiagram(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100 transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Diagram Visual */}
            <div className="flex-1 p-8 overflow-auto flex justify-center items-center bg-slate-50 dark:bg-gray-950/50 min-h-[300px]">
              {zoomModalDiagram.svgContent ? (
                <div
                  className="w-full flex justify-center items-center"
                  dangerouslySetInnerHTML={{ __html: zoomModalDiagram.svgContent }}
                />
              ) : zoomModalDiagram.imgSrc ? (
                <img
                  src={zoomModalDiagram.imgSrc}
                  alt="Full diagram"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                />
              ) : null}
            </div>

            {/* Modal Footer with Code Toggle */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-xs text-gray-500">
              <span>กด Esc หรือคลิกปุ่มกากบาทเพื่อปิด</span>
              <button
                onClick={async () => {
                  if (zoomModalDiagram.code) {
                    await navigator.clipboard.writeText(zoomModalDiagram.code);
                    await messageBox.success('คัดลอกโค้ดเรียบร้อย');
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด Diagram</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OPreviewPanel;