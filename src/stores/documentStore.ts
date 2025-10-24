import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DocumentStore, MarkdownDocument, SearchResult } from '../types';
import { DatabaseService } from '../database';
import { sMarkdownService } from '../services/markdownService';

// Document store following Adasoft naming conventions
export const useDocumentStore = create<DocumentStore>()(devtools(
  (set, get) => ({
    // State
    documents: [],
    currentDocument: null,
    isLoading: false,
    searchQuery: '',
    searchResults: [],

    // Actions
    loadDocuments: async () => {
      set({ isLoading: true });
      try {
        const aDocuments = await DatabaseService.getAllDocuments();
        set({ documents: aDocuments, isLoading: false });
      } catch (error) {
        console.error('Error loading documents:', error);
        set({ isLoading: false });
      }
    },

    createDocument: async (ptTitle: string, ptContent: string = '') => {
      try {
        const oNewDocument = {
          title: ptTitle,
          content: ptContent,
          tags: [],
          mode: 'markdown' as const,
        };

        // Use service that sets timestamps
        const sId = await DatabaseService.saveDocument(oNewDocument);
        const oCreatedDoc = await DatabaseService.getDocument(sId);
        
        if (oCreatedDoc) {
          const { documents } = get();
          set({ 
            documents: [oCreatedDoc, ...documents],
            currentDocument: oCreatedDoc
          });
        }
      } catch (error) {
        console.error('Error creating document:', error);
        throw error;
      }
    },

    updateDocument: async (ptId: string, poUpdates: Partial<MarkdownDocument>) => {
      try {
        await DatabaseService.updateDocument(ptId, poUpdates);
        
        const { documents, currentDocument } = get();
        const aUpdatedDocuments = documents.map(doc => 
          doc.id === ptId 
            ? { ...doc, ...poUpdates, updatedAt: new Date() }
            : doc
        );
        
        const oUpdatedCurrentDoc = currentDocument?.id === ptId
          ? { ...currentDocument, ...poUpdates, updatedAt: new Date() }
          : currentDocument;

        set({ 
          documents: aUpdatedDocuments,
          currentDocument: oUpdatedCurrentDoc
        });
      } catch (error) {
        console.error('Error updating document:', error);
        throw error;
      }
    },

    deleteDocument: async (ptId: string) => {
      try {
        await DatabaseService.deleteDocument(ptId);
        
        const { documents, currentDocument } = get();
        const aFilteredDocuments = documents.filter(doc => doc.id !== ptId);
        const oNewCurrentDoc = currentDocument?.id === ptId ? null : currentDocument;
        
        set({ 
          documents: aFilteredDocuments,
          currentDocument: oNewCurrentDoc
        });
      } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
      }
    },

    setCurrentDocument: (poDocument: MarkdownDocument | null) => {
      set({ currentDocument: poDocument });
    },

    searchDocuments: async (ptQuery: string) => {
      set({ searchQuery: ptQuery });
      
      if (!ptQuery.trim()) {
        set({ searchResults: [] });
        return;
      }

      try {
        const { documents } = get();
        const aResults: SearchResult[] = [];
        const tLowerQuery = ptQuery.toLowerCase();

        documents.forEach(doc => {
          const bTitleMatch = doc.title.toLowerCase().includes(tLowerQuery);
          const bContentMatch = doc.content.toLowerCase().includes(tLowerQuery);
          const bTagsMatch = doc.tags?.some(tag => tag.toLowerCase().includes(tLowerQuery)) || false;

          if (bTitleMatch || bContentMatch || bTagsMatch) {
            const aHighlights = sMarkdownService.FSaMDKSearchInContent(doc.content, ptQuery);
            const nMatchCount = aHighlights.length;

            aResults.push({
              documentId: doc.id,
              title: doc.title,
              content: doc.content.substring(0, 200) + '...',
              matchCount: nMatchCount,
              highlights: aHighlights.slice(0, 3) // Limit to 3 highlights
            });
          }
        });

        // Sort by match count (descending)
        aResults.sort((a, b) => b.matchCount - a.matchCount);
        
        set({ searchResults: aResults });
      } catch (error) {
        console.error('Error searching documents:', error);
        set({ searchResults: [] });
      }
    },

    toggleFavorite: async (psId: string) => {
      try {
        const { documents } = get();
        const oDocument = documents.find(doc => doc.id === psId);
        
        if (oDocument) {
          const bNewFavoriteStatus = !oDocument.isStarred;
          await get().updateDocument(psId, { isStarred: bNewFavoriteStatus });
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }
    }
  }),
  {
    name: 'document-store'
  }
));