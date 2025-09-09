import { marked } from 'marked';
import type { DocumentStats } from '../types';

// Markdown service following Adasoft naming conventions
export class sMarkdownService {
  // Initialize marked with custom renderer
  static FSxMDKInitializeRenderer(): void {
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // Custom renderer for better HTML output
    const oRenderer = new marked.Renderer();
    
    // Custom code block rendering
    oRenderer.code = function(token: any) {
      const ptCode = token.text || '';
      const ptLanguage = token.lang || '';
      const tValidLanguage = ptLanguage && /^[a-zA-Z0-9_+-]*$/.test(ptLanguage) ? ptLanguage : '';
      return `<pre><code class="language-${tValidLanguage}">${ptCode}</code></pre>`;
    };
    
    // Custom link rendering (open external links in new tab)
    oRenderer.link = function(token: any) {
      const ptHref = token.href || '';
      const ptTitle = token.title || null;
      const ptText = token.text || '';
      const tTitle = ptTitle ? ` title="${ptTitle}"` : '';
      const tTarget = ptHref.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${ptHref}"${tTitle}${tTarget}>${ptText}</a>`;
    };
    
    marked.use({ renderer: oRenderer });
  }

  // Convert markdown to HTML
  static async FStMDKMarkdownToHTML(ptMarkdown: string): Promise<string> {
    try {
      return await marked(ptMarkdown);
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      return '<p>Error rendering markdown content</p>';
    }
  }

  // Get document statistics
  static FSoMDKGetDocumentStats(ptContent: string): DocumentStats {
    const tCleanContent = ptContent.replace(/```[\s\S]*?```/g, '') // Remove code blocks
                                   .replace(/`[^`]*`/g, '') // Remove inline code
                                   .replace(/!?\[[^\]]*\]\([^)]*\)/g, '') // Remove links and images
                                   .replace(/#{1,6}\s/g, '') // Remove headers
                                   .replace(/[*_~`]/g, '') // Remove formatting
                                   .replace(/\n\s*\n/g, '\n') // Normalize line breaks
                                   .trim();

    const aWords = tCleanContent.split(/\s+/).filter(word => word.length > 0);
    const aParagraphs = tCleanContent.split(/\n\s*\n/).filter(para => para.trim().length > 0);
    const aLines = ptContent.split('\n');
    
    const nWordCount = aWords.length;
    const nCharacterCount = tCleanContent.length;
    const nLineCount = aLines.length;
    const nParagraphCount = aParagraphs.length;
    const nReadingTime = Math.ceil(nWordCount / 200); // Average reading speed: 200 words per minute

    return {
      wordCount: nWordCount,
      characterCount: nCharacterCount,
      lineCount: nLineCount,
      paragraphCount: nParagraphCount,
      readingTime: nReadingTime
    };
  }

  // Extract headings from markdown
  static FSaMDKExtractHeadings(ptContent: string): Array<{ level: number; text: string; id: string }> {
    const aHeadings: Array<{ level: number; text: string; id: string }> = [];
    const aLines = ptContent.split('\n');
    
    aLines.forEach(line => {
      const oMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (oMatch) {
        const nLevel = oMatch[1].length;
        const tText = oMatch[2].trim();
        const tId = tText.toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
        
        aHeadings.push({
          level: nLevel,
          text: tText,
          id: tId
        });
      }
    });
    
    return aHeadings;
  }

  // Search within markdown content
  static FSaMDKSearchInContent(ptContent: string, ptQuery: string): string[] {
    if (!ptQuery.trim()) return [];
    
    const aLines = ptContent.split('\n');
    const aMatches: string[] = [];
    const tLowerQuery = ptQuery.toLowerCase();
    
    aLines.forEach((line, index) => {
      if (line.toLowerCase().includes(tLowerQuery)) {
        // Get context (line before and after if available)
        const nStart = Math.max(0, index - 1);
        const nEnd = Math.min(aLines.length - 1, index + 1);
        const tContext = aLines.slice(nStart, nEnd + 1).join('\n');
        aMatches.push(tContext);
      }
    });
    
    return aMatches;
  }

  // Generate table of contents
  static FStMDKGenerateTableOfContents(ptContent: string): string {
    const aHeadings = this.FSaMDKExtractHeadings(ptContent);
    
    if (aHeadings.length === 0) {
      return '';
    }
    
    let tToc = '## Table of Contents\n\n';
    
    aHeadings.forEach(heading => {
      const tIndent = '  '.repeat(heading.level - 1);
      tToc += `${tIndent}- [${heading.text}](#${heading.id})\n`;
    });
    
    return tToc + '\n';
  }

  // Validate markdown syntax
  static FSbMDKValidateMarkdown(ptContent: string): { isValid: boolean; errors: string[] } {
    const aErrors: string[] = [];
    const aLines = ptContent.split('\n');
    
    // Check for unclosed code blocks
    let nCodeBlockCount = 0;
    aLines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        nCodeBlockCount++;
      }
    });
    
    if (nCodeBlockCount % 2 !== 0) {
      aErrors.push('Unclosed code block detected');
    }
    
    // Check for malformed links
    const tLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let oMatch;
    while ((oMatch = tLinkRegex.exec(ptContent)) !== null) {
      const tUrl = oMatch[2];
      if (!tUrl.trim()) {
        aErrors.push(`Empty link URL found: [${oMatch[1]}]()`);
      }
    }
    
    // Check for malformed images
    const tImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((oMatch = tImageRegex.exec(ptContent)) !== null) {
      const tUrl = oMatch[2];
      if (!tUrl.trim()) {
        aErrors.push(`Empty image URL found: ![${oMatch[1]}]()`);
      }
    }
    
    return {
      isValid: aErrors.length === 0,
      errors: aErrors
    };
  }

  // Format markdown content
  static FStMDKFormatMarkdown(ptContent: string): string {
    let tFormatted = ptContent;
    
    // Normalize line endings
    tFormatted = tFormatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Fix spacing around headers
    tFormatted = tFormatted.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
    
    // Ensure blank lines before headers (except at start)
    tFormatted = tFormatted.replace(/\n(#{1,6}\s)/g, '\n\n$1');
    
    // Fix list formatting
    tFormatted = tFormatted.replace(/^([*+-])([^\s])/gm, '$1 $2');
    tFormatted = tFormatted.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
    
    // Remove excessive blank lines
    tFormatted = tFormatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim trailing whitespace
    tFormatted = tFormatted.split('\n').map(line => line.trimEnd()).join('\n');
    
    return tFormatted.trim();
  }
}

// Initialize the renderer when the service is imported
sMarkdownService.FSxMDKInitializeRenderer();