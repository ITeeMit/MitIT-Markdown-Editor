import { create } from 'zustand';

export type MessageBoxType = 'info' | 'success' | 'warning' | 'error';

export interface MessageBoxOptions {
  title?: string;
  message: string;
  type?: MessageBoxType;
  confirmText?: string;
  cancelText?: string;
}

interface MessageBoxState {
  isOpen: boolean;
  mode: 'alert' | 'confirm';
  title: string;
  message: string;
  type: MessageBoxType;
  confirmText: string;
  cancelText: string;
  _resolve: ((value: boolean) => void) | null;
  showAlert: (options: MessageBoxOptions) => Promise<void>;
  showConfirm: (options: MessageBoxOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

const defaultTitles: Record<MessageBoxType, string> = {
  info: 'แจ้งให้ทราบ',
  success: 'สำเร็จ',
  warning: 'คำเตือน',
  error: 'เกิดข้อผิดพลาด',
};

export const useMessageBoxStore = create<MessageBoxState>((set, get) => ({
  isOpen: false,
  mode: 'alert',
  title: defaultTitles.info,
  message: '',
  type: 'info',
  confirmText: 'ตกลง',
  cancelText: 'ยกเลิก',
  _resolve: null,

  showAlert: (options) =>
    new Promise((resolve) => {
      const type = options.type ?? 'info';
      set({
        isOpen: true,
        mode: 'alert',
        title: options.title ?? defaultTitles[type],
        message: options.message,
        type,
        confirmText: options.confirmText ?? 'ตกลง',
        cancelText: options.cancelText ?? 'ยกเลิก',
        _resolve: () => {
          resolve();
          return true;
        },
      });
    }),

  showConfirm: (options) =>
    new Promise((resolve) => {
      const type = options.type ?? 'warning';
      set({
        isOpen: true,
        mode: 'confirm',
        title: options.title ?? defaultTitles[type],
        message: options.message,
        type,
        confirmText: options.confirmText ?? 'ยืนยัน',
        cancelText: options.cancelText ?? 'ยกเลิก',
        _resolve: resolve,
      });
    }),

  close: (result) => {
    const { _resolve } = get();
    _resolve?.(result);
    set({ isOpen: false, _resolve: null });
  },
}));
