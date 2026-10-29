/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store, MapPin, Phone, Sparkles, Building2 } from 'lucide-react';
import { ShopBranch } from '../types';
import { StorageService } from '../services/storage';

interface CreateFirstShopModalProps {
  lang: 'en' | 'bn';
  currencySymbol: string;
  country: string;
  onShopCreated: (shop: ShopBranch) => void;
}

export const CreateFirstShopModal: React.FC<CreateFirstShopModalProps> = ({
  lang,
  currencySymbol,
  country,
  onShopCreated,
}) => {
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNameEn = nameEn.trim();
    const trimmedAddress = address.trim();

    if (!trimmedNameEn) {
      setError(lang === 'bn' ? 'দোকানের নাম দেওয়া বাধ্যতামূলক।' : 'Shop name is required.');
      return;
    }

    if (!trimmedAddress) {
      setError(lang === 'bn' ? 'দোকানের ঠিকানা দেওয়া বাধ্যতামূলক।' : 'Shop address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newShop: ShopBranch = {
        id: crypto.randomUUID(),
        name: trimmedNameEn,
        nameBn: nameBn.trim() || trimmedNameEn,
        address: trimmedAddress,
        phone: phone.trim() || undefined,
        country: country || 'BD',
        currencySymbol: currencySymbol || '৳',
        createdAt: new Date().toISOString(),
      };

      StorageService.saveShop(newShop);
      StorageService.setActiveShopId(newShop.id);
      StorageService.logAction('FIRST_SHOP_CREATED', `Created initial shop: ${newShop.name}`);
      onShopCreated(newShop);
    } catch (err) {
      console.error('Failed to create first shop', err);
      setError(lang === 'bn' ? 'দোকান তৈরি করতে সমস্যা হয়েছে।' : 'Failed to create shop.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="w-[min(100vw-1rem,28rem)] max-h-[85dvh] overflow-y-auto bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-2xl p-5 sm:p-7 space-y-5 animate-scale-up my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30 flex items-center justify-center text-[#007F73] dark:text-teal-400 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007F73]/10 text-[#007F73] dark:text-teal-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'প্রাথমিক সেটআপ' : 'Initial Setup'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17211F] dark:text-white">
            {lang === 'bn' ? 'আপনার প্রথম দোকান তৈরি করুন' : 'Create Your First Shop'}
          </h2>
          <p className="text-xs text-[#626E6A] dark:text-stone-400">
            {lang === 'bn'
              ? 'স্টক, দৈনিক বিক্রি ও ক্যাশ খাতা শুরু করতে আপনার মিষ্টির দোকানের তথ্য দিন।'
              : 'Enter details for your primary branch to initialize inventory and sales counter.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের নাম (English) *' : 'Shop Name (Primary) *'}
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-[#626E6A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. My Sweet Shop"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm font-semibold text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের নাম (বাংলায় - ঐচ্ছিক)' : 'Shop Name in Bengali (Optional)'}
            </label>
            <input
              type="text"
              value={nameBn}
              onChange={e => setNameBn(e.target.value)}
              placeholder="যেমন: আমার মিষ্টির দোকান"
              className="w-full px-3 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'দোকানের ঠিকানা / অবস্থান *' : 'Shop Address / Location *'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#626E6A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: রাস্তা, এলাকা, শহর' : 'e.g. Street, Area, City'}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
              {lang === 'bn' ? 'যোগাযোগের মোবাইল নম্বর (ঐচ্ছিক)' : 'Contact Phone (Optional)'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#626E6A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 01700000000"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] outline-none focus:ring-2 focus:ring-[#007F73]/30 focus:border-[#007F73]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-bold text-sm transition shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
          >
            <Building2 className="w-4 h-4" />
            <span>{lang === 'bn' ? 'দোকান তৈরি করে ড্যাশবোর্ডে প্রবেশ করুন' : 'Create Shop & Continue'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
