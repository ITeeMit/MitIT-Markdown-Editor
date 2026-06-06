import {
  useMessageBoxStore,
  MessageBoxOptions,
  MessageBoxType,
} from '@/stores/messageBoxStore';

export type { MessageBoxOptions, MessageBoxType };

export const messageBox = {
  alert(message: string, options?: Omit<MessageBoxOptions, 'message'>) {
    return useMessageBoxStore.getState().showAlert({ message, ...options });
  },

  info(message: string, title?: string) {
    return useMessageBoxStore.getState().showAlert({ message, title, type: 'info' });
  },

  success(message: string, title?: string) {
    return useMessageBoxStore.getState().showAlert({ message, title, type: 'success' });
  },

  warning(message: string, title?: string) {
    return useMessageBoxStore.getState().showAlert({ message, title, type: 'warning' });
  },

  error(message: string, title?: string) {
    return useMessageBoxStore.getState().showAlert({ message, title, type: 'error' });
  },

  confirm(message: string, options?: Omit<MessageBoxOptions, 'message'>) {
    return useMessageBoxStore.getState().showConfirm({ message, ...options });
  },
};
