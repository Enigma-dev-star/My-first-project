/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SweetProduct, UserAccount } from '../types';
import { StorageService } from '../services/storage';
import { TRANSLATIONS, formatCurrency, formatNumber } from '../locales/i18n';
import { ShoppingCart, Check, AlertCircle, Receipt, X } from 'lucide-react';

interface SalesCounterProps {
  products: SweetProduct[];
  activeShopId: string;
  currencySymbol: string;
  lang: 'en' | 'bn';
  currentUser: UserAccount | null;
  onRefresh: () => void;
}

export const SalesCounterTab: React.FC<SalesCounterProps> = ({
  products,
  activeShopId,
  currencySymbol,
  lang,
  currentUser,
  onRefresh,
}) => {
  const t = TRANSLATIONS[lang];
  const isReadOnly = currentUser?.role === 'guest_viewer';

  const [selectedProduct, setSelectedProduct] = useState<SweetProduct | null>(null);
  const [soldQty, setSoldQty] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_banking'>('cash');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentReceipt, setRecentReceipt] = useState<{
    sweetName: string;
    qty: number;
    unit: string;
    total: number;
    remaining: number;
    time: string;
  } | null>(null);

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return Math.round(selectedProduct.unitPrice * (Number(soldQty) || 0));
  };

  const handleOpenSaleModal = (product: SweetProduct) => {
    if (isReadOnly) return;
    setSelectedProduct(product);
    setSoldQty(product.unit === 'kg' ? 1 : 4);
    setErrorMsg(null);
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedProduct) return;

    const qty = Number(soldQty);
    if (qty <= 0) {
      setErrorMsg(lang === 'bn' ? 'বিক্রির পরিমাণ ০ এর বেশি হতে হবে।' : 'Quantity must be greater than 0.');
      return;
    }

    if (qty > selectedProduct.currentStock) {
      setErrorMsg(
        lang === 'bn'
          ? `দোকানে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${formatNumber(selectedProduct.currentStock, lang)} ${selectedProduct.unit} আছে।`
          : `Insufficient stock! Only ${selectedProduct.currentStock} ${selectedProduct.unit} available.`
      );
      return;
    }

    const now = new Date();
    const totalAmount = Math.round(selectedProduct.unitPrice * qty);
    const costTotal = Math.round(selectedProduct.costPrice * qty);
    const remainingStock = Math.max(0, selectedProduct.currentStock - qty);

    // 1. Deduct Sweet Stock & Save
    selectedProduct.currentStock = remainingStock;
    selectedProduct.updatedAt = now.toISOString();
    StorageService.saveProduct(selectedProduct);

    // 2. Log Sale Record (synchronized with timeline)
    StorageService.addSaleRecord({
      id: crypto.randomUUID(),
      shopId: activeShopId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productNameBn: selectedProduct.nameBn,
      quantitySold: qty,
      unit: selectedProduct.unit,
      pricePerUnit: selectedProduct.unitPrice,
      totalAmount,
      costTotal,
      previousStock: selectedProduct.currentStock + qty,
      remainingStock,
      dateTime: now.toISOString(),
      year: now.getFullYear(),
      month: now.getMonth(),
      dayOfWeek: now.getDay(),
    });

    // 3. Add to daily billing ledger as cash/digital inflow
    StorageService.addBillRecord({
      id: crypto.randomUUID(),
      shopId: activeShopId,
      type: 'sale',
      title: `${selectedProduct.name} Sale (${qty} ${selectedProduct.unit})`,
      amount: totalAmount,
      paymentMethod,
      dateTime: now.toISOString(),
    });

    // Display confirmation receipt toast
    setRecentReceipt({
      sweetName: lang === 'bn' ? selectedProduct.nameBn || selectedProduct.name : selectedProduct.name,
      qty,
      unit: selectedProduct.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pcs'),
      total: totalAmount,
      remaining: remainingStock,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setSelectedProduct(null);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Sales Header */}
      <div>
        <h2 className="text-base font-bold text-[#17211F] dark:text-stone-100 leading-tight">
          {t.quickSellTitle}
        </h2>
        <p className="text-xs text-[#626E6A] dark:text-stone-400">
          {t.selectSweetToSell}
        </p>
      </div>

      {/* Sweets Selection Quick Tap Grid */}
      {products.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
          <ShoppingCart className="w-10 h-10 mx-auto text-[#007F73]/30 dark:text-teal-400/30 mb-3" />
          <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
            {lang === 'bn' ? 'দোকানে কোনো মিষ্টির স্টক নেই' : 'No sweets in stock'}
          </h4>
          <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1">
            {lang === 'bn'
              ? 'বিক্রি শুরু করতে প্রথমে মিষ্টির স্টক ট্যাবে গিয়ে মিষ্টি ও পরিমাণ যোগ করুন।'
              : 'Add sweets in the Sweets Stock tab before recording counter sales.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => {
            const isOutOfStock = product.currentStock <= 0;
            const unitLabel = product.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pcs');

            return (
              <button
                key={product.id}
                type="button"
                disabled={isOutOfStock || isReadOnly}
                onClick={() => handleOpenSaleModal(product)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isOutOfStock
                    ? 'opacity-50 bg-[#F0F4F2] dark:bg-[#101A17] border-[#DCE4E1] dark:border-[#1E302B] cursor-not-allowed'
                    : 'bg-white dark:bg-[#14201C] hover:bg-[#F0F4F2] dark:hover:bg-[#1A2823] border-[#DCE4E1] dark:border-[#1E302B] hover:border-[#007F73] dark:hover:border-teal-500 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#626E6A] dark:text-stone-400">
                      {unitLabel}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#007F73] dark:text-teal-400">
                      {formatCurrency(product.unitPrice, currencySymbol, lang)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#17211F] dark:text-stone-100 leading-snug line-clamp-2">
                    {lang === 'bn' ? product.nameBn || product.name : product.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-[#DCE4E1] dark:border-[#1E302B] flex items-center justify-between">
                  <span className="text-[10px] text-[#626E6A] dark:text-stone-400">
                    {lang === 'bn' ? 'মজুত' : 'Stock'}:
                  </span>
                  <span className={`text-xs font-mono font-bold ${isOutOfStock ? 'text-[#DC2626] dark:text-rose-400' : 'text-[#17211F] dark:text-stone-200'}`}>
                    {formatNumber(product.currentStock, lang)} {unitLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* RECENT SALE RECEIPT CONFIRMATION TOAST / CARD */}
      {recentReceipt && (
        <div className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#007F73]/30 dark:border-teal-800 flex items-center justify-between gap-3 text-xs text-[#17211F] dark:text-teal-100 animate-in fade-in slide-in-from-bottom-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007F73] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-[#17211F] dark:text-white">
                {recentReceipt.qty} {recentReceipt.unit} {recentReceipt.sweetName} · {formatCurrency(recentReceipt.total, currencySymbol, lang)}
              </div>
              <div className="text-[11px] text-[#626E6A] dark:text-teal-300">
                {lang === 'bn' ? 'দোকানে অবশিষ্ট স্টক' : 'Remaining in shop'}:{' '}
                <span className="font-mono font-bold text-[#007F73] dark:text-teal-400">{recentReceipt.remaining} {recentReceipt.unit}</span> ({recentReceipt.time})
              </div>
            </div>
          </div>
          <button
            onClick={() => setRecentReceipt(null)}
            className="p-1 text-[#626E6A] hover:text-[#17211F] dark:text-stone-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* QUICK SALE DEDUCTION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                  {t.quickSellTitle}
                </h3>
                <p className="text-xs text-[#007F73] dark:text-teal-400 font-semibold">
                  {lang === 'bn' ? selectedProduct.nameBn || selectedProduct.name : selectedProduct.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-[#DC2626] dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current Stock vs Deduction Preview */}
            <div className="p-3.5 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] mb-4 text-xs space-y-1.5">
              <div className="flex justify-between text-[#626E6A] dark:text-stone-400">
                <span>{t.remainingStock}:</span>
                <span className="font-mono font-bold text-[#17211F] dark:text-stone-100">
                  {formatNumber(selectedProduct.currentStock, lang)} {selectedProduct.unit}
                </span>
              </div>
              <div className="flex justify-between text-[#626E6A] dark:text-stone-400">
                <span>{t.sellingPrice}:</span>
                <span className="font-mono font-bold text-[#17211F] dark:text-stone-100">
                  {formatCurrency(selectedProduct.unitPrice, currencySymbol, lang)} / {selectedProduct.unit}
                </span>
              </div>
              <div className="flex justify-between text-[#007F73] dark:text-teal-400 pt-1.5 border-t border-[#DCE4E1] dark:border-[#1E302B] font-semibold">
                <span>{t.remainingAfterSale}:</span>
                <span className="font-mono font-bold">
                  {formatNumber(Math.max(0, selectedProduct.currentStock - (Number(soldQty) || 0)), lang)} {selectedProduct.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.quantitySold} ({selectedProduct.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pieces')})
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  max={selectedProduct.currentStock}
                  value={soldQty}
                  onChange={e => setSoldQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5, 4.2, or 50"
                  className="w-full px-4 py-3 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-2xl text-xl font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 text-center"
                />
              </div>

              {/* Quick quantity chips supporting decimal and whole numbers */}
              <div className="flex gap-1.5 justify-center">
                {(selectedProduct.unit === 'kg' ? [0.5, 1, 2, 4.2, 5] : [1, 2, 4, 10]).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSoldQty(val)}
                    className="px-2.5 py-1 bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1E322C] border border-[#DCE4E1] dark:border-[#1E322C] rounded-lg text-xs font-mono font-semibold text-[#17211F] dark:text-stone-200"
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Total Payable Display */}
              <div className="p-3 bg-[#007F73]/10 dark:bg-teal-950/60 rounded-2xl border border-[#007F73]/25 dark:border-teal-800 text-center">
                <div className="text-[10px] uppercase font-bold text-[#007F73] dark:text-teal-400">
                  {t.priceTotal}
                </div>
                <div className="text-2xl font-extrabold font-mono text-[#007F73] dark:text-teal-300 mt-0.5">
                  {formatCurrency(calculateTotal(), currencySymbol, lang)}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      paymentMethod === 'cash'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.cashPayment}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mobile_banking')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      paymentMethod === 'mobile_banking'
                        ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs'
                        : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    {t.digitalPayment}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {t.confirmSale}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
