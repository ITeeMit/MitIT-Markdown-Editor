import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UIStore, EditorTheme } from '../types';

// Default themes
const oLightTheme: EditorTheme = {
  name: 'light',
  isDark: false,
  colors: {
    background: '#ffffff',
    foreground: '#1f2937',
    accent: '#3b82f6',
    border: '#e5e7eb'
  }
};

const oDarkTheme: EditorTheme = {
  name: 'dark',
  isDark: true,
  colors: {
    background: '#1f2937',
    foreground: '#f9fafb',
    accent: '#60a5fa',
    border: '#374151'
  }
};

// Available themes
export const aAvailableThemes: EditorTheme[] = [
  oLightTheme,
  oDarkTheme,
  {
    name: 'github',
    isDark: false,
    colors: {
      background: '#ffffff',
      foreground: '#24292f',
      accent: '#0969da',
      border: '#d0d7de'
    }
  },
  {
    name: 'dracula',
    isDark: true,
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      accent: '#bd93f9',
      border: '#44475a'
    }
  },
  {
    name: 'monokai',
    isDark: true,
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      accent: '#a6e22e',
      border: '#49483e'
    }
  }
];

// Get system theme preference
const FSbUIGetSystemThemePreference = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

// Get initial theme based on system preference
const FSoUIGetInitialTheme = (): EditorTheme => {
  const bIsDarkMode = FSbUIGetSystemThemePreference();
  return bIsDarkMode ? oDarkTheme : oLightTheme;
};

// UI store following Adasoft naming conventions
export const useUIStore = create<UIStore>()(devtools(
  (set, get) => ({
    // State
    isPreviewMode: false,
    isSidebarOpen: true,
    isSettingsOpen: false,
    currentTheme: FSoUIGetInitialTheme(),

    // Actions
    togglePreview: () => {
      const { isPreviewMode } = get();
      set({ isPreviewMode: !isPreviewMode });
    },

    toggleSidebar: () => {
      const { isSidebarOpen } = get();
      set({ isSidebarOpen: !isSidebarOpen });
    },

    toggleSettings: () => {
      const { isSettingsOpen } = get();
      set({ isSettingsOpen: !isSettingsOpen });
    },

    setTheme: (poTheme: EditorTheme) => {
      set({ currentTheme: poTheme });
      
      // Apply theme to document root for CSS variables
      if (typeof document !== 'undefined') {
        const oRoot = document.documentElement;
        oRoot.style.setProperty('--color-background', poTheme.colors.background);
        oRoot.style.setProperty('--color-foreground', poTheme.colors.foreground);
        oRoot.style.setProperty('--color-accent', poTheme.colors.accent);
        oRoot.style.setProperty('--color-border', poTheme.colors.border);
        
        // Update data attribute for theme-based styling
        oRoot.setAttribute('data-theme', poTheme.name);
        
        // Update class for dark/light mode
        if (poTheme.isDark) {
          oRoot.classList.add('dark');
        } else {
          oRoot.classList.remove('dark');
        }
      }
    }
  }),
  {
    name: 'ui-store'
  }
));

// Initialize theme on store creation
if (typeof window !== 'undefined') {
  // Listen for system theme changes
  const oMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const FSxUIHandleThemeChange = (poEvent: MediaQueryListEvent) => {
    const { currentTheme } = useUIStore.getState();
    
    // Only auto-switch if using system theme
    if (currentTheme.name === 'light' || currentTheme.name === 'dark') {
      const oNewTheme = poEvent.matches ? oDarkTheme : oLightTheme;
      useUIStore.getState().setTheme(oNewTheme);
    }
  };
  
  oMediaQuery.addEventListener('change', FSxUIHandleThemeChange);
  
  // Apply initial theme
  const oInitialTheme = FSoUIGetInitialTheme();
  useUIStore.getState().setTheme(oInitialTheme);
}

// Utility functions for theme management
export const uiUtils = {
  // Find theme by name
  FSoUIFindThemeByName: (ptName: string): EditorTheme | undefined => {
    return aAvailableThemes.find(theme => theme.name === ptName);
  },
  
  // Get theme names
  FSaUIGetThemeNames: (): string[] => {
    return aAvailableThemes.map(theme => theme.name);
  },
  
  // Check if theme is dark
  FSbUIIsThemeDark: (ptThemeName: string): boolean => {
    const oTheme = aAvailableThemes.find(theme => theme.name === ptThemeName);
    return oTheme?.isDark || false;
  }
};