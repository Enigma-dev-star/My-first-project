/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { ShopBranch, UserAccount } from '../types';
import { StorageService } from '../services/storage';
import { ConfirmDialog } from './ConfirmDialog';
import { Store, Plus, Check, MapPin, Layers, Edit2, Trash2, X, TrendingUp, Search } from 'lucide-react';

interface MultiShopModalProps {
  shops: ShopBranch[];
  activeShopId: string;
  lang: 'en' | 'bn';
  currentUser: UserAccount | null;
  onSelectShop: (shopId: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export const MultiShopModal: React.FC<MultiShopModalProps> = ({
  shops,
  activeShopId,
  lang,
  currentUser,
  onSelectShop,
  onClose,
  onRefresh,
}) => {
  const isReadOnly = currentUser?.role === 'guest_viewer';

  // Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [address, setAddress] = useState('');

  // Edit Shop State
  const [editingShop, setEditingShop] = useState<ShopBranch | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameBn, setEditNameBn] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Delete Shop State
  const [shopToDelete, setShopToDelete] = useState<ShopBranch | null>(null);

  // Search and Chain summary
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregated Chain Statistics across all shops
  const chainStats = useMemo(() => {
    let totalStockAll = 0;
    let totalSalesAll = 0;
    let totalItemsAll = 0;
    shops.forEach(s => {
      const summary = StorageService.getShopSummary(s.id);
      totalStockAll += summary.totalStock;
      totalSalesAll += summary.todaySales;
      totalItemsAll += summary.productCount;
    });
    return {
      branchCount: shops.length,
      totalStockAll: Math.round(totalStockAll * 10) / 10,
      totalSalesAll,
      totalItemsAll,
    };
  }, [shops]);

  // Filtered shops based on search
  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.nameBn && s.nameBn.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  }, [shops, searchQuery]);

  // 1. Create New Shop Branch
  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !nameEn.trim()) return;

    const newShop: ShopBranch = {
      id: crypto.randomUUID(),
      name: nameEn.trim(),
      nameBn: nameBn.trim() || nameEn.trim(),
      address: address.trim(),
      country: 'BD',
      currencySymbol: '৳',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveShop(newShop);
    StorageService.setActiveShopId(newShop.id);
    onSelectShop(newShop.id);
    setNameEn('');
    setNameBn('');
    setAddress('');
    setShowAddForm(false);
    onRefresh();
  };

  // 2. Save Edited Shop Details
  const handleSaveEditShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !editingShop || !editNameEn.trim()) return;

    editingShop.name = editNameEn.trim();
    editingShop.nameBn = editNameBn.trim() || editNameEn.trim();
    editingShop.address = editAddress.trim();

    StorageService.saveShop(editingShop);
    setEditingShop(null);
    onRefresh();
  };

  // 3. Delete Shop Branch (if multiple exist)
  const executeDeleteShop = () => {
    if (!shopToDelete || isReadOnly || shops.length <= 1) return;
    const shopId = shopToDelete.id;
    StorageService.deleteShop(shopId);

    const remaining = shops.filter(s => s.id !== shopId);
    if (activeShopId === shopId && remaining.length > 0) {
      StorageService.setActiveShopId(remaining[0].id);
      onSelectShop(remaining[0].id);
    }
    setShopToDelete(null);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-[min(100vw-1rem,32rem)] max-h-[85dvh] bg-white dark:bg-[#14201C] rounded-3xl shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-stone-900 to-stone-850 dark:from-[#0E1513] dark:to-[#14201C] text-white flex items-center justify-between border-b border-[#DCE4E1]/30 dark:border-[#1E302B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007F73]/25 text-teal-300 flex items-center justify-center">
              <Store className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {lang === 'bn' ? 'মিষ্টির দোকান ব্রাঞ্চসমূহ' : 'Sweet Shop Branches'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {lang === 'bn'
                  ? 'সকল দোকান ব্রাঞ্চ দেখুন, নাম পরিবর্তন করুন অথবা নতুন ব্রাঞ্চ যোগ করুন'
                  : 'View all shop branches, rename shops, or add new branches'}
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

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Executive Chain Overview Banner */}
          <div className="p-3.5 rounded-2xl bg-stone-900 dark:bg-[#101A17] text-white flex items-center justify-between gap-3 shadow-xs border border-stone-800 dark:border-[#1E302B]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                <Store className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                  {lang === 'bn' ? 'সারা নেটওয়ার্কের পরিসংখ্যান' : 'All Branches Network Total'}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-bold text-white text-xs">
                    {chainStats.branchCount} {lang === 'bn' ? 'দোকান' : 'Shops'}
                  </span>
                  <span className="text-stone-600">·</span>
                  <span className="font-mono text-teal-300 text-xs font-semibold">
                    {chainStats.totalStockAll} {lang === 'bn' ? 'কেজি স্টক' : 'kg stock'}
                  </span>
                  <span className="font-mono text-amber-300 text-xs font-semibold">
                    ৳ {chainStats.totalSalesAll.toLocaleString()} {lang === 'bn' ? 'বিক্রি' : 'sales'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search across shops if more than 2 */}
          {shops.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#626E6A] dark:text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'bn' ? 'দোকানের নাম বা এলাকা দিয়ে খুঁজুন...' : 'Quick search branch name or address...'}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
              />
            </div>
          )}

          {/* Action button to open Add Form */}
          {!isReadOnly && !showAddForm && !editingShop && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 px-4 border-2 border-dashed border-[#007F73]/40 hover:border-[#007F73] bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] rounded-2xl text-[#007F73] dark:text-teal-300 font-bold flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#007F73] dark:text-teal-400" />
              <span>{lang === 'bn' ? '+ নতুন মিষ্টির দোকান ব্রাঞ্চ যোগ করুন' : '+ Add New Sweet Shop Branch'}</span>
            </button>
          )}

          {/* ADD NEW SHOP FORM */}
          {showAddForm && (
            <form onSubmit={handleCreateShop} className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE4E1] dark:border-[#1E302B]">
                <span className="font-bold text-[#17211F] dark:text-stone-100">
                  {lang === 'bn' ? 'নতুন দোকান ব্রাঞ্চ নিবন্ধন' : 'Register New Shop Branch'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-bold mb-1">
                  {lang === 'bn' ? 'দোকানের নাম (Shop Name) *' : 'Shop Name (Primary) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={e => setNameEn(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: আমার মিষ্টির দোকান' : 'e.g. My Sweet Shop'}
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 font-medium placeholder-[#626E6A]"
                />
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-0.5">
                  {lang === 'bn' ? 'দোকানের মূল নাম লিখুন (ঠিকানা নয়)' : 'Enter the business/shop name here, not the address.'}
                </p>
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-semibold mb-1">
                  {lang === 'bn' ? 'দোকানের নাম (বাংলায় - ঐচ্ছিক)' : 'Shop Name in Bengali (Optional)'}
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={e => setNameBn(e.target.value)}
                  placeholder="যেমন: আমার মিষ্টির দোকান"
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]"
                />
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-semibold mb-1">
                  {lang === 'bn' ? 'দোকানের ঠিকানা / অবস্থান' : 'Shop Address / Location'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: রাস্তা, এলাকা, শহর' : 'e.g. Street, Area, City'}
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]"
                />
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-0.5">
                  {lang === 'bn' ? 'রাস্তা, এলাকা বা শহর' : 'Street, road or city details.'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-[#DCE4E1] hover:bg-stone-300 dark:bg-stone-800 text-[#17211F] dark:text-stone-200 rounded-xl font-semibold transition"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-bold transition shadow-xs"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Branch'}
                </button>
              </div>
            </form>
          )}

          {/* EDIT SHOP FORM */}
          {editingShop && (
            <form onSubmit={handleSaveEditShop} className="p-4 rounded-2xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#007F73]/40 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE4E1] dark:border-[#1E302B]">
                <span className="font-bold text-[#007F73] dark:text-teal-300">
                  {lang === 'bn' ? 'দোকানের নাম ও ঠিকানা সংশোধন' : 'Edit Shop Name & Address'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-bold mb-1">
                  {lang === 'bn' ? 'দোকানের আসল নাম (Shop Name) *' : 'Shop Name (Primary) *'}
                </label>
                <input
                  type="text"
                  required
                  value={editNameEn}
                  onChange={e => setEditNameEn(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: আমার মিষ্টির দোকান' : 'e.g. My Sweet Shop'}
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-semibold mb-1">
                  {lang === 'bn' ? 'দোকানের নাম (বাংলা)' : 'Shop Name (Bengali)'}
                </label>
                <input
                  type="text"
                  value={editNameBn}
                  onChange={e => setEditNameBn(e.target.value)}
                  placeholder="যেমন: আমার মিষ্টির দোকান"
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[#17211F] dark:text-stone-200 font-semibold mb-1">
                  {lang === 'bn' ? 'ঠিকানা / এলাকা (Address / Postal code)' : 'Address / Postal Code'}
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: রাস্তা, এলাকা, শহর' : 'e.g. Street, Area, City'}
                  className="w-full px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="flex-1 py-2 bg-[#DCE4E1] hover:bg-stone-300 dark:bg-stone-800 text-[#17211F] dark:text-stone-200 rounded-xl font-semibold transition"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-bold transition shadow-xs"
                >
                  {lang === 'bn' ? 'আপডেট করুন' : 'Update Details'}
                </button>
              </div>
            </form>
          )}

          {/* LIST OF REGISTERED BRANCHES */}
          <div className="space-y-2.5">
            {filteredShops.length === 0 ? (
              <div className="p-8 text-center text-[#626E6A] dark:text-stone-400 rounded-2xl border border-dashed border-[#DCE4E1] dark:border-[#1E302B]">
                <Store className="w-8 h-8 mx-auto text-[#626E6A]/50 mb-2" />
                <p className="font-semibold">{lang === 'bn' ? 'কোনো দোকান ব্রাঞ্চ পাওয়া যায়নি' : 'No shop branches found'}</p>
              </div>
            ) : (
              filteredShops.map(shop => {
                const isActive = shop.id === activeShopId;
                const summary = StorageService.getShopSummary(shop.id);

                // Always display the actual Shop Name as the primary title
                const displayShopName = lang === 'bn' 
                  ? (shop.nameBn || shop.name) 
                  : (shop.name || shop.nameBn);

                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      StorageService.setActiveShopId(shop.id);
                      onSelectShop(shop.id);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group select-none ${
                      isActive
                        ? 'bg-[#F0F4F2] dark:bg-teal-950/60 border-[#007F73] shadow-xs ring-2 ring-[#007F73]/20'
                        : 'bg-white dark:bg-[#14201C] hover:bg-[#F0F4F2] dark:hover:bg-[#1A2823] hover:border-[#007F73]/50 border-[#DCE4E1] dark:border-[#1E302B]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Primary Shop Name Title */}
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#17211F] dark:text-stone-100 text-sm truncate group-hover:text-[#007F73] dark:group-hover:text-teal-300 transition">
                          {displayShopName}
                        </h4>
                        {isActive ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#007F73] dark:text-teal-200 bg-[#007F73]/15 dark:bg-teal-900 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#007F73] animate-pulse" />
                            {lang === 'bn' ? 'বর্তমান' : 'ACTIVE'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#626E6A] dark:text-stone-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                            {lang === 'bn' ? 'ক্লিক করে চালু করুন' : 'Click to Switch'}
                          </span>
                        )}
                      </div>

                      {/* Secondary Address Display with Location Icon */}
                      {shop.address && (
                        <p className="text-[11px] text-[#626E6A] dark:text-stone-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#007F73] shrink-0" />
                          <span className="font-medium text-[#626E6A]">Location:</span>
                          <span className="truncate">{shop.address}</span>
                        </p>
                      )}

                      {/* Live Dynamic Branch Snapshot: Items, Stock, Today Sales */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-[#626E6A] dark:text-stone-400">
                          <Layers className="w-3 h-3 text-[#626E6A]" />
                          {summary.productCount} {lang === 'bn' ? 'পদ' : 'items'}
                        </span>
                        <span className="text-stone-300 dark:text-stone-600">·</span>
                        <span className="font-semibold text-[#007F73] dark:text-teal-300 bg-[#007F73]/10 dark:bg-teal-950/70 px-1.5 py-0.5 rounded">
                          {summary.totalStock} {lang === 'bn' ? 'কেজি স্টক' : 'kg stock'}
                        </span>
                        <span className="text-stone-300 dark:text-stone-600">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ৳ {summary.todaySales.toLocaleString()} {lang === 'bn' ? 'আজকের বিক্রি' : 'today'}
                        </span>
                      </div>
                    </div>

                    {/* Actions on Card: Switch & Edit */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingShop(shop);
                            setEditNameEn(shop.name);
                            setEditNameBn(shop.nameBn || shop.name);
                            setEditAddress(shop.address || '');
                            setShowAddForm(false);
                          }}
                          title={lang === 'bn' ? 'দোকানের নাম পরিবর্তন করুন' : 'Edit / Rename Shop'}
                          className="p-2 text-[#626E6A] dark:text-stone-400 hover:text-[#007F73] dark:hover:text-teal-300 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] rounded-xl transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {shops.length > 1 && !isReadOnly && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setShopToDelete(shop);
                          }}
                          title="Delete branch"
                          className="p-2 text-[#626E6A] dark:text-stone-400 hover:text-[#DC2626] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                          isActive
                            ? 'bg-[#007F73] text-white shadow-xs'
                            : 'bg-[#F0F4F2] dark:bg-stone-800 group-hover:bg-[#007F73] group-hover:text-white text-[#17211F] dark:text-stone-300'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>{lang === 'bn' ? 'নির্বাচিত' : 'Selected'}</span>
                          </>
                        ) : (
                          <span>{lang === 'bn' ? 'খুলুন' : 'Switch'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Shop Branch Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!shopToDelete}
        title={lang === 'bn' ? 'দোকান ব্রাঞ্চ মুছে ফেলুন' : 'Delete Shop Branch'}
        message={
          lang === 'bn'
            ? `আপনি কি নিশ্চিতভাবে "${shopToDelete?.nameBn || shopToDelete?.name}" ব্রাঞ্চটি মুছে ফেলতে চান?`
            : `Are you sure you want to delete "${shopToDelete?.name}"?`
        }
        isDanger={true}
        confirmText={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        onConfirm={executeDeleteShop}
        onCancel={() => setShopToDelete(null)}
        lang={lang}
      />
    </div>
  );
};
