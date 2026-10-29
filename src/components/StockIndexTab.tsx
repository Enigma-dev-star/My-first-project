/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SweetProduct, SweetUnit, UserAccount } from '../types';
import { StorageService } from '../services/storage';
import { TRANSLATIONS, formatCurrency, formatNumber } from '../locales/i18n';
import { Plus, Edit2, Trash2, Clock, AlertTriangle, Layers, X, Check } from 'lucide-react';

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
  const [addQtyInput, setAddQtyInput] = useState<number>(10);

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
    onRefresh();
  };

  // 2. Quick Add Stock (synchronized with local mobile clock)
  const handleConfirmAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedProductForStock) return;

    const qty = Number(addQtyInput);
    if (qty <= 0) return;

    // Log stock intake synchronized with local mobile time
    StorageService.addStockEntry({
      id: crypto.randomUUID(),
      shopId: selectedProductForStock.shopId,
      productId: selectedProductForStock.id,
      productName: selectedProductForStock.name,
      productNameBn: selectedProductForStock.nameBn,
      quantityAdded: qty,
      unit: selectedProductForStock.unit,
      costPrice: selectedProductForStock.costPrice,
      dateTime: new Date().toISOString(),
      notes: 'Counter / Kitchen stock refill',
    });

    setSelectedProductForStock(null);
    setAddQtyInput(10);
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

    StorageService.saveProduct(editingProduct);
    setEditingProduct(null);
    onRefresh();
  };

  // 4. Confirm Delete Sweet
  const handleConfirmDelete = () => {
    if (isReadOnly || !productToDelete) return;
    StorageService.deleteProduct(productToDelete.id);
    setProductToDelete(null);
    onRefresh();
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

  return (
    <div className="space-y-5">
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
                      onClick={() => {
                        setSelectedProductForStock(sweet);
                        setAddQtyInput(sweet.unit === 'kg' ? 10 : 50);
                      }}
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
                  placeholder="e.g. Kalajam, Rosogolla, Sandesh"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              {/* Unit selection: kg vs piece */}
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.unitType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnit('kg')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      unit === 'kg'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.unitKg}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('piece')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      unit === 'piece'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.unitPiece}
                  </button>
                </div>
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
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
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
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.initialQuantity} ({unit === 'kg' ? 'Kg' : 'Pieces'})
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

      {/* 2. QUICK ADD STOCK MODAL (Automatic Mobile Clock Sync) */}
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
                onClick={() => setSelectedProductForStock(null)}
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
                  {lang === 'bn' ? 'স্বয়ংক্রিয় মোবাইল সময়' : 'Device Clock Sync'}:
                </span>
                <span className="font-mono text-[#17211F] dark:text-stone-200">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmAddStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.enterAddQuantity} ({selectedProductForStock.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pieces')})
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={addQtyInput}
                  onChange={e => setAddQtyInput(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5, 4.2, or 50"
                  className="w-full px-4 py-3 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-2xl text-lg font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 text-center"
                />
              </div>

              {/* Quick increment buttons supporting whole and decimal values */}
              <div className="flex gap-2 justify-center">
                {[0.5, 1, 4.2, 5, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAddQtyInput(val)}
                    className="px-2.5 py-1 bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-lg text-xs font-mono font-bold text-[#17211F] dark:text-stone-200"
                  >
                    +{val}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForStock(null)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {t.addStockBtn}
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
