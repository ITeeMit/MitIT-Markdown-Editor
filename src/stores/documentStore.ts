import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DocumentStore, TMDDocument, SearchResult } from '../types';
import { mMarkdownDB } from '../database/db';
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
        const aDocuments = await mMarkdownDB.FSaMDCGetAllDocuments();
        set({ documents: aDocuments, isLoading: false });
      } catch (error) {
        console.error('Error loading documents:', error);
        set({ isLoading: false });
      }
    },

    createDocument: async (ptTitle: string, ptContent: string = '') => {
      try {
        const dNow = new Date();
        const oNewDocument: Omit<TMDDocument, 'FNMdcId'> = {
          FTMdcTitle: ptTitle,
          FTMdcContent: ptContent,
          FDMdcCreated: dNow,
          FDMdcModified: dNow,
          FTMdcTags: [],
          FNMdcSize: ptContent.length,
          FBMdcFavorite: false
        };

        const nDocId = await mMarkdownDB.FSxMDCCreateDocument(oNewDocument);
        const oCreatedDoc = await mMarkdownDB.FSoMDCGetDocumentById(nDocId);
        
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

    updateDocument: async (pnId: number, poUpdates: Partial<TMDDocument>) => {
      try {
        // Calculate content size if content is being updated
        if (poUpdates.FTMdcContent !== undefined) {
          poUpdates.FNMdcSize = poUpdates.FTMdcContent.length;
        }

        await mMarkdownDB.FSxMDCUpdateDocument(pnId, poUpdates);
        
        const { documents, currentDocument } = get();
        const aUpdatedDocuments = documents.map(doc => 
          doc.FNMdcId === pnId 
            ? { ...doc, ...poUpdates, FDMdcModified: new Date() }
            : doc
        );
        
        const oUpdatedCurrentDoc = currentDocument?.FNMdcId === pnId
          ? { ...currentDocument, ...poUpdates, FDMdcModified: new Date() }
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

    deleteDocument: async (pnId: number) => {
      try {
        await mMarkdownDB.FSxMDCDeleteDocument(pnId);
        
        const { documents, currentDocument } = get();
        const aFilteredDocuments = documents.filter(doc => doc.FNMdcId !== pnId);
        const oNewCurrentDoc = currentDocument?.FNMdcId === pnId ? null : currentDocument;
        
        set({ 
          documents: aFilteredDocuments,
          currentDocument: oNewCurrentDoc
        });
      } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
      }
    },

    setCurrentDocument: (poDocument: TMDDocument | null) => {
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
          const bTitleMatch = doc.FTMdcTitle.toLowerCase().includes(tLowerQuery);
          const bContentMatch = doc.FTMdcContent.toLowerCase().includes(tLowerQuery);
          const bTagsMatch = doc.FTMdcTags?.some(tag => tag.toLowerCase().includes(tLowerQuery)) || false;

          if (bTitleMatch || bContentMatch || bTagsMatch) {
            const aHighlights = sMarkdownService.FSaMDKSearchInContent(doc.FTMdcContent, ptQuery);
            const nMatchCount = aHighlights.length;

            aResults.push({
              documentId: doc.FNMdcId!,
              title: doc.FTMdcTitle,
              content: doc.FTMdcContent.substring(0, 200) + '...',
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

    toggleFavorite: async (pnId: number) => {
      try {
        const { documents } = get();
        const oDocument = documents.find(doc => doc.FNMdcId === pnId);
        
        if (oDocument) {
          const bNewFavoriteStatus = !oDocument.FBMdcFavorite;
          await get().updateDocument(pnId, { FBMdcFavorite: bNewFavoriteStatus });
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