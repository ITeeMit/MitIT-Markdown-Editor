import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TMDDocument } from '../types';

// Utility function for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities following Adasoft naming conventions
export class uDateUtils {
  // Format date for display
  static FStDATFormatDate(pdDate: Date, ptFormat: 'short' | 'long' | 'relative' = 'short'): string {
    const dNow = new Date();
    const nDiffMs = dNow.getTime() - pdDate.getTime();
    const nDiffDays = Math.floor(nDiffMs / (1000 * 60 * 60 * 24));
    
    if (ptFormat === 'relative') {
      if (nDiffDays === 0) {
        const nDiffHours = Math.floor(nDiffMs / (1000 * 60 * 60));
        if (nDiffHours === 0) {
          const nDiffMinutes = Math.floor(nDiffMs / (1000 * 60));
          return nDiffMinutes <= 1 ? 'Just now' : `${nDiffMinutes} minutes ago`;
        }
        return nDiffHours === 1 ? '1 hour ago' : `${nDiffHours} hours ago`;
      } else if (nDiffDays === 1) {
        return 'Yesterday';
      } else if (nDiffDays < 7) {
        return `${nDiffDays} days ago`;
      } else if (nDiffDays < 30) {
        const nWeeks = Math.floor(nDiffDays / 7);
        return nWeeks === 1 ? '1 week ago' : `${nWeeks} weeks ago`;
      } else {
        const nMonths = Math.floor(nDiffDays / 30);
        return nMonths === 1 ? '1 month ago' : `${nMonths} months ago`;
      }
    }
    
    const oOptions: Intl.DateTimeFormatOptions = ptFormat === 'long' 
      ? { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }
      : { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        };
    
    return pdDate.toLocaleDateString('en-US', oOptions);
  }
  
  // Check if date is today
  static FSbDATIsToday(pdDate: Date): boolean {
    const dToday = new Date();
    return pdDate.toDateString() === dToday.toDateString();
  }
  
  // Check if date is this week
  static FSbDATIsThisWeek(pdDate: Date): boolean {
    const dNow = new Date();
    const dStartOfWeek = new Date(dNow.setDate(dNow.getDate() - dNow.getDay()));
    dStartOfWeek.setHours(0, 0, 0, 0);
    
    return pdDate >= dStartOfWeek;
  }
}

// File utilities
export class uFileUtils {
  // Generate safe filename
  static FStFILGenerateSafeFilename(ptFilename: string): string {
    return ptFilename
      .replace(/[^a-z0-9\s-_\.]/gi, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .toLowerCase();
  }
  
  // Format file size
  static FStFILFormatFileSize(pnBytes: number): string {
    if (pnBytes === 0) return '0 Bytes';
    
    const aUnits = ['Bytes', 'KB', 'MB', 'GB'];
    const nIndex = Math.floor(Math.log(pnBytes) / Math.log(1024));
    const nSize = pnBytes / Math.pow(1024, nIndex);
    
    return `${nSize.toFixed(1)} ${aUnits[nIndex]}`;
  }
  
  // Download text as file
  static FSxFILDownloadTextAsFile(ptContent: string, ptFilename: string, ptMimeType: string = 'text/plain'): void {
    const oBlob = new Blob([ptContent], { type: ptMimeType });
    const tUrl = URL.createObjectURL(oBlob);
    const oLink = document.createElement('a');
    
    oLink.href = tUrl;
    oLink.download = ptFilename;
    document.body.appendChild(oLink);
    oLink.click();
    document.body.removeChild(oLink);
    URL.revokeObjectURL(tUrl);
  }
}

// Text utilities
export class uTextUtils {
  // Truncate text
  static FStTXTTruncateText(ptText: string, pnMaxLength: number, ptSuffix: string = '...'): string {
    if (ptText.length <= pnMaxLength) return ptText;
    return ptText.substring(0, pnMaxLength - ptSuffix.length) + ptSuffix;
  }
  
