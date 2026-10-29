/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BillRecord, UserAccount } from '../types';
import { StorageService } from '../services/storage';
import { TRANSLATIONS, formatCurrency } from '../locales/i18n';
import { Receipt, Plus, Wallet, ArrowUpRight, ArrowDownRight, Printer, X } from 'lucide-react';

interface BillingTabProps {
  bills: BillRecord[];
  activeShopId: string;
  currencySymbol: string;
  lang: 'en' | 'bn';
  currentUser: UserAccount | null;
  onRefresh: () => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  bills,
  activeShopId,
  currencySymbol,
  lang,
  currentUser,
  onRefresh,
}) => {
  const t = TRANSLATIONS[lang];
  const isReadOnly = currentUser?.role === 'guest_viewer';

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_banking'>('cash');
  const [activeReceipt, setActiveReceipt] = useState<BillRecord | null>(null);

  // Calculate daily totals
  const totalSalesInflow = bills
    .filter(b => b.type === 'sale')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalExpenseOutflow = bills
    .filter(b => b.type === 'expense' || b.type === 'supplier')
    .reduce((sum, b) => sum + b.amount, 0);

  const netCashBalance = totalSalesInflow - totalExpenseOutflow;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !activeShopId) return;

    StorageService.addBillRecord({
      id: crypto.randomUUID(),
      shopId: activeShopId,
      type: 'expense',
      title: expenseTitle.trim(),
      amount: Number(expenseAmount),
      paymentMethod,
      dateTime: new Date().toISOString(),
    });

    setShowExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount(500);
    onRefresh();
  };

  if (!activeShopId) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
        <Receipt className="w-10 h-10 mx-auto text-[#626E6A]/50 dark:text-stone-600 mb-3" />
        <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
          {lang === 'bn' ? 'দোকান ব্রাঞ্চ নির্বাচন করুন' : 'No shop branch active'}
        </h4>
        <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 max-w-sm mx-auto">
          {lang === 'bn' ? 'বিল ও খরচের খাতা দেখতে প্রথমে একটি দোকান তৈরি বা নির্বাচন করুন।' : 'Please create or select a shop branch to view bills and expense records.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-[#14201C] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium">
              {lang === 'bn' ? 'মোট বিক্রয় আয়' : 'Total Sales Inflow'}
            </div>
            <div className="text-xl font-mono font-extrabold text-[#007F73] dark:text-teal-400 mt-0.5">
              {formatCurrency(totalSalesInflow, currencySymbol, lang)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#007F73]/15 dark:bg-teal-500/20 text-[#007F73] dark:text-teal-300 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#14201C] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium">
              {lang === 'bn' ? 'মোট দোকান খরচ' : 'Total Expenses'}
            </div>
            <div className="text-xl font-mono font-extrabold text-[#DC2626] dark:text-rose-400 mt-0.5">
              {formatCurrency(totalExpenseOutflow, currencySymbol, lang)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#14201C] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-medium">
              {t.netProfitTitle}
            </div>
            <div className={`text-xl font-mono font-extrabold mt-0.5 ${netCashBalance >= 0 ? 'text-[#007F73] dark:text-teal-400' : 'text-[#DC2626] dark:text-rose-400'}`}>
              {formatCurrency(netCashBalance, currencySymbol, lang)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#007F73]/15 dark:bg-teal-500/20 text-[#007F73] dark:text-teal-300 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#17211F] dark:text-stone-100 leading-tight">
            {t.invoicesTitle}
          </h2>
          <p className="text-xs text-[#626E6A] dark:text-stone-400">
            {lang === 'bn'
              ? 'দৈনিক বিক্রি এবং দোকানের কাঁচামাল খরচের তালিকা'
              : 'Daily sales billing transactions and operational expense logs'}
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            {t.addExpense}
          </button>
        )}
      </div>

      {/* Bills / Invoices List */}
      {bills.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
          <Receipt className="w-10 h-10 mx-auto text-[#626E6A]/50 dark:text-stone-600 mb-3" />
          <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
            {lang === 'bn' ? 'কোনো লেনদেন লিপিবদ্ধ নেই' : 'No bills or expense records yet'}
          </h4>
          <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {lang === 'bn'
              ? 'কাউন্টারে মিষ্টি বিক্রি করলে স্বয়ংক্রিয়ভাবে বিল যোগ হবে অথবা আপনি দোকানের দুধ/চিনির খরচ যোগ করতে পারেন।'
              : 'Sales transactions are automatically logged as customer bills, or you can record operational expenses.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#14201C] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs divide-y divide-[#DCE4E1] dark:divide-[#1E302B] overflow-hidden">
          {bills.map(bill => {
            const isSale = bill.type === 'sale';
            const dateStr = new Date(bill.dateTime).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={bill.id}
                onClick={() => setActiveReceipt(bill)}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSale ? 'bg-[#007F73]/15 text-[#007F73] dark:bg-teal-950/70 dark:text-teal-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                    }`}
                  >
                    {isSale ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-[#17211F] dark:text-stone-100 truncate">
                      {lang === 'bn' ? bill.titleBn || bill.title : bill.title}
                    </div>
                    <div className="text-[11px] text-[#626E6A] dark:text-stone-400 font-mono mt-0.5">
                      {dateStr} · {bill.paymentMethod.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold font-mono ${isSale ? 'text-[#007F73] dark:text-teal-400' : 'text-[#DC2626] dark:text-rose-400'}`}>
                    {isSale ? '+' : '-'}{formatCurrency(bill.amount, currencySymbol, lang)}
                  </div>
                  <div className="text-[10px] text-[#626E6A] dark:text-stone-500">
                    {t.printReceipt}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                {t.addExpense}
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.expenseTitle}
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={e => setExpenseTitle(e.target.value)}
                  placeholder={t.expenseTitlePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.expenseAmount} ({currencySymbol})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] dark:focus:border-teal-500 outline-none text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.paymentMethod}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl font-bold border transition ${paymentMethod === 'cash' ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs' : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'}`}
                  >
                    {t.cashPayment}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mobile_banking')}
                    className={`py-2 rounded-xl font-bold border transition ${paymentMethod === 'mobile_banking' ? 'bg-[#007F73] text-white border-[#007F73] shadow-xs' : 'bg-[#F0F4F2] dark:bg-[#101A17] text-[#17211F] dark:text-stone-300 border-[#DCE4E1] dark:border-[#1E302B]'}`}
                  >
                    {t.digitalPayment}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {t.logExpenseBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW / PRINT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            {/* Traditional Receipt look */}
            <div className="text-center pb-4 border-b border-dashed border-[#DCE4E1] dark:border-[#1E302B]">
              <h3 className="text-base font-extrabold tracking-wide uppercase text-[#17211F] dark:text-white">
                {t.appShort} - {lang === 'bn' ? 'রশিদ' : 'MEMO'}
              </h3>
              <p className="text-[11px] text-[#626E6A] dark:text-stone-400">
                {t.appTitle}
              </p>
              <p className="text-[10px] text-[#626E6A] dark:text-stone-500 font-mono mt-1">
                Ref: {activeReceipt.id.slice(0, 8)} · {new Date(activeReceipt.dateTime).toLocaleString()}
              </p>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-[#626E6A] dark:text-stone-400">{lang === 'bn' ? 'বিবরণ' : 'Description'}:</span>
                <span className="text-right text-[#17211F] dark:text-white">{activeReceipt.title}</span>
              </div>
              <div className="flex justify-between text-[#626E6A] dark:text-stone-400">
                <span>{lang === 'bn' ? 'ধরন' : 'Type'}:</span>
                <span className="uppercase font-mono text-[#17211F] dark:text-stone-200">{activeReceipt.type}</span>
              </div>
              <div className="flex justify-between text-[#626E6A] dark:text-stone-400">
                <span>{lang === 'bn' ? 'পরিশোধ মাধ্যম' : 'Payment'}:</span>
                <span className="uppercase font-mono text-[#17211F] dark:text-stone-200">{activeReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-dashed border-[#DCE4E1] dark:border-[#1E302B] text-base font-extrabold font-mono text-[#007F73] dark:text-teal-400">
                <span>{lang === 'bn' ? 'মোট টাকা' : 'TOTAL'}:</span>
                <span>{formatCurrency(activeReceipt.amount, currencySymbol, lang)}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                {t.printReceipt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
