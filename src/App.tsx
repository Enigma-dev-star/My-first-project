/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import {
  UserAccount,
  ShopBranch,
  SweetProduct,
  SaleRecord,
  BillRecord,
  ShopTask,
  AppSettings,
} from './types';
import { StorageService } from './services/storage';
import { Vault } from './services/vault';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TRANSLATIONS, formatCurrency, formatNumber } from './locales/i18n';
import { usePWAInstall } from './hooks/usePWAInstall';
import { SplashAnimation } from './components/SplashAnimation';
import { AuthModal } from './components/AuthModal';
import { StockIndexTab } from './components/StockIndexTab';
import { SalesCounterTab } from './components/SalesCounterTab';
import { BillingTab } from './components/BillingTab';
import { SalesAnalyticsDiagram } from './components/SalesAnalyticsDiagram';
import { AndroidWidgetSimulator } from './components/AndroidWidgetSimulator';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { MultiShopModal } from './components/MultiShopModal';
import { TaskManagementTab } from './components/TaskManagementTab';
import { CreateFirstShopModal } from './components/CreateFirstShopModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Store,
  Plus,
  Search,
  Settings,
  LogOut,
  Download,
  Cloud,
  ChevronDown,
  Layers,
  TrendingUp,
  Receipt,
  BarChart3,
  Smartphone,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShoppingBag,
  FileText,
  Clock,
  ArrowUpRight,
  Sun,
  Moon,
  Crown,
  Edit2,
  MapPin,
  X,
  Check,
} from 'lucide-react';