  // Highlight search terms
  static FStTXTHighlightSearchTerms(ptText: string, ptSearchTerm: string): string {
    if (!ptSearchTerm.trim()) return ptText;
    
    const tRegex = new RegExp(`(${ptSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return ptText.replace(tRegex, '<mark>$1</mark>');
  }
  
  // Extract preview text
  static FStTXTExtractPreview(ptContent: string, pnMaxLength: number = 150): string {
    // Remove markdown formatting for preview
    let tPreview = ptContent
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
      .replace(/\n+/g, ' ') // Replace line breaks with spaces
      .trim();
    
    return this.FStTXTTruncateText(tPreview, pnMaxLength);
  }
  
  // Count words in text
  static FSnTXTCountWords(ptText: string): number {
    return ptText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  // Generate slug from text
  static FStTXTGenerateSlug(ptText: string): string {
    return ptText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}

// Document utilities
export class uDocumentUtils {
  // Sort documents by various criteria
  static FSaDocSortDocuments(
    paDocuments: TMDDocument[], 
    ptSortBy: 'title' | 'created' | 'modified' | 'size' = 'modified',
    ptOrder: 'asc' | 'desc' = 'desc'
  ): TMDDocument[] {
    const aSorted = [...paDocuments].sort((a, b) => {
      let nComparison = 0;
      
      switch (ptSortBy) {
        case 'title':
          nComparison = a.FTMdcTitle.localeCompare(b.FTMdcTitle);
          break;
        case 'created':
          nComparison = a.FDMdcCreated.getTime() - b.FDMdcCreated.getTime();
          break;
        case 'modified':
          nComparison = a.FDMdcModified.getTime() - b.FDMdcModified.getTime();
          break;
        case 'size':
          nComparison = a.FNMdcSize - b.FNMdcSize;
          break;
      }
      
      return ptOrder === 'desc' ? -nComparison : nComparison;
    });
    
    return aSorted;
  }
  
  // Filter documents
  static FSaDocFilterDocuments(
    paDocuments: TMDDocument[],
    poFilters: {
      search?: string;
      tags?: string[];
      favorites?: boolean;
      dateRange?: { start: Date; end: Date };
    }
  ): TMDDocument[] {
    return paDocuments.filter(doc => {
      // Search filter
      if (poFilters.search) {
        const tSearchLower = poFilters.search.toLowerCase();
        const bMatchesTitle = doc.FTMdcTitle.toLowerCase().includes(tSearchLower);
        const bMatchesContent = doc.FTMdcContent.toLowerCase().includes(tSearchLower);
        const bMatchesTags = doc.FTMdcTags?.some(tag => tag.toLowerCase().includes(tSearchLower)) || false;
        
        if (!bMatchesTitle && !bMatchesContent && !bMatchesTags) {
          return false;
        }
      }
      
      // Tags filter
      if (poFilters.tags && poFilters.tags.length > 0) {
        const aDocTags = doc.FTMdcTags || [];
        const bHasMatchingTag = poFilters.tags.some(tag => aDocTags.includes(tag));
        if (!bHasMatchingTag) return false;
      }
      
      // Favorites filter
      if (poFilters.favorites !== undefined) {
        if (doc.FBMdcFavorite !== poFilters.favorites) return false;
      }
      
      // Date range filter
      if (poFilters.dateRange) {
        const dDocDate = doc.FDMdcModified;
        if (dDocDate < poFilters.dateRange.start || dDocDate > poFilters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Group documents by date
  static FSoDocGroupDocumentsByDate(paDocuments: TMDDocument[]): Record<string, TMDDocument[]> {
    const oGroups: Record<string, TMDDocument[]> = {};
    
    paDocuments.forEach(doc => {
      const tDateKey = uDateUtils.FSbDATIsToday(doc.FDMdcModified) 
        ? 'Today'
        : uDateUtils.FSbDATIsThisWeek(doc.FDMdcModified)
        ? 'This Week'
        : uDateUtils.FStDATFormatDate(doc.FDMdcModified, 'short');
      
      if (!oGroups[tDateKey]) {
        oGroups[tDateKey] = [];
      }
      oGroups[tDateKey].push(doc);
    });
    
    return oGroups;
  }
}

// Keyboard utilities
export class uKeyboardUtils {
  // Check if key combination matches
  static FSbKEYIsKeyCombo(poEvent: KeyboardEvent, ptCombo: string): boolean {
    const aKeys = ptCombo.toLowerCase().split('+');
    const bCtrl = aKeys.includes('ctrl') || aKeys.includes('cmd');
    const bShift = aKeys.includes('shift');
    const bAlt = aKeys.includes('alt');
    const tKey = aKeys.find(key => !['ctrl', 'cmd', 'shift', 'alt'].includes(key));
    
    return (
      (bCtrl ? (poEvent.ctrlKey || poEvent.metaKey) : !poEvent.ctrlKey && !poEvent.metaKey) &&
      (bShift ? poEvent.shiftKey : !poEvent.shiftKey) &&
      (bAlt ? poEvent.altKey : !poEvent.altKey) &&
      (tKey ? poEvent.key.toLowerCase() === tKey : true)
    );
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}