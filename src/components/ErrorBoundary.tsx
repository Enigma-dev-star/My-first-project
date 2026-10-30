/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { StorageService } from '../services/storage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackTitleBn?: string;
  lang?: 'en' | 'bn';
  onReset?: () => void;
  activeShopId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleResetCategories = () => {
    if (this.props.activeShopId) {
      StorageService.resetTaskCategoriesToDefault(this.props.activeShopId);
    }
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isBn = this.props.lang === 'bn';
      return (
        <div className="p-6 sm:p-8 m-3 sm:m-6 bg-white dark:bg-[#14201C] rounded-3xl border border-rose-200 dark:border-rose-900/40 shadow-lg text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
              {isBn
                ? this.props.fallbackTitleBn || 'একটি সমস্যা দেখা দিয়েছে'
                : this.props.fallbackTitle || 'A recoverable issue occurred'}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1">
              {isBn
                ? 'আপনার দোকানের ডাটা সুরক্ষিত রয়েছে। পুনরায় চেষ্টা করুন অথবা ডিফল্ট সেটিংস লোড করুন।'
                : 'Your sweet shop data is safe. Try reloading or restoring default settings.'}
            </p>
          </div>

          {this.state.error && (
            <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-mono text-[11px] text-left overflow-x-auto max-h-24">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}</span>
            </button>

            {this.props.activeShopId && (
              <button
                onClick={this.handleResetCategories}
                className="px-4 py-2 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold rounded-xl transition"
              >
                <span>{isBn ? 'ডিফল্ট ক্যাটাগরি রিসেট' : 'Reset Categories'}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
