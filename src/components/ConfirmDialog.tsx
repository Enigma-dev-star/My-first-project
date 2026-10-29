/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X, Check } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  lang?: 'en' | 'bn';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  onConfirm,
  onCancel,
  lang = 'en',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const defaultConfirmText = isDanger
    ? lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'
    : lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm';
  const defaultCancelText = lang === 'bn' ? 'বাতিল' : 'Cancel';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-[min(100vw-1rem,24rem)] bg-white dark:bg-[#14201C] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100 my-auto animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-[#007F73]/15 text-[#007F73] dark:text-teal-400'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-sm sm:text-base font-bold text-[#17211F] dark:text-white leading-tight"
            >
              {title}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-300 mt-1.5 leading-relaxed break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-3 mt-2 border-t border-[#DCE4E1]/60 dark:border-[#1E302B]/60">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#17211F] dark:text-stone-200 bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E322C] transition flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4 shrink-0 text-[#626E6A] dark:text-stone-400" />
            <span>{cancelText || defaultCancelText}</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-[#007F73] hover:bg-[#00685E] active:bg-[#00544C]'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{confirmText || defaultConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
