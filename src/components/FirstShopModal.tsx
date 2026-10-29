/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShopBranch } from '../types';
import { StorageService } from '../services/storage';
import { Store, ArrowRight, MapPin, Phone } from 'lucide-react';

interface FirstShopModalProps {
  lang: 'en' | 'bn';
  onShopCreated: (shop: ShopBranch) => void;
}

export const FirstShopModal: React.FC<FirstShopModalProps> = ({ lang, onShopCreated }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEn = nameEn.trim();
    if (!trimmedEn) {
      setError(
        lang === 'bn'
          ? 'অনুগ্রহ করে দোকানের নাম লিখুন।'
          : 'Please enter your shop name.'
      );
      return;
    }

    const newShop: ShopBranch = {
      id: crypto.randomUUID(),
      name: trimmedEn,
      nameBn: nameBn.trim() || trimmedEn,
      address: address.trim(),
      country: 'BD',
      currencySymbol: '৳',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveShop(newShop);
    StorageService.setActiveShopId(newShop.id);

    // Save phone to settings if provided
    if (phone.trim()) {
      const currentSettings = StorageService.getSettings();
      StorageService.saveSettings({ ...currentSettings });
    }

    onShopCreated(newShop);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-[#14201C] rounded-3xl shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] overflow-hidden my-auto animate-toast-slide">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-stone-900 to-stone-850 dark:from-[#0E1513] dark:to-[#14201C] text-white border-b border-[#DCE4E1]/20 dark:border-[#1E302B]">
          <div className="w-12 h-12 rounded-2xl bg-[#007F73]/25 text-teal-300 flex items-center justify-center mb-3">
            <Store className="w-6 h-6 text-teal-300" />
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">
            {lang === 'bn' ? 'আপনার প্রথম মিষ্টির দোকান তৈরি করুন' : 'Create Your First Sweet Shop'}
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            {lang === 'bn'
              ? 'স্টক, দৈনিক বিক্রি ও হিসাব পরিচালনা শুরু করতে আপনার মিষ্টির দোকানের তথ্য দিন।'
              : 'Set up your sweet shop details to start tracking confectionery inventory, daily sales and bills.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের নাম (ইংরেজি / মূল নাম) *' : 'Shop Name (Primary) *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nameEn}
              onChange={e => {
                setNameEn(e.target.value);
                if (error) setError(null);
              }}
              placeholder={lang === 'bn' ? 'যেমন: Sweet Heaven Bakery' : 'e.g. My Sweet Shop'}
              className="w-full px-3.5 py-2.5 bg-[#F5F7F8] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 text-xs font-semibold placeholder-[#626E6A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের নাম (বাংলায় - ঐচ্ছিক)' : 'Shop Name in Bengali (Optional)'}
            </label>
            <input
              type="text"
              value={nameBn}
              onChange={e => setNameBn(e.target.value)}
              placeholder={lang === 'bn' ? 'যেমন: সুইট হেভেন বেকারি' : 'e.g. মিষ্টির দোকান'}
              className="w-full px-3.5 py-2.5 bg-[#F5F7F8] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 text-xs placeholder-[#626E6A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের ঠিকানা বা অবস্থান' : 'Shop Address / Location'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#626E6A] dark:text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: স্টেশন বাজার, রোড ১২' : 'e.g. 12 Station Road, Central Bazar'}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F7F8] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 text-xs placeholder-[#626E6A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'যোগাযোগের ফোন নম্বর (ঐচ্ছিক)' : 'Phone Number (Optional)'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#626E6A] dark:text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="01700-000000"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5F7F8] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 text-xs placeholder-[#626E6A]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-bold transition shadow-md shadow-[#007F73]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>{lang === 'bn' ? 'দোকান তৈরি করুন' : 'Create Shop'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