export default function App() {
  // Splash & Auth State
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMultiShopModal, setShowMultiShopModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickShopDropdown, setShowQuickShopDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Native Platform & Data Safety
  const isNative = Capacitor.isNativePlatform();
  const [showBackupReminder, setShowBackupReminder] = useState<boolean>(
    () => !StorageService.isBackupReminderDismissed()
  );

  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [isDark, setIsDark] = useState<boolean>(() => StorageService.getTheme() === 'dark');
  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  // Synchronize theme with documentElement and persist across restarts
  useEffect(() => {
    StorageService.setTheme(isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  // Synchronize native Android status bar with theme (Stage 4)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: isDark ? '#0E1513' : '#FFFFFF' });
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        } catch (err) {
          console.warn('StatusBar update failed', err);
        }
      })();
    }
  }, [isDark]);

  // Hide native splash screen once React boots
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
  }, []);

  // Live Digital Clock (Uses device local time - with and without seconds)
  const [currentTime, setCurrentTime] = useState({ withSec: '', noSec: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime({
        withSec: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        noSec: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Shops & Active Navigation
  const [shops, setShops] = useState<ShopBranch[]>([]);
  const [activeShopId, setActiveShopId] = useState<string>('');

  // Active Tab matching reference layout: 'overview' | 'stock' | 'sales' | 'billing' | 'tasks' | 'widget'
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'sales' | 'billing' | 'tasks' | 'widget'>('overview');

  // Search query (supporting Bengali and English search)
  const [searchQuery, setSearchQuery] = useState('');

  // PWA Install hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Keep references to state for hardware back button handler
  const showSettingsModalRef = useRef(showSettingsModal);
  const showMultiShopModalRef = useRef(showMultiShopModal);
  const showAuthModalRef = useRef(showAuthModal);
  const showQuickShopDropdownRef = useRef(showQuickShopDropdown);
  const showUserDropdownRef = useRef(showUserDropdown);
  const showLogoutConfirmRef = useRef(showLogoutConfirm);
  const currentUserRef = useRef(currentUser);
  const activeTabRef = useRef(activeTab);

  useEffect(() => { showSettingsModalRef.current = showSettingsModal; }, [showSettingsModal]);
  useEffect(() => { showMultiShopModalRef.current = showMultiShopModal; }, [showMultiShopModal]);
  useEffect(() => { showAuthModalRef.current = showAuthModal; }, [showAuthModal]);
  useEffect(() => { showQuickShopDropdownRef.current = showQuickShopDropdown; }, [showQuickShopDropdown]);
  useEffect(() => { showUserDropdownRef.current = showUserDropdown; }, [showUserDropdown]);
  useEffect(() => { showLogoutConfirmRef.current = showLogoutConfirm; }, [showLogoutConfirm]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const activeTabButtonRef = useRef<HTMLButtonElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTabButtonRef.current) {
      activeTabButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  // Hardware Back Button: Modals -> Popovers -> Overview Tab -> Exit App
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    CapApp.addListener('backButton', () => {
      // 1. If logout confirm dialog is open, dismiss it first
      if (showLogoutConfirmRef.current) {
        setShowLogoutConfirm(false);
        return;
      }
      // 2. If logged out / no user, exit app (never show dashboard)
      if (!currentUserRef.current) {
        CapApp.exitApp();
        return;
      }
      if (showSettingsModalRef.current) {
        setShowSettingsModal(false);
        return;
      }
      if (showMultiShopModalRef.current) {
        setShowMultiShopModal(false);
        return;
      }
      if (showQuickShopDropdownRef.current) {
        setShowQuickShopDropdown(false);
        return;
      }
      if (showUserDropdownRef.current) {
        setShowUserDropdown(false);
        return;
      }
      if (showAuthModalRef.current && currentUserRef.current) {
        setShowAuthModal(false);
        return;
      }
      if (activeTabRef.current !== 'overview') {
        setActiveTab('overview');
        return;
      }
      CapApp.exitApp();
    }).then(sub => {
      cleanup = () => sub.remove();
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Data Refresh Trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  // Initialize Data
  useEffect(() => {
    const loadedSettings = StorageService.getSettings();
    setSettings(loadedSettings);

    const activeUser = StorageService.getActiveUser();
    const masterAdmin = StorageService.getMasterAdmin();

    const isColdBoot = !sessionStorage.getItem('msms_session_unlocked');
    const requireLoginOnBoot = loadedSettings.sessionPersistence === 'ask_every_time' && isColdBoot;

    if (!masterAdmin || !activeUser || requireLoginOnBoot) {
      if (requireLoginOnBoot) {
        StorageService.setActiveUser(null);
      }
      setCurrentUser(null);
      setShowAuthModal(true);
    } else {
      setCurrentUser(activeUser);
      sessionStorage.setItem('msms_session_unlocked', 'true');
    }

    // Check yearly timeline transition
    StorageService.checkAndPerformYearlyRollover();

    const loadedShops = StorageService.getShops();
    setShops(loadedShops);
    if (loadedShops.length > 0) {
      const activeId = StorageService.getActiveShopId();
      const validActiveId = loadedShops.some(s => s.id === activeId) ? activeId : loadedShops[0].id;
      setActiveShopId(validActiveId);
      StorageService.setActiveShopId(validActiveId);
    } else {
      setActiveShopId('');
      StorageService.setActiveShopId('');
    }
  }, [refreshKey]);

  // Dynamic Shop Switching enhancements
  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const [isSwitchingShop, setIsSwitchingShop] = useState(false);
  const quickShopDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-hide toast after 2.8s
  useEffect(() => {
    if (!switchToast) return;
    const t = setTimeout(() => setSwitchToast(null), 2800);
    return () => clearTimeout(t);
  }, [switchToast]);

  // Click outside listener for quick shop dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (quickShopDropdownRef.current && !quickShopDropdownRef.current.contains(e.target as Node)) {
        setShowQuickShopDropdown(false);
      }
    };
    if (showQuickShopDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showQuickShopDropdown]);

  // Dynamic Switch Handler with smooth animation and snapshot feedback
  const handleSwitchShop = (shopId: string) => {
    if (shopId === activeShopId) {
      setShowQuickShopDropdown(false);
      return;
    }
    const target = shops.find(s => s.id === shopId);
    setIsSwitchingShop(true);
    setActiveShopId(shopId);
    StorageService.setActiveShopId(shopId);
    setShowQuickShopDropdown(false);
    triggerRefresh();

    if (target) {
      const summary = StorageService.getShopSummary(shopId);
      const shopName = lang === 'bn' ? (target.nameBn || target.name) : target.name;
      const msg = lang === 'bn'
        ? `দোকান ব্রাঞ্চ পরিবর্তিত: ${shopName} (স্টক: ${summary.totalStock} কেজি | বিক্রি: ৳${summary.todaySales})`
        : `Switched to: ${shopName} (Stock: ${summary.totalStock} kg | Sales: ৳${summary.todaySales})`;
      setSwitchToast(msg);
    }

    setTimeout(() => setIsSwitchingShop(false), 300);
  };

  // Keyboard shortcut listener for branch switching (Alt+1, Alt+2, Alt+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= shops.length) {
          e.preventDefault();
          handleSwitchShop(shops[num - 1].id);
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setShowQuickShopDropdown(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shops, activeShopId, lang]);

  // Load Products, Sales, Bills, Tasks for active shop
  const products = useMemo(() => {
    return StorageService.getProducts(activeShopId);
  }, [activeShopId, refreshKey]);

  const sales = useMemo(() => {
    return StorageService.getSalesHistory(activeShopId);
  }, [activeShopId, refreshKey]);

  const bills = useMemo(() => {
    return StorageService.getBillsHistory(activeShopId);
  }, [activeShopId, refreshKey]);

  const tasks = useMemo(() => {
    return StorageService.getTasks(activeShopId);
  }, [activeShopId, refreshKey]);

  // Active Shop details
  const activeShop = useMemo(() => {
    return shops.find(s => s.id === activeShopId) || null;
  }, [shops, activeShopId]);

  // Filtered Products by Search Query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameBn && p.nameBn.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // KPI Calculations
  const totalStockKg = useMemo(() => {
    return products
      .filter(p => p.unit === 'kg')
      .reduce((sum, p) => sum + p.currentStock, 0);
  }, [products]);

  const totalStockPcs = useMemo(() => {
    return products
      .filter(p => p.unit === 'piece')
      .reduce((sum, p) => sum + p.currentStock, 0);
  }, [products]);

  const todaySalesAmount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sales
      .filter(s => s.dateTime.startsWith(todayStr))
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const todayBillsAmount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return bills
      .filter(b => b.dateTime.startsWith(todayStr) && b.type === 'expense')
      .reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const todayNetBalance = todaySalesAmount - todayBillsAmount;

  const monthlySalesAmount = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return sales
      .filter(s => {
        const d = new Date(s.dateTime);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const todayOrdersCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sales.filter(s => s.dateTime.startsWith(todayStr)).length;
  }, [sales]);

  // Language toggle
  const handleToggleLanguage = () => {
    const newLang: 'en' | 'bn' = lang === 'bn' ? 'en' : 'bn';
    const updated: AppSettings = { ...settings, language: newLang };
    StorageService.saveSettings(updated);
    setSettings(updated);
  };

  // Logout
  const handleLogout = () => {
    setShowSettingsModal(false);
    setShowUserDropdown(false);
    setShowQuickShopDropdown(false);
    setShowLogoutConfirm(true);
  };

  const performLogout = () => {
    StorageService.setActiveUser(null);
    sessionStorage.removeItem('msms_session_unlocked');
    setCurrentUser(null);
    setShowLogoutConfirm(false);
    setShowSettingsModal(false);
    setShowMultiShopModal(false);
    setShowQuickShopDropdown(false);
    setShowUserDropdown(false);
    setActiveTab('overview');
    setShowAuthModal(true);
  };

  // Render Splash First
  if (showSplash) {
    return (
      <SplashAnimation
        lang={lang}
        onFinish={() => {
          setShowSplash(false);
        }}
      />
    );
  }

  // When not authenticated: render blocking login screen without any dashboard, shop name, or data behind it
  if (!currentUser) {
    return (
      <div className={`h-dvh w-full flex items-center justify-center p-4 overflow-y-auto ${isDark ? 'dark bg-[#0E1513]' : 'bg-[#F5F7F8]'}`}>
        <AuthModal
          lang={lang}
          onSuccess={user => {
            sessionStorage.setItem('msms_session_unlocked', 'true');
            setCurrentUser(user);
            setShowAuthModal(false);
            triggerRefresh();
          }}
        />
      </div>
    );
  }

  // Eye-friendly classes (No harsh neon, soothing deep tones)
  const themeClasses = isDark
    ? 'dark bg-[#0E1513] text-[#E2E8F0] selection:bg-teal-900 selection:text-teal-100'
    : 'bg-[#F5F7F8] text-[#17211F] selection:bg-teal-100 selection:text-teal-900';

  const cardSurface = isDark
    ? 'bg-[#14201C] border-[#1E302B] text-[#F1F5F9]'
    : 'bg-[#FFFFFF] border-[#DCE4E1] text-[#17211F] shadow-xs';

  const headerSurface = isDark
    ? 'bg-[#0E1513]/95 border-[#1A2A25]'
    : 'bg-[#FFFFFF]/95 border-[#DCE4E1] shadow-xs';

  return (
    <div className={`flex flex-col h-dvh w-full overflow-hidden transition-colors duration-300 ${themeClasses}`}>
      {/* Decryption Error Banner */}
      {Vault.hasDecryptionError() && (
        <div className="bg-rose-700 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0 z-50">
          <span>⚠️ {lang === 'bn' ? 'ডাটা ডিক্রিপশন ত্রুটি: সংরক্ষিত ডাটা পড়তে সমস্যা হয়েছে।' : 'Data decryption error: Stored vault data could not be decrypted.'}</span>
        </div>
      )}

      {/* FIRST SHOP SETUP MODAL (Non-skippable on first run) */}
      {currentUser && shops.length === 0 && (
        <CreateFirstShopModal
          lang={lang}
          currencySymbol={settings.currencySymbol}
          country={settings.currentCountry}
          onShopCreated={newShop => {
            setShops([newShop]);
            setActiveShopId(newShop.id);
            triggerRefresh();
          }}
        />
      )}

      {/* ADMIN SETTINGS MODAL */}
      {showSettingsModal && (
        <AdminSettingsModal
          currentUser={currentUser}
          settings={settings}
          activeShopId={activeShopId}
          lang={lang}
          onClose={() => setShowSettingsModal(false)}
          onSettingsChange={newSettings => {
            setSettings(newSettings);
            triggerRefresh();
          }}
          onRefresh={triggerRefresh}
          onLogout={handleLogout}
        />
      )}

      {/* MULTI-SHOP SWITCHER & ADD MODAL */}
      {showMultiShopModal && (
        <MultiShopModal
          shops={shops}
          activeShopId={activeShopId}
          lang={lang}
          currentUser={currentUser}
          onSelectShop={id => {
            setActiveShopId(id);
            triggerRefresh();
          }}
          onClose={() => setShowMultiShopModal(false)}
          onRefresh={triggerRefresh}
        />
      )}

      {/* TOP BAR: shrink-0, fixed at top, safe-area padded */}
      <header
        className={`shrink-0 z-30 border-b px-2 sm:px-4 py-2 transition-colors ${headerSurface}`}
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          {/* Row 1: Brand/Logo + Shop Switcher + (Desktop Cluster OR Mobile Profile+Logout) */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full">
            {/* Left: Brand Logo + Shop Quick-Switcher */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Logo Badge */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-800 to-teal-600 p-0.5 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src="/icon.svg"
                  alt="MSMS"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#007F73] dark:text-teal-400">
                    MSMS
                  </span>
                  <span className="hidden min-[400px]:inline-block text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#007F73]/10 dark:bg-teal-950/80 text-[#007F73] dark:text-teal-300 truncate max-w-[120px]">
                    {activeShop ? (lang === 'bn' ? activeShop.nameBn || activeShop.name : activeShop.name) : (lang === 'bn' ? 'আপনার দোকান' : 'Your Shop')}
                  </span>
                </div>

                {/* Dynamic Shop Selector & Quick-Switcher Dropdown */}
                <div className="relative" ref={quickShopDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowQuickShopDropdown(!showQuickShopDropdown)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#17211F] dark:text-stone-300 hover:text-[#007F73] dark:hover:text-teal-300 transition group mt-0.5 px-1 py-0.5 rounded-lg hover:bg-[#F0F4F2] dark:hover:bg-[#162420] max-w-[130px] min-[400px]:max-w-[180px] sm:max-w-xs"
                    title="Click for quick branch switch or press Alt+S"
                  >
                    <Store className="w-3.5 h-3.5 text-[#007F73] shrink-0" />
                    <span className="font-bold underline decoration-dotted underline-offset-2 truncate">
                      {activeShop ? (lang === 'bn' ? activeShop.nameBn || activeShop.name : activeShop.name) : (lang === 'bn' ? 'আপনার দোকান' : 'Your Shop')}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-[#626E6A] dark:text-stone-400 group-hover:text-[#007F73] transition-transform duration-200 shrink-0 ${showQuickShopDropdown ? 'rotate-180 text-[#007F73]' : ''}`} />
                  </button>

                  {/* Floating Quick-Switch Popover Menu */}
                  {showQuickShopDropdown && (
                    <div className="absolute left-0 mt-2 w-[min(calc(100vw-2rem),20rem)] sm:w-96 rounded-2xl bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] shadow-2xl z-50 overflow-hidden animate-toast-slide">
                      <div className="p-3 bg-[#F0F4F2] dark:bg-[#101A17] border-b border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-[#007F73]" />
                          <span className="text-xs font-bold text-[#17211F] dark:text-stone-200">
                            {lang === 'bn' ? 'ব্রাঞ্চ দ্রুত পরিবর্তন' : 'Switch Shop Branch'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#626E6A] dark:text-stone-500">
                          Alt + 1..{Math.min(9, Math.max(1, shops.length))}
                        </span>
                      </div>

                      <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                        {shops.length === 0 ? (
                          <div className="p-4 text-center text-xs text-[#626E6A] dark:text-stone-400 space-y-2">
                            <p>{lang === 'bn' ? 'কোনো দোকান ব্রাঞ্চ নেই' : 'No shop branches created yet'}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickShopDropdown(false);
                                setShowMultiShopModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#007F73] text-white rounded-xl font-bold text-xs"
                            >
                              {lang === 'bn' ? '+ দোকান যোগ করুন' : '+ Add Shop'}
                            </button>
                          </div>
                        ) : (
                          shops.map((shop, idx) => {
                          const isActive = shop.id === activeShopId;
                          const summary = StorageService.getShopSummary(shop.id);
                          const displayName = lang === 'bn' ? (shop.nameBn || shop.name) : shop.name;

                          return (
                            <div
                              key={shop.id}
                              onClick={() => handleSwitchShop(shop.id)}
                              className={`p-2.5 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                                isActive
                                  ? 'bg-[#F0F4F2] dark:bg-teal-950/60 border border-[#007F73]/40 text-[#007F73] dark:text-teal-100'
                                  : 'hover:bg-[#F0F4F2] dark:hover:bg-[#1A2823] text-[#17211F] dark:text-stone-200 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-[#007F73] animate-pulse' : 'bg-stone-300 dark:bg-stone-600'}`} />
                                  <p className="font-bold text-xs truncate">{displayName}</p>
                                  {isActive && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007F73]/15 dark:bg-teal-900 text-[#007F73] dark:text-teal-200 px-1.5 py-0.2 rounded-full">
                                      Active
                                    </span>
                                  )}
                                </div>
                                {shop.address && (
                                  <p className="text-[10px] text-[#626E6A] dark:text-stone-400 truncate mt-0.5 pl-4">
                                    {shop.address}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-[10px] text-[#626E6A] dark:text-stone-400 mt-1 pl-4 font-mono">
                                  <span className="text-[#007F73] dark:text-teal-400 font-semibold">{summary.totalStock} kg stock</span>
                                  <span>·</span>
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold">৳ {summary.todaySales} today</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#F0F4F2] dark:bg-stone-800 border border-[#DCE4E1] dark:border-stone-700 text-[10px] font-mono text-[#626E6A] dark:text-stone-400">
                                  Alt+{idx + 1}
                                </kbd>
                                {isActive && (
                                  <Check className="w-4 h-4 text-[#007F73] dark:text-teal-400" />
                                )}
                              </div>
                            </div>
                          );
                        }))}
                      </div>

                      <div className="p-2 bg-[#F0F4F2] dark:bg-[#101A17] border-t border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickShopDropdown(false);
                            setShowMultiShopModal(true);
                          }}
                          className="flex-1 py-1.5 px-3 text-xs font-bold text-[#007F73] dark:text-teal-400 hover:bg-[#007F73]/10 dark:hover:bg-teal-950/40 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? '+ নতুন ব্রাঞ্চ' : '+ Add Branch'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickShopDropdown(false);
                            setShowMultiShopModal(true);
                          }}
                          className="py-1.5 px-3 text-xs font-semibold text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-xl transition"
                        >
                          {lang === 'bn' ? 'সকল ব্রাঞ্চ' : 'Manage All'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Cluster - Desktop (>= 640px) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {/* Real-time Clock Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-mono font-semibold text-[#17211F] dark:text-teal-300">
                <span className="w-2 h-2 rounded-full bg-[#007F73] animate-pulse" />
                <span>{currentTime.withSec}</span>
              </div>

              {/* Language Switcher Pill */}
              <div className="flex items-center p-0.5 rounded-xl bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold">
                <button
                  onClick={handleToggleLanguage}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg transition ${
                    lang === 'bn'
                      ? 'bg-[#007F73] text-white shadow-xs'
                      : 'text-[#626E6A] dark:text-stone-400 hover:text-[#17211F]'
                  }`}
                >
                  বাংলা
                </button>
                <button
                  onClick={handleToggleLanguage}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg transition ${
                    lang === 'en'
                      ? 'bg-[#007F73] text-white shadow-xs'
                      : 'text-[#626E6A] dark:text-stone-400 hover:text-[#17211F]'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Drive Sync Button */}
              <button
                onClick={() => StorageService.downloadGoogleDriveBackupFile()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-semibold text-[#17211F] dark:text-stone-300 transition min-h-[36px]"
                title="Download structured backup for Google Drive"
              >
                <Cloud className="w-3.5 h-3.5 text-[#007F73]" />
                <span>Drive Sync</span>
              </button>

              {/* APK Button (Hidden when running as native Android app) */}
              {!isNative && (
                <button
                  onClick={() => {
                    if (isInstallable) {
                      install();
                    } else {
                      setActiveTab('widget');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007F73] hover:bg-[#00685E] text-white text-xs font-bold transition shadow-xs min-h-[36px]"
                  title="Install or Export APK"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>APK</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#626E6A] dark:text-stone-400 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] transition"
                title="Toggle Light / Dark Eye Comfort Mode"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#17211F]" />}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold text-[#17211F] dark:text-stone-200 hover:border-[#007F73] transition min-h-[36px]"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span className="max-w-[70px] truncate">{currentUser?.name || 'Admin'}</span>
                  <ChevronDown className="w-3 h-3 text-[#626E6A] dark:text-stone-400" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#162420] rounded-2xl shadow-xl border border-[#DCE4E1] dark:border-[#1E322C] p-1.5 z-50 text-xs">
                    <button
                      onClick={() => {
                        setShowMultiShopModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-white/5 flex items-center gap-2 font-semibold text-[#17211F] dark:text-stone-300 min-h-[40px]"
                    >
                      <Store className="w-4 h-4 text-[#007F73]" />
                      <span>{lang === 'bn' ? 'দোকান পরিবর্তন / যোগ' : 'Switch / Add Shop'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-white/5 flex items-center gap-2 font-semibold text-[#17211F] dark:text-stone-300 min-h-[40px]"
                    >
                      <Settings className="w-4 h-4 text-[#626E6A]" />
                      <span>{t.settings}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-400 min-h-[40px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'লগ আউট' : 'Log out'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Cluster - Mobile Only (< 640px) */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              {/* Profile Dropdown for Mobile */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1 px-2 rounded-xl bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold text-[#17211F] dark:text-stone-200"
                  aria-label="User account"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="max-w-[45px] truncate text-[11px]">{currentUser?.name || 'User'}</span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#162420] rounded-2xl shadow-xl border border-[#DCE4E1] dark:border-[#1E322C] p-1.5 z-50 text-xs">
                    <button
                      onClick={() => {
                        setShowMultiShopModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-white/5 flex items-center gap-2 font-semibold text-[#17211F] dark:text-stone-300 min-h-[40px]"
                    >
                      <Store className="w-4 h-4 text-[#007F73]" />
                      <span>{lang === 'bn' ? 'দোকান পরিবর্তন / যোগ' : 'Switch / Add Shop'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-white/5 flex items-center gap-2 font-semibold text-[#17211F] dark:text-stone-300 min-h-[40px]"
                    >
                      <Settings className="w-4 h-4 text-[#626E6A]" />
                      <span>{t.settings}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-400 min-h-[40px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'লগ আউট' : 'Log out'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Mobile Logout Button (40x40 touch target) */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                title={lang === 'bn' ? 'লগ আউট' : 'Log out'}
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Mobile Only (< 640px) Quick-Access Bar (Clock, Language, Sync, Theme, APK) */}
          <div className="flex sm:hidden items-center justify-between gap-1 w-full pt-1 border-t border-[#DCE4E1]/60 dark:border-[#1E302B]/60">
            {/* Clock without seconds on mobile */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-[11px] font-mono font-semibold text-[#17211F] dark:text-teal-300 min-h-[40px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#007F73] animate-pulse shrink-0" />
              <span>{currentTime.noSec}</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold min-h-[40px]">
              <button
                onClick={handleToggleLanguage}
                className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg transition ${
                  lang === 'bn'
                    ? 'bg-[#007F73] text-white shadow-xs'
                    : 'text-[#626E6A] dark:text-stone-400'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={handleToggleLanguage}
                className={`min-w-[32px] min-h-[36px] px-2 py-1 rounded-lg transition ${
                  lang === 'en'
                    ? 'bg-[#007F73] text-white shadow-xs'
                    : 'text-[#626E6A] dark:text-stone-400'
                }`}
              >
                EN
              </button>
            </div>

            {/* Drive Sync (Icon Only on Mobile, 40x40 target) */}
            <button
              onClick={() => StorageService.downloadGoogleDriveBackupFile()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F0F4F2] dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-[#007F73] dark:text-teal-400 hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] transition shrink-0"
              title="Drive Sync"
              aria-label="Drive Sync"
            >
              <Cloud className="w-4 h-4" />
            </button>

            {/* Theme Toggle (40x40 target) */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#626E6A] dark:text-stone-400 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] transition shrink-0"
              title="Toggle Light / Dark Eye Comfort Mode"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#17211F]" />}
            </button>

            {/* APK Button (Web only, 40x40 target) */}
            {!isNative && (
              <button
                onClick={() => {
                  if (isInstallable) {
                    install();
                  } else {
                    setActiveTab('widget');
                  }
                }}
                className="min-w-[40px] h-10 px-2 flex items-center justify-center rounded-xl bg-[#007F73] hover:bg-[#00685E] text-white text-xs font-bold transition shadow-xs shrink-0"
                title="Install or Export APK"
                aria-label="Install APK"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SUBCLASS NAVIGATION PILL BAR: shrink-0, smooth scroll snap, keeps active tab in view */}
      <div className="shrink-0 z-20 w-full max-w-7xl mx-auto px-2 sm:px-4 pt-2 sm:pt-3">
        <div
          ref={tabContainerRef}
          className="flex items-center gap-1.5 p-1 bg-[#F0F4F2] dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-2xl overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory shadow-2xs"
        >
          {[
            { id: 'overview', label: lang === 'bn' ? 'সারসংক্ষেপ ও বিশ্লেষণ' : 'Overview & Analytics', icon: BarChart3 },
            { id: 'stock', label: lang === 'bn' ? 'আজকের মিষ্টির স্টক' : "Add Today's Sweets Stocks", icon: Layers },
            { id: 'sales', label: lang === 'bn' ? 'আজকের মিষ্টির বিক্রি' : "Add Today's Sweets Sales", icon: ShoppingBag },
            { id: 'billing', label: lang === 'bn' ? 'দৈনিক বিল ও খরচ' : "Add Today's Bills & Expenses", icon: FileText },
            { id: 'tasks', label: lang === 'bn' ? 'টাস্ক ম্যানেজমেন্ট' : 'Task Management', icon: CheckCircle2 },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={active ? activeTabButtonRef : null}
                onClick={() => setActiveTab(tab.id as any)}
                className={`snap-center shrink-0 min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  active
                    ? 'bg-[#007F73] text-white shadow-xs'
                    : 'text-[#626E6A] dark:text-stone-300 hover:text-[#17211F] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA: flex-1 min-h-0 overflow-y-auto overscroll-contain */}
      <main
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] ${isSwitchingShop ? 'animate-shop-switch' : ''}`}
      >
        {/* Data Safety & Backup Reminder Banner (One-time dismissible) */}
        {showBackupReminder && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 dark:bg-[#101A17] border border-[#007F73]/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 text-[#007F73] dark:text-[#00A896] flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-[#17211F] dark:text-stone-100">
                  {lang === 'bn' ? 'ডাটা নিরাপত্তা ও নিয়মিত ব্যাকআপ সতর্কতা' : 'Data Safety & Backup Reminder'}
                </div>
                <div className="text-[11px] text-[#626E6A] dark:text-stone-400 mt-0.5">
                  {lang === 'bn'
                    ? 'মিষ্টির দোকানের স্টক ও বিক্রির হিসাব সম্পূর্ণ অফলাইনে সংরক্ষিত থাকে। ডাটা মোছা থেকে সুরক্ষা পেতে নিয়মিত ব্যাকআপ রাখুন।'
                    : 'Your sweet shop records and stock are stored offline. Regular backups protect your business if app storage is cleared.'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={async () => {
                  await StorageService.downloadGoogleDriveBackupFile();
                  setShowBackupReminder(false);
                  StorageService.dismissBackupReminder();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#007F73] hover:bg-[#00685E] text-white text-xs font-semibold shadow-xs transition"
              >
                {lang === 'bn' ? 'এখনই ব্যাকআপ নিন' : 'Backup Now'}
              </button>
              <button
                onClick={() => {
                  setShowBackupReminder(false);
                  StorageService.dismissBackupReminder();
                }}
                className="p-1.5 rounded-xl text-[#626E6A] dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB (Matching the reference screenshot card and metric grid) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {shops.length === 0 ? (
              <div className={`p-8 sm:p-12 text-center rounded-3xl border transition-all ${cardSurface} space-y-4`}>
                <Store className="w-12 h-12 text-[#007F73]/50 mx-auto" />
                <h3 className="text-lg font-bold text-[#17211F] dark:text-stone-100">
                  {lang === 'bn' ? 'এখনো কোনো দোকান ব্রাঞ্চ যোগ করা হয়নি' : 'No sweet shops registered yet'}
                </h3>
                <p className="text-xs text-[#626E6A] dark:text-stone-400 max-w-sm mx-auto">
                  {lang === 'bn'
                    ? 'আপনার মিষ্টির দোকানের স্টক এবং দৈনিক বিক্রির হিসাব শুরু করতে প্রথম দোকান ব্রাঞ্চ নিবন্ধন করুন।'
                    : 'Register your first sweet shop branch to begin tracking stock, sales, and accounts.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowMultiShopModal(true)}
                  className="px-5 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'দোকান তৈরি করুন' : 'Create Shop'}</span>
                </button>
              </div>
            ) : (
              <>
            {/* HERO CURRENT SHOP CARD */}
            <div className={`p-6 rounded-3xl border transition-all ${cardSurface}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DCE4E1] dark:border-[#1E302B]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007F73]/10 border border-[#007F73]/25 text-[#007F73] dark:text-teal-300 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'মিষ্টির দোকান ব্যবস্থাপনা' : 'Sweet Shop Management'}</span>
                  </div>

                  {/* Main Shop Name */}
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17211F] dark:text-white">
                      {activeShop ? (lang === 'bn' ? activeShop.nameBn || activeShop.name : activeShop.name) : (lang === 'bn' ? 'আপনার দোকান' : 'Your Shop')}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowMultiShopModal(true)}
                      className="p-1.5 rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-white/10 text-[#626E6A] hover:text-amber-500 transition"
                      title={lang === 'bn' ? 'দোকানের নাম পরিবর্তন বা সংশোধন করুন' : 'Edit / Rename Shop'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Separate Address/Location Display */}
                  {activeShop?.address && (
                    <p className="text-xs text-[#626E6A] dark:text-stone-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#007F73] shrink-0" />
                      <span>{activeShop.address}</span>
                    </p>
                  )}

                  {/* User Info Line */}
                  <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 flex items-center gap-2">
                    <span>
                      User: <strong className="text-[#17211F] dark:text-stone-200">{currentUser?.name || (lang === 'bn' ? 'ব্যবহারকারী' : 'User')}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </p>
                </div>

                {/* Top-Right Buttons inside hero card (As in user's image) */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowMultiShopModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E322C] text-xs font-bold text-[#17211F] dark:text-stone-200 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-[#007F73]" />
                    <span>{lang === 'bn' ? '+ দোকান নাম যোগ করুন' : '+ Add Shop Name'}</span>
                  </button>

                  {!isNative && (
                    <button
                      onClick={() => setActiveTab('widget')}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#007F73] hover:bg-[#00685E] text-white text-xs font-bold transition shadow-xs"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Widget & APK</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Fast Multi-Branch Switcher Strip */}
              <div className="pt-3 pb-1 border-b border-[#DCE4E1] dark:border-[#1E302B]/60">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#626E6A] dark:text-stone-400 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#007F73]" />
                    <span>{lang === 'bn' ? 'ব্রাঞ্চসমূহ (১-ক্লিক দ্রুত পরিবর্তন):' : 'Shop Branches (1-Tap Switch):'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#626E6A] dark:text-stone-500 hidden sm:inline">
                    Alt + 1..{shops.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {shops.map((shop, idx) => {
                    const isActive = shop.id === activeShopId;
                    const summary = StorageService.getShopSummary(shop.id);
                    const displayName = lang === 'bn' ? (shop.nameBn || shop.name) : shop.name;

                    return (
                      <button
                        key={shop.id}
                        type="button"
                        onClick={() => handleSwitchShop(shop.id)}
                        title={`Click or press Alt+${idx + 1} to switch to ${displayName}`}
                        className={`group px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 border select-none ${
                          isActive
                            ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs ring-2 ring-[#007F73]/25'
                            : 'bg-[#F0F4F2] dark:bg-[#162420] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E322C] hover:border-[#007F73]/60 hover:bg-[#E4ECE9] dark:hover:bg-[#1C2C27]'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-300 animate-pulse' : 'bg-stone-400'}`} />
                        <span className="truncate max-w-[140px]">{displayName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          isActive ? 'bg-[#006258] text-white' : 'bg-[#DCE4E1] dark:bg-stone-800 text-[#17211F] dark:text-stone-400'
                        }`}>
                          {summary.totalStock} kg
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowMultiShopModal(true)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#007F73] dark:text-teal-400 hover:bg-[#007F73]/10 dark:hover:bg-teal-950/40 border border-dashed border-[#007F73]/40 flex items-center gap-1 shrink-0 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'নতুন ব্রাঞ্চ' : 'Add Branch'}</span>
                  </button>
                </div>
              </div>

              {/* 4 STAT METRIC CARDS (Exact match to reference image) */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                {/* 1. Today's Sales */}
                <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1B2C27] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#626E6A] dark:text-stone-400 font-medium">
                    <span>{lang === 'bn' ? 'আজকের বিক্রি' : "Today's Sales"}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#007F73]/15 dark:bg-teal-500/10 text-[#007F73] dark:text-teal-400 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-extrabold font-mono text-[#007F73] dark:text-teal-400">
                      {formatCurrency(todaySalesAmount, settings.currencySymbol, lang, settings.numeralSystem)}
                    </div>
                    <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium mt-0.5">
                      {formatNumber(todayOrdersCount, lang, settings.numeralSystem)} {lang === 'bn' ? 'অর্ডার আজ' : 'orders today'}
                    </div>
                  </div>
                </div>

                {/* 2. Today's Bills */}
                <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1B2C27] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#626E6A] dark:text-stone-400 font-medium">
                    <span>{lang === 'bn' ? 'আজকের বিল ও খরচ' : "Today's Bills"}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#007F73]/15 dark:bg-teal-500/10 text-[#007F73] dark:text-teal-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-extrabold font-mono text-[#007F73] dark:text-teal-400">
                      {formatCurrency(todayBillsAmount, settings.currencySymbol, lang, settings.numeralSystem)}
                    </div>
                    <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium mt-0.5">
                      {formatNumber(bills.length, lang, settings.numeralSystem)} {lang === 'bn' ? 'ভাউচার আজ' : 'vouchers today'}
                    </div>
                  </div>
                </div>

                {/* 3. Net Daily Balance */}
                <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1B2C27] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#626E6A] dark:text-stone-400 font-medium">
                    <span>{lang === 'bn' ? 'দৈনিক ব্যালেন্স' : 'Net Daily Balance'}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#007F73]/15 dark:bg-teal-500/10 text-[#007F73] dark:text-teal-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-extrabold font-mono text-[#007F73] dark:text-teal-400">
                      {formatCurrency(todayNetBalance, settings.currencySymbol, lang, settings.numeralSystem)}
                    </div>
                    <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium mt-0.5">
                      {todayNetBalance >= 0 ? (lang === 'bn' ? 'পজিটিভ ব্যালেন্স' : 'Positive Balance') : (lang === 'bn' ? 'ঘাটতি' : 'Negative Balance')}
                    </div>
                  </div>
                </div>

                {/* 4. Total Sweets Stock */}
                <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1B2C27] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#626E6A] dark:text-stone-400 font-medium">
                    <span>{lang === 'bn' ? 'মোট মিষ্টির স্টক' : 'Total Sweets Stock'}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#007F73]/15 dark:bg-teal-500/10 text-[#007F73] dark:text-teal-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-extrabold font-mono text-[#17211F] dark:text-white">
                      {formatNumber(Math.round(totalStockKg + totalStockPcs), lang, settings.numeralSystem)}{' '}
                      <span className="text-xs font-normal text-[#626E6A] dark:text-stone-400">kg/pcs</span>
                    </div>
                    <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium mt-0.5">
                      {formatNumber(products.length, lang, settings.numeralSystem)} {lang === 'bn' ? 'পদ মিষ্টি' : 'items'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 QUICK-ACTION CARDS AT BOTTOM OF OVERVIEW (Directly from reference) */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Card 1: Add Today's Sweets Stocks */}
              <div
                onClick={() => setActiveTab('stock')}
                className={`p-5 rounded-3xl border transition cursor-pointer hover:border-[#007F73] dark:hover:border-teal-500 flex items-center justify-between group ${cardSurface}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                    🍯
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#17211F] dark:text-white group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition">
                      {lang === 'bn' ? "আজকের মিষ্টির স্টক যোগ" : "Add Today's Sweets Stocks"}
                    </h4>
                    <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-0.5">
                      {lang === 'bn' ? 'মোবাইল সময় সিঙ্কসহ মিষ্টির পরিমাণ যোগ' : 'Quick add sweet stock with clock sync'}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-[#626E6A] dark:text-stone-400 group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition shrink-0" />
              </div>

              {/* Card 2: Add Today's Sweets Sales */}
              <div
                onClick={() => setActiveTab('sales')}
                className={`p-5 rounded-3xl border transition cursor-pointer hover:border-[#007F73] dark:hover:border-teal-500 flex items-center justify-between group ${cardSurface}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-[#007F73] dark:text-teal-400 flex items-center justify-center text-xl shrink-0">
                    🛍️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#17211F] dark:text-white group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition">
                      {lang === 'bn' ? "আজকের মিষ্টির বিক্রি" : "Add Today's Sweets Sales"}
                    </h4>
                    <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-0.5">
                      {lang === 'bn' ? 'স্বয়ংক্রিয় স্টক কর্তনসহ বিক্রি লিপিবদ্ধ' : 'Record sales with auto stock deduction'}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-[#626E6A] dark:text-stone-400 group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition shrink-0" />
              </div>

              {/* Card 3: Add Today's Bills & Expenses */}
              <div
                onClick={() => setActiveTab('billing')}
                className={`p-5 rounded-3xl border transition cursor-pointer hover:border-[#007F73] dark:hover:border-teal-500 flex items-center justify-between group ${cardSurface}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-stone-500/15 text-[#626E6A] dark:text-stone-300 flex items-center justify-center text-xl shrink-0">
                    📑
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#17211F] dark:text-white group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition">
                      {lang === 'bn' ? "আজকের বিল ও খরচ" : "Add Today's Bills & Expenses"}
                    </h4>
                    <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-0.5">
                      {lang === 'bn' ? 'দুধ, চিনি, মজুরি ও দৈনিক বিল হিসাব' : 'Log dairy, sugar, and daily bills'}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-[#626E6A] dark:text-stone-400 group-hover:text-[#007F73] dark:group-hover:text-teal-400 transition shrink-0" />
              </div>
            </div>

            {/* SALES ANALYTICS DIAGRAM (Weekly Avg + Top 5 Peaks) */}
            <div className="pt-2">
              <SalesAnalyticsDiagram
                sales={sales}
                currencySymbol={settings.currencySymbol}
                lang={lang}
              />
            </div>
              </>
            )}
          </div>
        )}

        {/* STOCK INDEX TAB */}
        {activeTab === 'stock' && (
          <StockIndexTab
            products={filteredProducts}
            activeShopId={activeShopId}
            currencySymbol={settings.currencySymbol}
            lang={lang}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
          />
        )}

        {/* SALES COUNTER TAB */}
        {activeTab === 'sales' && (
          <SalesCounterTab
            products={filteredProducts}
            activeShopId={activeShopId}
            currencySymbol={settings.currencySymbol}
            lang={lang}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
          />
        )}

        {/* BILLING & EXPENSES TAB */}
        {activeTab === 'billing' && (
          <BillingTab
            bills={bills}
            activeShopId={activeShopId}
            currencySymbol={settings.currencySymbol}
            lang={lang}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
          />
        )}

        {/* TASK MANAGEMENT TAB */}
        {activeTab === 'tasks' && (
          <ErrorBoundary
            lang={lang}
            activeShopId={activeShopId}
            fallbackTitle="Task system encountered an issue"
            fallbackTitleBn="টাস্ক সিস্টেমে একটি সমস্যা দেখা দিয়েছে"
            onReset={triggerRefresh}
          >
            <TaskManagementTab
              tasks={tasks}
              activeShopId={activeShopId}
              lang={lang}
              currentUser={currentUser}
              onRefresh={triggerRefresh}
            />
          </ErrorBoundary>
        )}

        {/* ANDROID WIDGET & APK TAB */}
        {activeTab === 'widget' && (
          <AndroidWidgetSimulator
            lang={lang}
            shopName={activeShop ? (lang === 'bn' ? activeShop.nameBn || activeShop.name : activeShop.name) : ''}
            currencySymbol={settings.currencySymbol}
            totalStockKg={totalStockKg}
            totalStockPcs={totalStockPcs}
            todaySalesAmount={todaySalesAmount}
            monthlySalesAmount={monthlySalesAmount}
            todaySalesCount={sales.length}
          />
        )}
      </main>

      {/* Floating Dynamic Branch Switch Toast */}
      {switchToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-slide bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 text-xs font-semibold backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 font-bold">
            <Store className="w-4 h-4 text-teal-400" />
          </div>
          <div className="pr-2">
            <p className="text-white font-bold">{switchToast}</p>
            <p className="text-[10px] text-teal-300/80">
              {lang === 'bn' ? 'ড্যাশবোর্ড তথ্য সাথে সাথে আপডেট হয়েছে' : 'Dashboard metrics synchronized in real-time'}
            </p>
          </div>
          <button
            onClick={() => setSwitchToast(null)}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title={lang === 'bn' ? 'লগ আউট' : 'Log out'}
        message={
          currentUser
            ? lang === 'bn'
              ? `${currentUser.name} একাউন্ট থেকে লগ আউট করতে চান? পুনরায় প্রবেশ করতে পাসওয়ার্ডের প্রয়োজন হবে।`
              : `Log out of ${currentUser.name}? You will need your password to sign in again.`
            : lang === 'bn'
            ? 'আপনি কি লগ আউট করতে চান?'
            : 'Are you sure you want to log out?'
        }
        isDanger={true}
        confirmText={lang === 'bn' ? 'লগ আউট' : 'Log out'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        onConfirm={performLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        lang={lang}
      />
    </div>
  );
}
