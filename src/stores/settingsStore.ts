import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SettingsStore, AppSettings } from '../types';
import { mMarkdownDB } from '../database/db';

// Default settings
const oDefaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  showLineNumbers: true,
  wordWrap: true,
  spellCheck: true,
  defaultExportFormat: 'pdf',
  previewMode: 'split',
  editorFontSize: 14,
  previewWidth: 50
};

// Settings store following Adasoft naming conventions
export const useSettingsStore = create<SettingsStore>()(devtools(
  persist(
    (set, get) => ({
      // State
      settings: oDefaultSettings,

      // Actions
      loadSettings: async () => {
        try {
          const oLoadedSettings: Partial<AppSettings> = {};
          
          // Load each setting from IndexedDB
          for (const tKey of Object.keys(oDefaultSettings) as Array<keyof AppSettings>) {
            const tValue = await mMarkdownDB.FStMDSGetSetting(tKey);
            if (tValue !== undefined) {
              // Parse the value based on the setting type
              switch (typeof oDefaultSettings[tKey]) {
                case 'boolean':
                  (oLoadedSettings as any)[tKey] = tValue === 'true';
                  break;
                case 'number':
                  (oLoadedSettings as any)[tKey] = parseInt(tValue, 10);
                  break;
                default:
                  (oLoadedSettings as any)[tKey] = tValue;
              }
            }
          }
          
          set({ 
            settings: { 
              ...oDefaultSettings, 
              ...oLoadedSettings 
            } 
          });
        } catch (error) {
          console.error('Error loading settings:', error);
          // Use default settings if loading fails
          set({ settings: oDefaultSettings });
        }
      },

      updateSetting: async <K extends keyof AppSettings>(ptKey: K, pValue: AppSettings[K]) => {
        try {
          // Save to IndexedDB
          await mMarkdownDB.FSxMDSSetSetting(ptKey, String(pValue));
          
          // Update local state
          const { settings } = get();
          set({ 
            settings: { 
              ...settings, 
              [ptKey]: pValue 
            } 
          });
        } catch (error) {
          console.error('Error updating setting:', error);
          throw error;
        }
      },

      updateSettings: (settings: Partial<AppSettings>) => {
        const { settings: currentSettings } = get();
        set({ 
          settings: { 
            ...currentSettings, 
            ...settings 
          } 
        });
      },

      resetSettings: async () => {
        try {
          // Reset all settings in IndexedDB
          for (const tKey of Object.keys(oDefaultSettings) as Array<keyof AppSettings>) {
            await mMarkdownDB.FSxMDSSetSetting(tKey, String(oDefaultSettings[tKey]));
          }
          
          // Reset local state
          set({ settings: { ...oDefaultSettings } });
        } catch (error) {
          console.error('Error resetting settings:', error);
          throw error;
        }
      }
    }),
    {
      name: 'settings-store',
      // Only persist basic settings, not the entire store
      partialize: (state) => ({ settings: state.settings })
    }
  ),
  {
    name: 'settings-store'
  }
));