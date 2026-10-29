/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, AppSettings } from '../types';
import {
  StorageService,
  hashPassword,
  verifyPassword,
  decryptBackupPayload,
} from '../services/storage';
import { ConfirmDialog } from './ConfirmDialog';
import { TRANSLATIONS, COUNTRIES } from '../locales/i18n';
import {
  Settings,
  Shield,
  UserPlus,
  Globe,
  Coins,
  Calendar,
  CloudDownload,
  Upload,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileCode,
  X,
  Check,
  LogOut,
  Lock,
} from 'lucide-react';

interface SettingsModalProps {
  currentUser: UserAccount | null;
  settings: AppSettings;
  activeShopId: string;
  lang: 'en' | 'bn';
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminSettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  settings,
  activeShopId,
  lang,
  onClose,
  onSettingsChange,
  onRefresh,
  onLogout,
}) => {
  const t = TRANSLATIONS[lang];
  const isMaster = currentUser?.role === 'master_admin';
  const guestUsers = StorageService.getGuestUsers();

  // Active section tab
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'timeline' | 'backup' | 'danger' | 'android'>('general');

  // Add Guest User state
  const [guestName, setGuestName] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestError, setGuestError] = useState<string | null>(null);

  // Erase Stock State
  const [showEraseStockModal, setShowEraseStockModal] = useState(false);
  const [eraseStockPwdInput, setEraseStockPwdInput] = useState('');
  const [eraseStockError, setEraseStockError] = useState<string | null>(null);

  // Sample Data Confirmation States
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showRemoveDemoConfirm, setShowRemoveDemoConfirm] = useState(false);

  // Backup Export Passphrase State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  // Backup Restore Passphrase State
  const [pendingRestoreContent, setPendingRestoreContent] = useState<string | null>(null);
  const [showRestorePassphraseModal, setShowRestorePassphraseModal] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // 20-Second Android Safety Buffer Reset State
  const [showResetBufferModal, setShowResetBufferModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(20);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isBufferFinished, setIsBufferFinished] = useState(false);

  // Notification message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Countdown timer for 20-second safety reset buffer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showResetBufferModal && countdownSeconds > 0) {
      timer = setTimeout(() => {
        setCountdownSeconds(prev => prev - 1);
      }, 1000);
    } else if (showResetBufferModal && countdownSeconds === 0) {
      setIsBufferFinished(true);
    }
    return () => clearTimeout(timer);
  }, [showResetBufferModal, countdownSeconds]);

  // Language change
  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    const updated = { ...settings, language: newLang };
    StorageService.saveSettings(updated);
    onSettingsChange(updated);
  };

  // Country & Currency change
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return;
    const updated: AppSettings = {
      ...settings,
      currentCountry: country.code,
      currencySymbol: country.symbol,
    };
    StorageService.saveSettings(updated);
    onSettingsChange(updated);
    showToast(lang === 'bn' ? 'মুদ্রা সফলভাবে আপডেট হয়েছে!' : 'Currency updated!');
  };

  // Yearly Timeline Toggle (Default: true, toggleable OFF)
  const handleToggleTimeline = (enabled: boolean) => {
    const updated = { ...settings, yearlyTimelineEnabled: enabled };
    StorageService.saveSettings(updated);
    onSettingsChange(updated);
    showToast(
      lang === 'bn'
        ? enabled
          ? 'বাৎসরিক টাইমলাইন ও আর্কাইভ চালু হয়েছে'
          : 'বাৎসরিক টাইমলাইন বন্ধ করা হয়েছে'
        : enabled
        ? 'Yearly timeline & archive enabled'
        : 'Yearly timeline & archive disabled'
    );
  };

  // Add Guest User (up to 2 accounts)
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;
    if (guestUsers.length >= 2) {
      setGuestError(
        lang === 'bn'
          ? 'সর্বোচ্চ ২টি গেস্ট একাউন্ট অনুমোদিত।'
          : 'Maximum 2 guest accounts allowed.'
      );
      return;
    }

    if (!guestName.trim() || !guestPassword.trim()) {
      setGuestError(
        lang === 'bn' ? 'সকল ঘর পূরণ করুন।' : 'Please fill all fields.'
      );
      return;
    }

    try {
      const pwdHash = await hashPassword(guestPassword.trim());
      const newGuest: UserAccount = {
        id: crypto.randomUUID(),
        name: guestName.trim(),
        role: 'guest_viewer',
        passwordHash: pwdHash,
        createdAt: new Date().toISOString(),
      };
      StorageService.saveUser(newGuest);
      setGuestName('');
      setGuestPassword('');
      setGuestError(null);
      showToast(lang === 'bn' ? 'গেস্ট একাউন্ট সফলভাবে যোগ করা হয়েছে!' : 'Guest account created!');
      onRefresh();
    } catch {
      setGuestError(lang === 'bn' ? 'একাউন্ট তৈরিতে সমস্যা।' : 'Error creating account.');
    }
  };

  // Erase Stock with Secondary Erase Password + Auto Google Drive Backup
  const handleConfirmEraseStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster || !currentUser?.stockErasePasswordHash) return;

    const verifyResult = await verifyPassword(eraseStockPwdInput.trim(), currentUser.stockErasePasswordHash);
    if (!verifyResult.valid) {
      setEraseStockError(
        lang === 'bn'
          ? 'ভুল স্টক মোছার পাসওয়ার্ড! এটি আপনার লগইন পাসওয়ার্ড নয়।'
          : 'Incorrect stock erase password! This is not your login password.'
      );
      return;
    }

    // Auto export backup first as required by instructions
    await StorageService.downloadGoogleDriveBackupFile();

    // Erase stock
    StorageService.eraseStock(activeShopId);
    setShowEraseStockModal(false);
    setEraseStockPwdInput('');
    setEraseStockError(null);
    showToast(
      lang === 'bn'
        ? 'স্টক খালি হয়েছে এবং ব্যাকআপ ফাইল নামানো হয়েছে!'
        : 'Stock erased and backup file saved!'
    );
    onRefresh();
  };

  // Start 20-Second Safety Buffer Reset
  const handleStartResetBuffer = () => {
    setShowResetBufferModal(true);
    setCountdownSeconds(20);
    setIsBufferFinished(false);
    setResetConfirmationText('');
  };

  // Execute Factory Reset after 20-second safety buffer
  const handleExecuteFactoryReset = () => {
    if (!isBufferFinished || resetConfirmationText.trim().toUpperCase() !== 'RESET') {
      return;
    }
    StorageService.clearTestDataAndSales();
    setShowResetBufferModal(false);
    showToast(
      lang === 'bn'
        ? 'বিক্রির তথ্য সম্পূর্ণ মুছে ফেলা হয়েছে!'
        : 'Sales & test data completely cleared!'
    );
    onRefresh();
  };

  // Execute Encrypted Backup Export with Passphrase
  const handleExecuteExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exportPassphrase.length < 8) {
      setExportError(
        lang === 'bn'
          ? 'পাসফ্রেজ অন্তত ৮ অক্ষরের হতে হবে।'
          : 'Passphrase must be at least 8 characters long.'
      );
      return;
    }
    setExportError(null);
    const res = await StorageService.downloadGoogleDriveBackupFile(exportPassphrase);
    if (res.success) {
      setShowExportModal(false);
      setExportPassphrase('');
      showToast(lang === 'bn' ? 'এনক্রিপ্টেড ব্যাকআপ সংরক্ষিত হয়েছে!' : 'Encrypted backup exported!');
      onRefresh();
    } else {
      setExportError(lang === 'bn' ? 'এক্সপোর্ট ব্যর্থ হয়েছে।' : 'Export failed.');
    }
  };

  // Backup file upload / restore (Supports .msmsbak, .json, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ((ev.target?.result as string) || '').trim();
        // Check if encrypted backup
        if (content.startsWith('MSMS-BACKUP:') || (content.includes('"version":1') && content.includes('"ciphertext"'))) {
          setPendingRestoreContent(content);
          setShowRestorePassphraseModal(true);
          setRestorePassphrase('');
          setRestoreError(null);
          return;
        }

        const parsed = JSON.parse(content);
        const success = StorageService.restoreFromBackup(parsed);
        if (success) {
          showToast(
            lang === 'bn'
              ? 'অসংকেতায়িত পুরাতন ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!'
              : 'Legacy unencrypted backup successfully restored!'
          );
          onRefresh();
        } else {
          showToast(lang === 'bn' ? 'ফাইল ফরম্যাট সঠিক নয়।' : 'Invalid backup file.');
        }
      } catch {
        showToast(lang === 'bn' ? 'ফাইল পড়া যায়নি।' : 'Error reading backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Decryption and Restore of Encrypted Backup
  const handleExecuteRestoreEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRestoreContent || !restorePassphrase) return;
    setRestoreError(null);

    try {
      const res = await decryptBackupPayload(pendingRestoreContent, restorePassphrase);
      if (res.success && res.data) {
        const success = StorageService.restoreFromBackup(res.data);
        if (success) {
          setShowRestorePassphraseModal(false);
          setPendingRestoreContent(null);
          setRestorePassphrase('');
          showToast(lang === 'bn' ? 'এনক্রিপ্টেড ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!' : 'Encrypted backup restored successfully!');
          onRefresh();
        } else {
          setRestoreError(lang === 'bn' ? 'ডাটা রিস্টোর করতে ব্যর্থ হয়েছে।' : 'Failed to restore backup data.');
        }
      } else {
        setRestoreError(
          res.error ||
          (lang === 'bn'
            ? 'ভুল পাসফ্রেজ! ব্যাকআপ ডিক্রিপ্ট করা সম্ভব হয়নি।'
            : 'Incorrect passphrase! Could not decrypt backup.')
        );
      }
    } catch {
      setRestoreError(
        lang === 'bn'
          ? 'ভুল পাসফ্রেজ! ব্যাকআপ ডিক্রিপ্ট করা সম্ভব হয়নি।'
          : 'Incorrect passphrase! Could not decrypt backup.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-[min(100vw-1rem,36rem)] bg-white dark:bg-[#14201C] rounded-3xl shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] overflow-hidden my-auto max-h-[85dvh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-[#0E1513] text-white flex items-center justify-between border-b border-[#1E302B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007F73]/20 text-[#00A896] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {t.settingsTitle}
              </h3>
              <p className="text-[11px] text-stone-400">
                {currentUser?.name} ({isMaster ? t.masterAccount : t.guestAccount})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex border-b border-[#DCE4E1] dark:border-[#1E302B] bg-[#F0F4F2] dark:bg-[#101A17] overflow-x-auto px-2">
          {[
            { id: 'general', label: lang === 'bn' ? 'সাধারণ' : 'General', icon: Globe },
            { id: 'users', label: lang === 'bn' ? 'গেস্ট একাউন্ট' : 'Users', icon: Shield },
            { id: 'timeline', label: lang === 'bn' ? 'টাইমলাইন' : 'Timeline', icon: Calendar },
            { id: 'backup', label: lang === 'bn' ? 'গুগল ড্রাইভ' : 'Backup', icon: CloudDownload },
            { id: 'danger', label: lang === 'bn' ? 'রিসেট গার্ড' : 'Reset / Erase', icon: AlertTriangle },
            { id: 'android', label: lang === 'bn' ? 'নেটিভ কোড' : 'Native Android', icon: FileCode },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border-b-2 transition ${
                  active
                    ? 'border-[#007F73] text-[#007F73] dark:text-[#00A896] bg-white dark:bg-[#14201C]'
                    : 'border-transparent text-[#626E6A] dark:text-[#9AA5A1] hover:text-[#17211F] dark:hover:text-stone-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toast alert inside modal */}
        {toastMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Scrollable Tab Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs text-[#17211F] dark:text-stone-200">
          {/* TAB 1: GENERAL (Language, Country, Currency) */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Language Switcher */}
              <div>
                <label className="block text-xs font-bold text-[#17211F] dark:text-stone-100 mb-2">
                  {t.languageSection}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleLanguageChange('bn')}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition ${
                      settings.language === 'bn'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-sm'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    বাংলা (Bengali)
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition ${
                      settings.language === 'en'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-sm'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    English (UK/US)
                  </button>
                </div>
              </div>

              {/* Accounting Numeral System Option (Bengali vs Western Arabic) */}
              <div>
                <label className="block text-xs font-bold text-[#17211F] dark:text-stone-100 mb-2">
                  {t.numeralSection}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const updated: AppSettings = { ...settings, numeralSystem: 'bengali' };
                      StorageService.saveSettings(updated);
                      onSettingsChange(updated);
                      showToast(lang === 'bn' ? 'বাংলা সংখ্যা (১, ২, ৩...) সক্রিয় হয়েছে' : 'Bengali numerals activated');
                    }}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition ${
                      settings.numeralSystem !== 'arabic'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-sm'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.bengaliNumerals}
                  </button>
                  <button
                    onClick={() => {
                      const updated: AppSettings = { ...settings, numeralSystem: 'arabic' };
                      StorageService.saveSettings(updated);
                      onSettingsChange(updated);
                      showToast(lang === 'bn' ? 'ইংরেজি সংখ্যা (0, 1, 2...) সক্রিয় হয়েছে' : 'Western digits activated');
                    }}
                    className={`p-3 rounded-2xl border text-center font-bold text-xs transition ${
                      settings.numeralSystem === 'arabic'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-sm'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.arabicNumerals}
                  </button>
                </div>
              </div>

              {/* Country & Currency Selector */}
              <div>
                <label className="block text-xs font-bold text-[#17211F] dark:text-stone-100 mb-2">
                  {t.countrySection}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COUNTRIES.map(c => {
                    const selected = settings.currentCountry === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => handleCountryChange(c.code)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                          selected
                            ? 'bg-[#007F73]/10 dark:bg-[#007F73]/20 border-[#007F73] text-[#007F73] dark:text-[#00A896] shadow-sm'
                            : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">
                            {lang === 'bn' ? c.countryBn : c.countryEn}
                          </div>
                          <div className="text-[10px] text-[#626E6A] dark:text-stone-400 font-mono">
                            {c.currency}
                          </div>
                        </div>
                        <span className="text-base font-bold font-mono text-[#007F73] dark:text-[#00A896]">
                          {c.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Session Persistence Setting */}
              <div>
                <label className="block text-xs font-bold text-[#17211F] dark:text-stone-100 mb-1">
                  {lang === 'bn' ? 'লগইন সেশন' : 'Login session'}
                </label>
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mb-2">
                  {lang === 'bn'
                    ? 'অ্যাপ বন্ধ করে পুনরায় খোলার সময় সরাসরি লগইন থাকবে নাকি প্রতিবার পাসওয়ার্ড চাইবে তা নির্ধারণ করুন।'
                    : 'Choose whether to stay logged in across app restarts or require password each time you open the app.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppSettings = { ...settings, sessionPersistence: 'keep_logged_in' };
                      StorageService.saveSettings(updated);
                      onSettingsChange(updated);
                      showToast(lang === 'bn' ? 'লগইন ধরে রাখা হবে (ডিফল্ট)' : 'Session: Keep me logged in (default)');
                    }}
                    className={`p-3 rounded-2xl border text-left transition ${
                      (!settings.sessionPersistence || settings.sessionPersistence === 'keep_logged_in')
                        ? 'bg-[#007F73]/10 dark:bg-[#007F73]/20 border-[#007F73] text-[#007F73] dark:text-teal-300 font-bold shadow-sm ring-1 ring-[#007F73]/30'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-300'
                    }`}
                  >
                    <div className="text-xs">
                      {lang === 'bn' ? 'লগইন ধরে রাখুন (ডিফল্ট)' : 'Keep me logged in (default)'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppSettings = { ...settings, sessionPersistence: 'ask_every_time' };
                      StorageService.saveSettings(updated);
                      onSettingsChange(updated);
                      showToast(lang === 'bn' ? 'প্রতিবার অ্যাপ খুললে পাসওয়ার্ড চাওয়া হবে' : 'Session: Ask for login every time');
                    }}
                    className={`p-3 rounded-2xl border text-left transition ${
                      settings.sessionPersistence === 'ask_every_time'
                        ? 'bg-[#007F73]/10 dark:bg-[#007F73]/20 border-[#007F73] text-[#007F73] dark:text-teal-300 font-bold shadow-sm ring-1 ring-[#007F73]/30'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-300'
                    }`}
                  >
                    <div className="text-xs">
                      {lang === 'bn' ? 'প্রতিবার অ্যাপ খোলার সময় পাসওয়ার্ড চাইবে' : 'Ask for login every time I open the app'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER ACCOUNTS (Master + Up to 2 Read-Only Guests) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#17211F] dark:text-stone-100 mb-1">
                  {t.userAccountsSection}
                </h4>
                <p className="text-[11px] text-[#626E6A] dark:text-stone-400 mb-3">
                  {lang === 'bn'
                    ? 'মাস্টার একাউন্ট ছাড়াও সর্বোচ্চ ২টি গেস্ট একাউন্ট যোগ করতে পারেন যারা শুধু ডাটা দেখতে পারবে কিন্তু মুছতে পারবে না।'
                    : 'The Master Admin can invite up to 2 read-only Guest accounts with view-only permissions.'}
                </p>
              </div>

              {/* Existing Users List */}
              <div className="space-y-2">
                <div className="p-3 bg-[#007F73]/10 dark:bg-[#007F73]/20 rounded-2xl border border-[#007F73]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#007F73] dark:text-[#00A896] bg-[#007F73]/15 px-1.5 py-0.5 rounded">
                      ★ {t.masterAccount}
                    </span>
                    <div className="text-xs font-bold text-[#17211F] dark:text-white mt-1">
                      {StorageService.getMasterAdmin()?.name}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#007F73] dark:text-[#00A896] font-semibold">
                    Full Admin Access
                  </span>
                </div>

                {guestUsers.map((g, idx) => (
                  <div
                    key={g.id}
                    className="p-3 bg-[#F0F4F2] dark:bg-[#101A17] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#626E6A] dark:text-stone-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                        👤 {t.guestAccount} #{idx + 1}
                      </span>
                      <div className="text-xs font-bold text-[#17211F] dark:text-stone-100 mt-1">
                        {g.name}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#626E6A] dark:text-stone-400">
                      Read Only
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Guest Form (Master Only) */}
              {isMaster && guestUsers.length < 2 && (
                <form onSubmit={handleAddGuest} className="pt-3 border-t border-[#DCE4E1] dark:border-[#1E302B] space-y-3">
                  <h5 className="font-bold text-[#17211F] dark:text-stone-100">
                    {t.addGuestAccount}
                  </h5>

                  {guestError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{guestError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#626E6A] dark:text-stone-300 mb-1">
                        {t.guestName}
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="e.g. Counter Staff"
                        className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50 focus:border-[#007F73]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#626E6A] dark:text-stone-300 mb-1">
                        {t.guestPassword}
                      </label>
                      <input
                        type="password"
                        required
                        value={guestPassword}
                        onChange={e => setGuestPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50 focus:border-[#007F73]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#007F73] hover:bg-[#006e63] text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t.saveGuest}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: YEARLY TIMELINE & ARCHIVE (Default ON, toggleable OFF) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#17211F] dark:text-stone-100 mb-1">
                  {t.yearlyTimelineSection}
                </h4>
                <p className="text-[11px] text-[#626E6A] dark:text-stone-400 leading-relaxed">
                  {t.yearlyTimelineDesc}
                </p>
              </div>

              {/* Master toggle as explicitly requested by user */}
              <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#17211F] dark:text-stone-100">
                    {t.timelineToggleLabel}
                  </div>
                  <div className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-0.5">
                    {settings.yearlyTimelineEnabled ? t.archiveStatusActive : t.archiveStatusDisabled}
                  </div>
                </div>

                {isMaster ? (
                  <button
                    onClick={() => handleToggleTimeline(!settings.yearlyTimelineEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.yearlyTimelineEnabled ? 'bg-[#007F73] justify-end' : 'bg-[#DCE4E1] dark:bg-[#1E302B] justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-[#626E6A] dark:text-stone-400">
                    {t.readOnlyBadge}
                  </span>
                )}
              </div>

              {/* Current Active Year Badge */}
              <div className="p-3 rounded-2xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30 flex items-center justify-between">
                <span className="text-[#17211F] dark:text-stone-200 font-semibold">{t.currentYearLabel}:</span>
                <span className="font-mono font-extrabold text-[#007F73] dark:text-[#00A896] text-sm">
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE DRIVE BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#17211F] dark:text-stone-100 mb-1">
                  {t.backupSection}
                </h4>
                <p className="text-[11px] text-[#626E6A] dark:text-stone-400 leading-relaxed">
                  {t.backupDesc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] space-y-3">
                <button
                  onClick={() => {
                    setShowExportModal(true);
                    setExportPassphrase('');
                    setExportError(null);
                  }}
                  className="w-full py-2.5 bg-[#007F73] hover:bg-[#006e63] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <CloudDownload className="w-4 h-4" />
                  {t.exportBackupBtn}
                </button>

                {/* Last Backup Date Badge */}
                <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#14201C] rounded-xl border border-[#DCE4E1] dark:border-[#1E302B] text-[11px]">
                  <span className="text-[#626E6A] dark:text-stone-400 font-medium">
                    {lang === 'bn' ? 'সর্বশেষ ব্যাকআপ:' : 'Last Backup:'}
                  </span>
                  <span className="font-mono font-semibold text-[#007F73] dark:text-[#00A896]">
                    {StorageService.getLastBackupDate()
                      ? new Date(StorageService.getLastBackupDate()!).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : (lang === 'bn' ? 'এখনো ব্যাকআপ নেওয়া হয়নি' : 'No backup taken yet')}
                  </span>
                </div>

                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 text-center">
                  {lang === 'bn'
                    ? 'ফাইলটি আপনার ডিভাইসে সেভ বা গুগল ড্রাইভে সংরক্ষণ করতে পারেন।'
                    : 'The backup file is saved locally and can be uploaded directly to your Google Drive.'}
                </p>
              </div>

              {/* Restore section */}
              {isMaster && (
                <div className="pt-2">
                  <label className="block text-[#17211F] dark:text-stone-100 font-bold mb-1">
                    {t.restoreBackupBtn}
                  </label>
                  <label className="w-full py-2.5 px-3 border-2 border-dashed border-[#DCE4E1] dark:border-[#1E302B] rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F0F4F2] dark:hover:bg-[#101A17] text-[#17211F] dark:text-stone-200 font-semibold transition">
                    <Upload className="w-4 h-4 text-[#626E6A] dark:text-stone-400" />
                    <span>{lang === 'bn' ? 'ফাইল বাছাই করুন (.msmsbak / .json)' : 'Select Backup File (.msmsbak / .json)'}</span>
                    <input
                      type="file"
                      accept=".msmsbak,.json,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-1">{t.restoreWarning}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RESET GUARD & SECURITY ERASE (20s Buffer & Stock Erase Key) */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {t.dangerZone}
                </h4>
                <p className="text-[11px] text-[#626E6A] dark:text-stone-400 leading-relaxed">
                  {lang === 'bn'
                    ? 'দোকানের আসল ডাটা শুরু করতে পরীক্ষামূলক বিক্রি ও স্টক পরিষ্কার করার নিরাপদ ব্যবস্থা।'
                    : 'Security mechanisms and buffered reset tools to safely clear test figures for real store data.'}
                </p>
              </div>

              {/* 1-Click Load Bengali Demo Data (for testing) */}
              <div className="p-3.5 rounded-2xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30">
                <div className="font-bold text-[#17211F] dark:text-stone-100 mb-0.5">
                  {lang === 'bn' ? 'নমুনা ডাটা (Sample data)' : 'Sample data'}
                </div>
                <p className="text-[10px] text-[#626E6A] dark:text-stone-300 mb-2.5">
                  {lang === 'bn' 
                    ? 'পরীক্ষামূলক ব্যবহারের জন্য কয়েকটি জনপ্রিয় বাঙালি মিষ্টি ও নমুনা বিক্রি ডাটা লোড করুন।' 
                    : 'Load sample sweet items and sales figures for testing and evaluation.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeShopId) return;
                      setShowDemoConfirm(true);
                    }}
                    className="px-3 py-1.5 bg-[#007F73] hover:bg-[#006e63] text-white rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'নমুনা ডাটা লোড করুন' : 'Load sample data'}
                  </button>

                  {StorageService.hasDemoData() && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveDemoConfirm(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {lang === 'bn' ? 'নমুনা ডাটা মুছে ফেলুন' : 'Remove sample data'}
                    </button>
                  )}
                </div>
              </div>

              {/* Erase Stock Only (Requires dedicated Stock Erase Key) */}
              {isMaster && (
                <div className="p-3.5 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] space-y-2">
                  <div className="font-bold text-[#17211F] dark:text-stone-100">
                    {t.eraseStockTitle}
                  </div>
                  <p className="text-[10px] text-[#626E6A] dark:text-stone-400">
                    {t.eraseStockDesc}
                  </p>
                  <button
                    onClick={() => setShowEraseStockModal(true)}
                    className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl font-bold transition"
                  >
                    {t.eraseStockBtn}
                  </button>
                </div>
              )}

              {/* Clear Test Data & Sales with 20-SECOND ANDROID SAFETY BUFFER */}
              {isMaster && (
                <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                  <div className="font-bold text-rose-900 dark:text-rose-300">
                    {t.factoryResetTitle}
                  </div>
                  <p className="text-[10px] text-rose-700 dark:text-rose-400 leading-relaxed">
                    {t.factoryResetDesc}
                  </p>
                  <button
                    onClick={handleStartResetBuffer}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t.startFactoryReset}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: NATIVE ANDROID PROJECT CODE & APK INSTRUCTIONS */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#17211F] dark:text-stone-100 mb-1">
                  {lang === 'bn' ? 'নেটিভ অ্যান্ড্রয়েড প্রজেক্ট ও এপিকে' : 'Native Android Architecture & APK'}
                </h4>
                <p className="text-[11px] text-[#626E6A] dark:text-stone-400 leading-relaxed">
                  {lang === 'bn'
                    ? 'এই অ্যাপটি একই সাথে অ্যান্ড্রয়েড ফোনে সরাসরি PWA হিসেবে ইনস্টল করা যায় এবং অ্যান্ড্রয়েড স্টুডিওতে বিল্ড করার জন্য সম্পূর্ণ কোটলিন, জেটপ্যাক কম্পোজ ও রুম ডাটাবেজ কোড অন্তর্ভুক্ত রয়েছে।'
                    : 'This app is installable immediately as an Android PWA, and includes complete Kotlin Jetpack Compose & Room Database code to build an APK in Android Studio.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0E1513] text-emerald-400 font-mono text-[11px] space-y-2 leading-relaxed border border-[#1E302B]">
                <div className="text-[#00A896] font-bold">// Android Project File Structure:</div>
                <div>• app/src/main/java/com/muslimsweets/msms/data/local/room/AppDatabase.kt</div>
                <div>• app/src/main/java/com/muslimsweets/msms/ui/screens/DashboardScreen.kt</div>
                <div>• app/src/main/java/com/muslimsweets/msms/widget/MSMSGlanceWidget.kt</div>
                <div>• app/build.gradle.kts (Room, Compose, Material 3, Glance)</div>
              </div>

              <div className="p-3 rounded-2xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30 text-[#17211F] dark:text-stone-200 text-xs">
                <strong className="text-[#007F73] dark:text-[#00A896]">{lang === 'bn' ? 'স্মার্টফোনে চালানোর সহজ উপায়:' : 'Easiest way to try on phone:'}</strong>
                <p className="mt-1 text-[#626E6A] dark:text-stone-300">
                  {lang === 'bn'
                    ? 'ড্যাশবোর্ডের "অ্যান্ড্রয়েড ফোনে ইনস্টল করুন" বোতামে চাপ দিয়ে সরাসরি আপনার ফোনের হোম স্ক্রিনে ফুলস্ক্রিন অ্যাপ হিসেবে যোগ করে ব্যবহার করতে পারেন।'
                    : 'Tap "Install MSMS App on Android" on the dashboard to install directly to your smartphone home screen with offline capability.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Log Out Entry Point */}
        <div className="p-4 border-t border-[#DCE4E1] dark:border-[#1E302B] bg-[#F0F4F2]/50 dark:bg-[#101A17]/50 rounded-b-3xl">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-98 text-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{lang === 'bn' ? 'লগ আউট (Log out)' : 'Log out'}</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: ERASE STOCK WITH SECONDARY PASSKEY */}
      {showEraseStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B]">
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 mb-1">
              {t.enterStockErasePasswordTitle}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 mb-3">
              {lang === 'bn'
                ? 'স্টক খালি করার জন্য নিবন্ধনের সময় দেওয়া দ্বিতীয় পাসওয়ার্ডটি লিখুন। এটি কার্যকর করার আগে স্বয়ংক্রিয়ভাবে ব্যাকআপ ফাইল নামানো হবে।'
                : 'Enter your secondary Stock Erase Password. A Google Drive backup file will be generated automatically before wiping.'}
            </p>

            {eraseStockError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mb-2 font-medium">{eraseStockError}</p>
            )}

            <form onSubmit={handleConfirmEraseStock} className="space-y-4">
              <input
                type="password"
                required
                value={eraseStockPwdInput}
                onChange={e => setEraseStockPwdInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm outline-none text-[#17211F] dark:text-stone-100 focus:border-rose-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEraseStockModal(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {t.eraseStockBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 20-SECOND ANDROID SYSTEM RESET SAFETY BUFFER */}
      {showResetBufferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-rose-300 dark:border-rose-900/40 text-center">
            {/* Animated countdown circle */}
            <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#FEE2E2"
                  strokeWidth="8"
                  fill="none"
                  className="dark:opacity-20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#DC2626"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (countdownSeconds / 20)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-extrabold text-2xl text-rose-600 dark:text-rose-400">
                {countdownSeconds}s
              </div>
            </div>

            <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100 mb-1">
              {t.resetBufferActive}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 mb-4 max-w-xs mx-auto">
              {t.resetWarningMsg}
            </p>

            {/* Type RESET confirmation once buffer finishes */}
            {isBufferFinished ? (
              <div className="space-y-3 pt-2 border-t border-[#DCE4E1] dark:border-[#1E302B]">
                <label className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                  {t.typeResetToConfirm}
                </label>
                <input
                  type="text"
                  value={resetConfirmationText}
                  onChange={e => setResetConfirmationText(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-4 py-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/40 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-rose-900 dark:text-rose-300 outline-none"
                />
                <button
                  disabled={resetConfirmationText.trim().toUpperCase() !== 'RESET'}
                  onClick={handleExecuteFactoryReset}
                  className="w-full py-3 bg-rose-600 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition"
                >
                  {t.confirmResetBtn}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#F0F4F2] dark:bg-[#101A17] rounded-xl text-[11px] text-[#626E6A] dark:text-stone-400 font-mono">
                Buffer in progress... please wait {countdownSeconds} seconds
              </div>
            )}

            <button
              onClick={() => setShowResetBufferModal(false)}
              className="mt-4 text-xs font-semibold text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-200 transition"
            >
              {t.cancelReset}
            </button>
          </div>
        </div>
      )}

      {/* Load Sample Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDemoConfirm}
        title={lang === 'bn' ? 'নমুনা ডাটা লোড' : 'Load Sample Data'}
        message={
          lang === 'bn'
            ? 'আপনি কি নিশ্চিত যে এই দোকানে নমুনা মিষ্টি ও বিক্রির ডাটা লোড করতে চান?'
            : 'Are you sure you want to load sample sweet shop products and demo sales data for this shop?'
        }
        confirmText={lang === 'bn' ? 'লোড করুন' : 'Load Sample Data'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        onConfirm={() => {
          if (!activeShopId) return;
          StorageService.loadAuthenticBengaliDemoData(activeShopId);
          setShowDemoConfirm(false);
          showToast(lang === 'bn' ? 'বাঙালি মিষ্টি ও বিক্রির নমুনা লোড হয়েছে!' : 'Sample data loaded!');
          onRefresh();
        }}
        onCancel={() => setShowDemoConfirm(false)}
        lang={lang}
      />

      {/* Remove Sample Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveDemoConfirm}
        title={lang === 'bn' ? 'নমুনা ডাটা মুছে ফেলুন' : 'Remove Sample Data'}
        message={
          lang === 'bn'
            ? 'আপনি কি নিশ্চিত যে সমস্ত চিহ্নিত নমুনা মিষ্টি, স্টক এবং বিক্রির ডাটা মুছে ফেলতে চান?'
            : 'Are you sure you want to remove all marked sample products, demo stock and sales?'
        }
        isDanger={true}
        confirmText={lang === 'bn' ? 'মুছে ফেলুন' : 'Remove'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        onConfirm={() => {
          StorageService.removeDemoData();
          setShowRemoveDemoConfirm(false);
          showToast(lang === 'bn' ? 'সকল নমুনা ডাটা সফলভাবে মুছে ফেলা হয়েছে!' : 'Sample data removed successfully!');
          onRefresh();
        }}
        onCancel={() => setShowRemoveDemoConfirm(false)}
        lang={lang}
      />

      {/* Export Encrypted Backup Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-[#007F73]/10 dark:bg-teal-950/70 text-[#007F73] dark:text-teal-400 mx-auto flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center">
              {lang === 'bn' ? 'এনক্রিপ্টেড ব্যাকআপ পাসফ্রেজ' : 'Encrypted Backup Passphrase'}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 text-center mt-1 mb-4">
              {lang === 'bn'
                ? 'ব্যাকআপ ফাইলটি নিরাপদ রাখতে অন্তত ৮ অক্ষরের একটি পাসফ্রেজ নির্ধারণ করুন।'
                : 'Enter a passphrase (min 8 characters) to encrypt this backup file.'}
            </p>

            {exportError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {exportError}
              </div>
            )}

            <form onSubmit={handleExecuteExport} className="space-y-3">
              <input
                type="password"
                required
                minLength={8}
                value={exportPassphrase}
                onChange={e => setExportPassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] dark:bg-[#162420] text-[#17211F] dark:text-stone-200 rounded-xl text-xs font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  {lang === 'bn' ? 'ডাউনলোড' : 'Export (.msmsbak)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Encrypted Backup Modal */}
      {showRestorePassphraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center">
              {lang === 'bn' ? 'ব্যাকআপ পাসফ্রেজ দিন' : 'Enter Backup Passphrase'}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 text-center mt-1 mb-4">
              {lang === 'bn'
                ? 'এই ব্যাকআপ ফাইলটি সংকেতায়িত (এনক্রিপ্টেড)। রিস্টোর করতে পাসফ্রেজ দিন।'
                : 'This backup is encrypted. Enter the passphrase used during export to restore.'}
            </p>

            {restoreError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {restoreError}
              </div>
            )}

            <form onSubmit={handleExecuteRestoreEncrypted} className="space-y-3">
              <input
                type="password"
                required
                value={restorePassphrase}
                onChange={e => setRestorePassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestorePassphraseModal(false);
                    setPendingRestoreContent(null);
                  }}
                  className="flex-1 py-2.5 bg-[#F0F4F2] dark:bg-[#162420] text-[#17211F] dark:text-stone-200 rounded-xl text-xs font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  {lang === 'bn' ? 'রিস্টোর করুন' : 'Decrypt & Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
