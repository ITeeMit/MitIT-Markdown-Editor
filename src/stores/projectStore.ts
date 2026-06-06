import { create } from 'zustand';
import { Project, PROJECT_COLORS } from '@/types';
import { DatabaseService } from '@/database';

const SIDEBAR_STATE_KEY = 'project-sidebar-state';

interface SidebarUiState {
  showStarred: boolean;
  showRecent: boolean;
  expandedProjectIds: string[];
}

function loadSidebarState(): SidebarUiState {
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (raw) {
      return JSON.parse(raw) as SidebarUiState;
    }
  } catch {
    /* use defaults */
  }
  return { showStarred: true, showRecent: true, expandedProjectIds: [] };
}

function saveSidebarState(state: SidebarUiState) {
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

interface ProjectStore {
  projects: Project[];
  showStarred: boolean;
  showRecent: boolean;
  expandedProjectIds: string[];
  loadProjects: () => Promise<void>;
  createProject: (name: string, color?: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'color'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleStarredSection: () => void;
  toggleRecentSection: () => void;
  toggleProjectExpanded: (projectId: string) => void;
  isProjectExpanded: (projectId: string) => boolean;
  moveDocumentToProject: (documentId: string, projectId: string | undefined) => Promise<void>;
  toggleDocumentStar: (documentId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => {
  const initial = loadSidebarState();

  return {
    projects: [],
    showStarred: initial.showStarred,
    showRecent: initial.showRecent,
    expandedProjectIds: initial.expandedProjectIds,

    loadProjects: async () => {
      const projects = await DatabaseService.getAllProjects();
      set({ projects });
    },

    createProject: async (name: string, color?: string) => {
      const { projects } = get();
      const id = await DatabaseService.saveProject({
        name: name.trim(),
        color: color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      });
      await get().loadProjects();
      set((state) => {
        const expandedProjectIds = [...state.expandedProjectIds, id];
        saveSidebarState({
          showStarred: state.showStarred,
          showRecent: state.showRecent,
          expandedProjectIds,
        });
        return { expandedProjectIds };
      });
      return id;
    },

    updateProject: async (id, updates) => {
      await DatabaseService.updateProject(id, updates);
      await get().loadProjects();
    },

    deleteProject: async (id) => {
      await DatabaseService.deleteProject(id);
      await get().loadProjects();
      set((state) => {
        const expandedProjectIds = state.expandedProjectIds.filter((pid) => pid !== id);
        saveSidebarState({
          showStarred: state.showStarred,
          showRecent: state.showRecent,
          expandedProjectIds,
        });
        return { expandedProjectIds };
      });
    },

    toggleStarredSection: () => {
      set((state) => {
        const showStarred = !state.showStarred;
        saveSidebarState({
          showStarred,
          showRecent: state.showRecent,
          expandedProjectIds: state.expandedProjectIds,
        });
        return { showStarred };
      });
    },

    toggleRecentSection: () => {
      set((state) => {
        const showRecent = !state.showRecent;
        saveSidebarState({
          showStarred: state.showStarred,
          showRecent,
          expandedProjectIds: state.expandedProjectIds,
        });
        return { showRecent };
      });
    },

    toggleProjectExpanded: (projectId) => {
      set((state) => {
        const expanded = state.expandedProjectIds.includes(projectId)
          ? state.expandedProjectIds.filter((id) => id !== projectId)
          : [...state.expandedProjectIds, projectId];
        saveSidebarState({
          showStarred: state.showStarred,
          showRecent: state.showRecent,
          expandedProjectIds: expanded,
        });
        return { expandedProjectIds: expanded };
      });
    },

    isProjectExpanded: (projectId) => get().expandedProjectIds.includes(projectId),

    moveDocumentToProject: async (documentId, projectId) => {
      await DatabaseService.moveDocumentToProject(documentId, projectId);
    },

    toggleDocumentStar: async (documentId) => {
      await DatabaseService.toggleDocumentStar(documentId);
    },
  };
});
