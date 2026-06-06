import plantumlEncoder from 'plantuml-encoder';



export interface DiagramExportOptions {
  format: 'svg';
  filename?: string;
}

export class DiagramExportService {
  /**
   * Export Mermaid diagram as SVG
   */
  static async exportMermaidDiagram(options: DiagramExportOptions): Promise<void> {
    const svgElement = document.querySelector('.mermaid-container svg') as SVGElement;
    
    if (!svgElement) {
      throw new Error('No Mermaid diagram found to export');
    }

    if (options.format === 'svg') {
      await this.exportMermaidAsSVG(svgElement, options.filename || 'mermaid-diagram.svg');
    } else {
      throw new Error(`Unsupported format: ${options.format}. Only SVG is supported for Mermaid diagrams.`);
    }
  }

  /**
   * Export PlantUML diagram as SVG
   */
  static async exportPlantUMLDiagram(content: string, options: DiagramExportOptions): Promise<void> {
    if (!content || !content.trim()) {
      throw new Error('No PlantUML content provided');
    }

    if (options.format === 'svg') {
      await this.exportPlantUMLAsSVG(content, options.filename || 'plantuml-diagram.svg');
    } else {
      throw new Error(`Unsupported format: ${options.format}. Only SVG is supported for PlantUML diagrams.`);
    }
  }

  /**
   * Export Mermaid diagram as SVG
   */
  private static async exportMermaidAsSVG(svgElement: SVGElement, filename: string): Promise<void> {
    try {
      // Clone the SVG element to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Ensure proper SVG attributes
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // Get the SVG content
      const svgContent = new XMLSerializer().serializeToString(clonedSvg);
      
      // Create and download the SVG file
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      this.downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('Failed to export Mermaid as SVG:', error);
      throw new Error('Failed to export Mermaid diagram as SVG');
    }
  }

  /**
   * Export PlantUML diagram as SVG
   */
  private static async exportPlantUMLAsSVG(content: string, filename: string): Promise<void> {
    try {
      // Extract PlantUML code from markdown if needed
      let plantumlCode = content;
      const plantumlMatch = content.match(/@startuml[\s\S]*?@enduml/);
      if (plantumlMatch) {
        plantumlCode = plantumlMatch[0];
      }

      if (!plantumlCode.includes('@startuml')) {
        throw new Error('Invalid PlantUML syntax. Must start with @startuml and end with @enduml');
      }

      // Encode PlantUML content
      const encoded = plantumlEncoder.encode(plantumlCode);
      
      // PlantUML servers to try
      const servers = [
        'https://www.plantuml.com/plantuml',
        'http://plantuml.com:8080/plantuml',
        'https://plantuml-server.kkeisuke.dev'
      ];

      let lastError: Error | null = null;

      // Try each server
      for (const server of servers) {
        try {
          const svgUrl = `${server}/svg/${encoded}`;
          
          const response = await fetch(svgUrl, {
            method: 'GET',
            headers: {
              'Accept': 'image/svg+xml',
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }

          const svgContent = await response.text();
          
          // Validate SVG content
          if (!svgContent.includes('<svg') || svgContent.includes('error')) {
            throw new Error('Invalid SVG content received from server');
          }

          // Create and download the SVG file
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          this.downloadBlob(blob, filename);
          
          return; // Success, exit the function
          
        } catch (error) {
          console.warn(`Failed to fetch from ${server}:`, error);
          lastError = error as Error;
          continue; // Try next server
        }
      }

      // If we get here, all servers failed
      throw new Error(`Failed to export PlantUML diagram from all servers. Last error: ${lastError?.message}`);
      
    } catch (error) {
      console.error('Failed to export PlantUML as SVG:', error);
      throw error;
    }
  }

  /**
   * Download blob as file
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get available export formats for current mode
   */
  static getAvailableFormats(mode: 'mermaid' | 'plantuml'): string[] {
    return ['svg'];
  }

  /**
   * Validate if diagram is ready for export
   */
  static validateDiagramForExport(mode: 'mermaid' | 'plantuml', content?: string): boolean {
    if (mode === 'mermaid') {
      const mermaidContainer = document.querySelector('.mermaid-container svg');
      return !!mermaidContainer;
    } else if (mode === 'plantuml') {
      return !!(content && content.trim());
    }
    return false;
  }
}