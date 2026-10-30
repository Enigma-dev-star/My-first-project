/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SweetProduct, SweetUnit, UserAccount, StockEntry } from '../types';
import { StorageService } from '../services/storage';
import { TRANSLATIONS, formatCurrency, formatNumber, formatStockDateTime } from '../locales/i18n';
import { Plus, Edit2, Trash2, Clock, AlertTriangle, Layers, X, Check, History, Calendar, CheckCircle2 } from 'lucide-react';

interface StockIndexProps {
  products: SweetProduct[];
  activeShopId: string;
  currencySymbol: string;
  lang: 'en' | 'bn';
  currentUser: UserAccount | null;
  onRefresh: () => void;
}

export const StockIndexTab: React.FC<StockIndexProps> = ({
  products,
  activeShopId,
  currencySymbol,
  lang,
  currentUser,
  onRefresh,
}) => {
  const t = TRANSLATIONS[lang];
  const isReadOnly = currentUser?.role === 'guest_viewer';

  // Recent stock movements state
  const [stockHistory, setStockHistory] = useState<StockEntry[]>([]);

  useEffect(() => {
    if (activeShopId) {
      setStockHistory(StorageService.getStockHistory(activeShopId));
    }
  }, [activeShopId]);

  const refreshLocalHistory = () => {
    if (activeShopId) {
      setStockHistory(StorageService.getStockHistory(activeShopId));
    }
  };

  // New Sweet Modal state
  const [showAddSweetModal, setShowAddSweetModal] = useState(false);
  const [sweetNameEn, setSweetNameEn] = useState('');
  const [sweetNameBn, setSweetNameBn] = useState('');
  const [unit, setUnit] = useState<SweetUnit>('kg');
  const [sellingPrice, setSellingPrice] = useState<number>(350);
  const [costPrice, setCostPrice] = useState<number>(240);
  const [initialQty, setInitialQty] = useState<number>(20);

  // Quick Add Stock state (when sweet item clicked)
  const [selectedProductForStock, setSelectedProductForStock] = useState<SweetProduct | null>(null);
  const [addQtyInputStr, setAddQtyInputStr] = useState<string>('10');
  const [stockValidationError, setStockValidationError] = useState<string>('');
  const [zeroStockNotice, setZeroStockNotice] = useState<string>('');

  // Edit Sweet Modal state
  const [editingProduct, setEditingProduct] = useState<SweetProduct | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameBn, setEditNameBn] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);

  // Long press detection for deleting sweet card
  const [productToDelete, setProductToDelete] = useState<SweetProduct | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressingId, setIsPressingId] = useState<string | null>(null);

  const handleTouchStart = (product: SweetProduct) => {
    if (isReadOnly) return;
    setIsPressingId(product.id);
    pressTimer.current = setTimeout(() => {
      setProductToDelete(product);
      setIsPressingId(null);
    }, 750); // 750ms long press
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressingId(null);
  };

  // 1. Register New Sweet
  const handleRegisterSweet = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !activeShopId) return;

    const newSweet: SweetProduct = {
      id: crypto.randomUUID(),
      shopId: activeShopId,
      name: sweetNameEn.trim(),
      nameBn: sweetNameBn.trim() || sweetNameEn.trim(),
      unit,
      unitPrice: Number(sellingPrice) || 0,
      costPrice: Number(costPrice) || 0,
      currentStock: Number(initialQty) || 0,
      minStockAlert: unit === 'kg' ? 5 : 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveProduct(newSweet);

    // If initial qty > 0, log intake entry
    if (initialQty > 0) {
      StorageService.addStockEntry({
        id: crypto.randomUUID(),
        shopId: activeShopId,
        productId: newSweet.id,
        productName: newSweet.name,
        productNameBn: newSweet.nameBn,
        quantityAdded: Number(initialQty),
        unit: newSweet.unit,
        costPrice: newSweet.costPrice,
        dateTime: new Date().toISOString(),
        notes: 'Initial inventory intake',
      });
    }

    setShowAddSweetModal(false);
    setSweetNameEn('');
    setSweetNameBn('');
    setInitialQty(20);
    refreshLocalHistory();
    onRefresh();
  };

  // Unit-specific quantity validation
  const validateAddQuantity = (valStr: string, pUnit: SweetUnit): { valid: boolean; value: number; error?: string } => {
    const trimmed = valStr.trim();
    if (!trimmed) {
      return {
        valid: false,
        value: 0,
        error: lang === 'bn' ? 'পরিমাণ প্রদান করা আবশ্যক' : 'Quantity is required',
      };
    }

    const num = Number(trimmed);
    if (isNaN(num)) {
      return {
        valid: false,
        value: 0,
        error: lang === 'bn' ? 'সঠিক সংখ্যা প্রদান করুন' : 'Please enter a valid number',
      };
    }

    if (num <= 0) {
      return {
        valid: false,
        value: 0,
        error: lang === 'bn' ? 'পরিমাণ ধনাত্মক হতে হবে' : 'Quantity must be greater than zero',
      };
    }

    if (pUnit === 'kg') {
      if (num < 0.5 || num > 100) {
        return {
          valid: false,
          value: num,
          error: lang === 'bn'
            ? 'কেজির পরিমাণ ০.৫ থেকে ১০০ কেজির মধ্যে হতে হবে'
            : 'Kg quantity must be between 0.5 and 100 kg inclusive',
        };
      }
      return { valid: true, value: num };
    } else {
      // piece or box: must be integer between 1 and 200
      if (!Number.isInteger(num)) {
        return {
          valid: false,
          value: num,
          error: lang === 'bn'
            ? 'পিস বা বক্সের সংখ্যা পূর্ণ সংখ্যা হতে হবে (দশমিক গ্রহণযোগ্য নয়)'
            : 'Piece quantity must be a whole number (no decimals)',
        };
      }
      if (num < 1 || num > 200) {
        return {
          valid: false,
          value: num,
          error: lang === 'bn'
            ? 'পরিমাণ ১ থেকে ২০০ এর মধ্যে হতে হবে'
            : 'Quantity must be between 1 and 200 inclusive',
        };
      }
      return { valid: true, value: num };
    }
  };

  // 2. Quick Add Stock (Positive Addition)
  const handleConfirmAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedProductForStock) return;

    const validation = validateAddQuantity(addQtyInputStr, selectedProductForStock.unit);
    if (!validation.valid) {
      setStockValidationError(validation.error || 'Invalid quantity');
      return;
    }

    // Capture precise ISO 8601 UTC timestamp on save
    const currentTimestamp = new Date().toISOString();

    StorageService.addStockEntry({
      id: crypto.randomUUID(),
      shopId: selectedProductForStock.shopId,
      productId: selectedProductForStock.id,
      productName: selectedProductForStock.name,
      productNameBn: selectedProductForStock.nameBn,
      quantityAdded: validation.value,
      unit: selectedProductForStock.unit,
      costPrice: selectedProductForStock.costPrice,
      dateTime: currentTimestamp,
      notes: 'Counter / Kitchen stock refill',
    });

    setSelectedProductForStock(null);
    setAddQtyInputStr('10');
    setStockValidationError('');
    setZeroStockNotice('');
    refreshLocalHistory();
    onRefresh();
  };

  // 2B. Daily Zero Stock Record (Explicit 0 kg / 0 pcs record without altering current stock)
  const handleRecordZeroStock = () => {
    if (isReadOnly || !selectedProductForStock) return;

    // Check if zero stock already recorded today for this product
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const alreadyRecordedToday = stockHistory.some(
      h => h.productId === selectedProductForStock.id &&
           h.quantityAdded === 0 &&
           h.dateTime &&
           h.dateTime.startsWith(todayPrefix)
    );

    const currentTimestamp = new Date().toISOString();

    StorageService.addStockEntry({
      id: crypto.randomUUID(),
      shopId: selectedProductForStock.shopId,
      productId: selectedProductForStock.id,
      productName: selectedProductForStock.name,
      productNameBn: selectedProductForStock.nameBn,
      quantityAdded: 0,
      unit: selectedProductForStock.unit,
      costPrice: selectedProductForStock.costPrice,
      dateTime: currentTimestamp,
      notes: alreadyRecordedToday
        ? 'Updated daily zero-stock record (no stock produced/available)'
        : 'Daily zero-stock record (no stock produced/available)',
    });

    setSelectedProductForStock(null);
    setAddQtyInputStr('10');
    setStockValidationError('');
    setZeroStockNotice('');
    refreshLocalHistory();
    onRefresh();
  };

  // 3. Edit Sweet Details
  const handleSaveEditSweet = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !editingProduct) return;

    editingProduct.name = editNameEn.trim();
    editingProduct.nameBn = editNameBn.trim() || editNameEn.trim();
    editingProduct.unitPrice = Number(editPrice) || 0;
    editingProduct.costPrice = Number(editCost) || 0;
    editingProduct.updatedAt = new Date().toISOString();

    StorageService.saveProduct(editingProduct);
    setEditingProduct(null);
    onRefresh();
  };

  // 4. Confirm Delete Sweet
  const handleConfirmDelete = () => {
    if (isReadOnly || !productToDelete) return;
    StorageService.deleteProduct(productToDelete.id);
    setProductToDelete(null);
    refreshLocalHistory();
    onRefresh();
  };

  // Open Quick Add Stock Modal with default suggestion based on unit
  const handleOpenAddStockModal = (sweet: SweetProduct) => {
    setSelectedProductForStock(sweet);
    setAddQtyInputStr(sweet.unit === 'kg' ? '10' : '25');
    setStockValidationError('');

    const todayPrefix = new Date().toISOString().slice(0, 10);
    const existingZeroToday = stockHistory.find(
      h => h.productId === sweet.id &&
           h.quantityAdded === 0 &&
           h.dateTime &&
           h.dateTime.startsWith(todayPrefix)
    );

    if (existingZeroToday) {
      setZeroStockNotice(
        lang === 'bn'
          ? 'আজকের জন্য ইতিমধ্যে শূন্য স্টক রেকর্ড করা হয়েছে।'
          : 'Zero stock was already recorded for this product today.'
      );
    } else {
      setZeroStockNotice('');
    }
  };

  if (!activeShopId) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
        <Layers className="w-10 h-10 mx-auto text-[#007F73]/40 dark:text-teal-400/40 mb-3" />
        <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
          {lang === 'bn' ? 'দোকান ব্রাঞ্চ নির্বাচন করুন' : 'No shop branch active'}
        </h4>
        <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 max-w-sm mx-auto">
          {lang === 'bn' ? 'স্টক তালিকা দেখতে বা মিষ্টি যোগ করতে প্রথমে একটি দোকান তৈরি বা নির্বাচন করুন।' : 'Please create or select a shop branch to view stock and sweets.'}
        </p>
      </div>
    );
  }

  const nowFormatted = formatStockDateTime(new Date().toISOString(), lang);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#17211F] dark:text-stone-100 leading-tight">
            {t.stockIndex}
          </h2>
          <p className="text-xs text-[#626E6A] dark:text-stone-400">
            {t.longPressHint}
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowAddSweetModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            {t.registerNewSweet}
          </button>
        )}
      </div>

      {/* Sweets Grid */}
      {products.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
          <Layers className="w-10 h-10 mx-auto text-[#007F73]/40 dark:text-teal-400/40 mb-3" />
          <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
            {lang === 'bn' ? 'কোনো মিষ্টির পদ নেই' : 'No sweets registered yet'}
          </h4>
          <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {lang === 'bn'
              ? 'আপনার দোকানের জন্য কালাজাম, রসগোল্লা, চমচম বা অন্যান্য মিষ্টি যোগ করতে উপরের বোতামে চাপ দিন।'
              : 'Add your first sweet product like Kalajam, Rosogolla, or Chamcham to start managing inventory.'}
          </p>
          {!isReadOnly && (
            <button
              onClick={() => setShowAddSweetModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007F73] text-white rounded-xl text-xs font-semibold hover:bg-[#00685E] transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {t.registerNewSweet}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(sweet => {
            const isLowStock = sweet.currentStock <= sweet.minStockAlert;
            const unitLabel = sweet.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pcs');
            const updatedTime = formatStockDateTime(sweet.updatedAt || sweet.createdAt, lang);

            return (
              <div
                key={sweet.id}
                onMouseDown={() => handleTouchStart(sweet)}
                onMouseUp={handleTouchEnd}
                onTouchStart={() => handleTouchStart(sweet)}
                onTouchEnd={handleTouchEnd}
                className={`p-4 bg-white dark:bg-[#14201C] rounded-2xl border transition relative select-none shadow-xs flex flex-col justify-between ${
                  isPressingId === sweet.id
                    ? 'scale-95 border-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-[#DCE4E1] dark:border-[#1E302B] hover:border-[#007F73] dark:hover:border-teal-500'
                }`}
              >
                <div>
                  {/* Top line: Name and Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100 truncate">
                        {lang === 'bn' ? sweet.nameBn || sweet.name : sweet.name}
                      </h3>
                      {sweet.nameBn && sweet.nameBn !== sweet.name && (
                        <p className="text-[11px] text-[#626E6A] dark:text-stone-400 truncate">
                          {sweet.name}
                        </p>
                      )}
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingProduct(sweet);
                          setEditNameEn(sweet.name);
                          setEditNameBn(sweet.nameBn || sweet.name);
                          setEditPrice(sweet.unitPrice);
                          setEditCost(sweet.costPrice);
                        }}
                        className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#007F73] dark:hover:text-teal-300 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Price & Unit Details */}
                  <div className="mt-2.5 flex items-baseline justify-between text-xs">
                    <span className="text-[#626E6A] dark:text-stone-400">{t.sellingPrice}:</span>
                    <span className="font-mono font-bold text-[#17211F] dark:text-stone-100">
                      {formatCurrency(sweet.unitPrice, currencySymbol, lang)} / {unitLabel}
                    </span>
                  </div>

                  {/* Last updated timestamp */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[#626E6A] dark:text-stone-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{updatedTime.timeStr ? `${updatedTime.dateStr}, ${updatedTime.timeStr}` : updatedTime.dateStr}</span>
                  </div>
                </div>

                {/* Stock Level Counter & Quick Add Trigger */}
                <div className="mt-4 pt-3 border-t border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-[#626E6A] dark:text-stone-400">
                      {t.remainingStock}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-lg font-mono font-extrabold ${isLowStock ? 'text-[#DC2626] dark:text-rose-400' : 'text-[#007F73] dark:text-teal-400'}`}>
                        {formatNumber(sweet.currentStock, lang)}
                      </span>
                      <span className="text-xs font-semibold text-[#626E6A] dark:text-stone-400">
                        {unitLabel}
                      </span>
                      {isLowStock && (
                        <span className="text-[9px] font-bold text-[#DC2626] bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {t.lowStockWarning}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Click to Quick Add Stock */}
                  {!isReadOnly && (
                    <button
                      onClick={() => handleOpenAddStockModal(sweet)}
                      className="px-3 py-1.5 bg-[#F0F4F2] hover:bg-[#007F73] dark:bg-[#162420] dark:hover:bg-teal-700 text-[#007F73] hover:text-white dark:text-teal-300 dark:hover:text-white border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      {t.quickAddStock}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRIORITY 5: AT-A-GLANCE RECENT STOCK MOVEMENTS LIST */}
      <div className="bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 text-[#007F73] dark:bg-teal-500/20 dark:text-teal-300 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
                {lang === 'bn' ? 'সাম্প্রতিক স্টক যোগের বিবরণ' : 'Recent Stock Additions'}
              </h3>
              <p className="text-[11px] text-[#626E6A] dark:text-stone-400">
                {lang === 'bn'
                  ? 'নতুন থেকে পুরাতন ক্রমানুসারে আজকের ও অতীতের স্টক এন্ট্রি'
                  : 'Newest stock movements with 12-hour AM/PM timestamps'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F0F4F2] dark:bg-[#162420] text-[#007F73] dark:text-teal-300 border border-[#DCE4E1] dark:border-[#1E322C]">
            {stockHistory.length} {lang === 'bn' ? 'টি এন্ট্রি' : 'entries'}
          </span>
        </div>

        {stockHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#626E6A] dark:text-stone-400 space-y-1">
            <p className="font-semibold text-stone-500 dark:text-stone-300">
              {lang === 'bn' ? 'এই ব্রাঞ্চে এখনও কোনো স্টক যোগের তথ্য নেই' : 'No stock additions recorded yet for this branch'}
            </p>
            <p className="text-[11px]">
              {lang === 'bn' ? 'মিষ্টির কার্ডের "+ স্টক যোগ" বাটনে ক্লিক করে পরিমাণ যোগ করুন।' : 'Tap "+ Add Stock" on any sweet card to record incoming stock.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE4E1] dark:divide-[#1E302B] max-h-80 overflow-y-auto pr-1">
            {stockHistory.slice(0, 25).map(entry => {
              const dt = formatStockDateTime(entry.dateTime, lang);
              const isZero = entry.quantityAdded === 0;

              return (
                <div key={entry.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isZero
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isZero ? '0' : '+'}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-[#17211F] dark:text-stone-100 truncate">
                        {lang === 'bn' ? entry.productNameBn || entry.productName : entry.productName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#626E6A] dark:text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-[#007F73]" />
                          {dt.dateStr}
                        </span>
                        {dt.timeStr && (
                          <span className="flex items-center gap-1 font-mono font-semibold text-[#17211F] dark:text-stone-300">
                            <Clock className="w-3 h-3 text-[#007F73]" />
                            {dt.timeStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isZero ? (
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono font-bold text-xs border border-stone-200 dark:border-stone-700">
                        {lang === 'bn' ? '০ স্টক (দৈনিক রেকর্ড)' : '0 Stock (Daily Record)'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-900/50">
                        +{formatNumber(entry.quantityAdded, lang)} {entry.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পিস' : 'pcs')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. REGISTER NEW SWEET MODAL */}
      {showAddSweetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-4">
              <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                {t.registerNewSweet}
              </h3>
              <button
                onClick={() => setShowAddSweetModal(false)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSweet} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.sweetNameBn}
                </label>
                <input
                  type="text"
                  required
                  value={sweetNameBn}
                  onChange={e => setSweetNameBn(e.target.value)}
                  placeholder="যেমন: কালাজাম, রসগোল্লা, ছানার সন্দেশ"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.sweetName}
                </label>
                <input
                  type="text"
                  required
                  value={sweetNameEn}
                  onChange={e => setSweetNameEn(e.target.value)}
                  placeholder="e.g. Kalajam, Rosogolla, Sondesh"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {lang === 'bn' ? 'একক' : 'Unit'}
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as SweetUnit)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  >
                    <option value="kg">{lang === 'bn' ? 'কেজি (Kg)' : 'Kg'}</option>
                    <option value="piece">{lang === 'bn' ? 'পিস (Pcs)' : 'Piece'}</option>
                    <option value="box">{lang === 'bn' ? 'বক্স (Box)' : 'Box'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {t.sellingPrice} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {t.costPrice} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={costPrice}
                    onChange={e => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {lang === 'bn' ? 'প্রারম্ভিক স্টক পরিমাণ' : 'Initial Stock Quantity'}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={initialQty}
                  onChange={e => setInitialQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5, 4.2, or 50"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSweetModal(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {t.saveSweet}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUICK ADD STOCK MODAL (Automatic Clock Sync, Strict Unit Validation, Zero-Stock Option) */}
      {selectedProductForStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                  {t.quickAddStock}
                </h3>
                <p className="text-xs text-[#007F73] dark:text-teal-400 font-semibold">
                  {lang === 'bn' ? selectedProductForStock.nameBn || selectedProductForStock.name : selectedProductForStock.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProductForStock(null);
                  setStockValidationError('');
                }}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] mb-4 text-xs space-y-1">
              <div className="flex justify-between text-[#626E6A] dark:text-stone-400">
                <span>{t.remainingStock}:</span>
                <span className="font-mono font-bold text-[#17211F] dark:text-stone-100">
                  {formatNumber(selectedProductForStock.currentStock, lang)} {selectedProductForStock.unit}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#626E6A] dark:text-stone-400 pt-1 border-t border-[#DCE4E1] dark:border-[#1E302B]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#007F73] dark:text-teal-400" />
                  {lang === 'bn' ? 'স্বয়ংক্রিয় মোবাইল সময় (১২ ঘণ্টা)' : 'Device Clock Sync (12h)'}:
                </span>
                <span className="font-mono font-bold text-[#007F73] dark:text-teal-400">
                  {nowFormatted.timeStr}
                </span>
              </div>
            </div>

            {zeroStockNotice && (
              <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{zeroStockNotice}</span>
              </div>
            )}

            {stockValidationError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{stockValidationError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAddStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.enterAddQuantity} ({selectedProductForStock.unit === 'kg' ? (lang === 'bn' ? '০.৫ - ১০০ কেজি' : '0.5 - 100 Kg') : (lang === 'bn' ? '১ - ২০০ পিস' : '1 - 200 Pcs')})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addQtyInputStr}
                  onChange={e => {
                    setAddQtyInputStr(e.target.value);
                    setStockValidationError('');
                  }}
                  placeholder={selectedProductForStock.unit === 'kg' ? 'e.g. 0.5, 1.25, 10' : 'e.g. 5, 20, 50'}
                  className="w-full px-4 py-3 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-2xl text-lg font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 text-center"
                />
              </div>

              {/* Quick increment buttons tailored by unit */}
              <div className="flex gap-1.5 justify-center flex-wrap">
                {selectedProductForStock.unit === 'kg' ? (
                  [0.5, 1, 5, 10, 20].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAddQtyInputStr(String(val));
                        setStockValidationError('');
                      }}
                      className="px-2.5 py-1 bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-lg text-xs font-mono font-bold text-[#17211F] dark:text-stone-200"
                    >
                      +{val} kg
                    </button>
                  ))
                ) : (
                  [5, 10, 25, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAddQtyInputStr(String(val));
                        setStockValidationError('');
                      }}
                      className="px-2.5 py-1 bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-lg text-xs font-mono font-bold text-[#17211F] dark:text-stone-200"
                    >
                      +{val} pcs
                    </button>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.addStockBtn}</span>
                </button>

                {/* Priority 3: Explicit Daily Zero Stock Button */}
                <button
                  type="button"
                  onClick={handleRecordZeroStock}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  title="Record that zero stock was produced or available today"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-stone-500" />
                  <span>
                    {lang === 'bn'
                      ? `আজকের স্টক ০ ${selectedProductForStock.unit === 'kg' ? 'কেজি' : 'পিস'} রেকর্ড করুন`
                      : `Record 0 ${selectedProductForStock.unit} Stock Today`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForStock(null);
                    setStockValidationError('');
                  }}
                  className="w-full py-2 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT SWEET MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                {t.editSweetTitle}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSweet} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.sweetNameBn}
                </label>
                <input
                  type="text"
                  required
                  value={editNameBn}
                  onChange={e => setEditNameBn(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.sweetName}
                </label>
                <input
                  type="text"
                  required
                  value={editNameEn}
                  onChange={e => setEditNameEn(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {t.sellingPrice} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={e => setEditPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {t.costPrice} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editCost}
                    onChange={e => setEditCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CONFIRM DELETE SWEET CARD (Long-press trigger) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-center text-[#17211F] dark:text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
              {t.confirmDeleteTitle}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 mb-4">
              {lang === 'bn' ? productToDelete.nameBn || productToDelete.name : productToDelete.name} - {t.confirmDeleteDesc}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
