import React, { useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useMessageBoxStore, MessageBoxType } from '@/stores/messageBoxStore';

const typeStyles: Record<
  MessageBoxType,
  { icon: React.ReactNode; accent: string; button: string }
> = {
  info: {
    icon: <Info className="w-6 h-6 text-blue-500" />,
    accent: 'border-blue-500/30',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  success: {
    icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
    accent: 'border-green-500/30',
    button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    accent: 'border-amber-500/30',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  error: {
    icon: <AlertCircle className="w-6 h-6 text-red-500" />,
    accent: 'border-red-500/30',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
};

const MessageBox: React.FC = () => {
  const { isOpen, mode, title, message, type, confirmText, cancelText, close } =
    useMessageBoxStore();

  const handleConfirm = useCallback(() => close(true), [close]);
  const handleCancel = useCallback(() => close(false), [close]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter' && mode === 'alert') handleConfirm();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, mode, handleConfirm, handleCancel]);

  if (!isOpen) return null;

  const styles = typeStyles[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-box-title"
      aria-describedby="message-box-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="ปิด"
        onClick={handleCancel}
      />

      <div
        className={`relative w-full max-w-md rounded-xl border bg-white dark:bg-gray-800 shadow-2xl ${styles.accent}`}
      >
        <div className="flex items-start gap-4 p-5 pb-4">
          <div className="mt-0.5 shrink-0">{styles.icon}</div>
          <div className="min-w-0 flex-1">
            <h2
              id="message-box-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
            <p
              id="message-box-message"
              className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap"
            >
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-5 py-4">
          {mode === 'confirm' && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
