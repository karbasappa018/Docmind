import { create } from 'zustand';
import type { DocumentMetadataDto } from '../types';
import { documentApi } from '../services/api';
import toast from 'react-hot-toast';

interface DocumentState {
  documents: DocumentMetadataDto[];
  selectedDocumentId: string | null;
  isLoadingDocuments: boolean;
  activeTab: 'chat' | 'search' | 'chunks';
  isSidebarOpen: boolean;

  setSelectedDocumentId: (id: string | null) => void;
  setActiveTab: (tab: 'chat' | 'search' | 'chunks') => void;
  setIsSidebarOpen: (v: boolean) => void;
  fetchDocuments: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  documents: [] as DocumentMetadataDto[],
  selectedDocumentId: null as string | null,
  isLoadingDocuments: false,
  activeTab: 'chat' as const,
  isSidebarOpen: true,
};

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialState,

  setSelectedDocumentId: (id: string | null) => set({ selectedDocumentId: id }),
  setActiveTab: (tab: 'chat' | 'search' | 'chunks') => set({ activeTab: tab }),
  setIsSidebarOpen: (v: boolean) => set({ isSidebarOpen: v }),

  fetchDocuments: async () => {
    set({ isLoadingDocuments: true });
    try {
      const resp = await documentApi.getMine();
      if (resp.success) {
        set({ documents: resp.data });
      }
    } catch (err) {
      console.error('Failed to fetch user documents', err);
    } finally {
      set({ isLoadingDocuments: false });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentApi.delete(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
      }));
      toast.success('Document deleted successfully');
    } catch {
      toast.error('Failed to delete document');
    }
  },

  reset: () => {
    set({
      ...initialState,
    });
  },
}));
