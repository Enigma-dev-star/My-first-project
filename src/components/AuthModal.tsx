/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserAccount } from '../types';
import { StorageService, hashString } from '../services/storage';
import { TRANSLATIONS } from '../locales/i18n';
import { Lock, User, ShieldCheck, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: UserAccount) => void;
  lang: 'en' | 'bn';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, lang }) => {
  const t = TRANSLATIONS[lang];
  const masterAdmin = StorageService.getMasterAdmin();
  const guestUsers = StorageService.getGuestUsers();

  const isFirstTime = !masterAdmin;

  // Registration states
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [stockErasePassword, setStockErasePassword] = useState('');
  
  // Login states
  const [selectedUserId, setSelectedUserId] = useState<string>(masterAdmin ? masterAdmin.id : '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // UI status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Password criteria: >= 1 Capital, >= 1 Number, >= 1 Symbol
  const validatePasswordComplexity = (pwd: string): boolean => {
    const hasCapital = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasCapital && hasNumber && hasSymbol && pwd.length >= 6;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Admin Name: Max 20 chars
    const trimmedName = adminName.trim();
    if (!trimmedName || trimmedName.length > 20) {
      setError(
        lang === 'bn'
          ? 'অ্যাডমিনের নাম ১ থেকে সর্বোচ্চ ২০ অক্ষরের মধ্যে হতে হবে।'
          : 'Admin name must be between 1 and 20 characters.'
      );
      return;
    }

    if (!validatePasswordComplexity(password)) {
      setError(
        lang === 'bn'
          ? 'পাসওয়ার্ডে অন্তত একটি বড় হাতের অক্ষর (A-Z), একটি সংখ্যা (0-9) এবং একটি প্রতীক থাকতে হবে।'
          : 'Password must include at least 1 uppercase letter, 1 number, and 1 symbol.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === 'bn'
          ? 'উভয় পাসওয়ার্ড হুবহু মিলছে না।'
          : 'Passwords do not match.'
      );
      return;
    }

    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setError(
        lang === 'bn'
          ? 'পাসওয়ার্ড পুনরুদ্ধারের জন্য সিকিউরিটি প্রশ্ন ও উত্তর দেওয়া বাধ্যতামূলক।'
          : 'Security question and answer are required for recovery.'
      );
      return;
    }

    if (!stockErasePassword.trim()) {
      setError(
        lang === 'bn'
          ? 'জরুরি স্টক মোছার জন্য একটি পৃথক দ্বিতীয় পাসওয়ার্ড সেট করুন।'
          : 'Please set a secondary Stock Erase Password.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const pwdHash = await hashString(password);
      const answerHash = await hashString(securityAnswer.trim().toLowerCase());
      const stockEraseHash = await hashString(stockErasePassword.trim());

      const newMaster: UserAccount = {
        id: crypto.randomUUID(),
        name: trimmedName,
        role: 'master_admin',
        passwordHash: pwdHash,
        securityQuestion: securityQuestion.trim(),
        securityAnswerHash: answerHash,
        stockErasePasswordHash: stockEraseHash,
        createdAt: new Date().toISOString(),
      };

      StorageService.saveUser(newMaster);
      StorageService.setActiveUser(newMaster);
      onSuccess(newMaster);
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'সংরক্ষণে সমস্যা হয়েছে।' : 'Error saving account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = StorageService.getUsers().find(u => u.id === selectedUserId) || masterAdmin;
    if (!user) {
      setError(lang === 'bn' ? 'ব্যবহারকারী পাওয়া যায়নি।' : 'User not found.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inputHash = await hashString(loginPassword);
      if (inputHash === user.passwordHash) {
        StorageService.setActiveUser(user);
        onSuccess(user);
      } else {
        setError(
          lang === 'bn' ? 'ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।' : 'Incorrect password.'
        );
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'লগইনে সমস্যা হয়েছে।' : 'Login error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!masterAdmin || !masterAdmin.securityAnswerHash) return;

    if (!validatePasswordComplexity(newPasswordInput)) {
      setError(
        lang === 'bn'
          ? 'নতুন পাসওয়ার্ডে অন্তত একটি বড় অক্ষর, একটি সংখ্যা এবং একটি প্রতীক দিন।'
          : 'New password must have a capital letter, a number, and a symbol.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ansHash = await hashString(recoveryAnswerInput.trim().toLowerCase());
      if (ansHash === masterAdmin.securityAnswerHash) {
        const newHash = await hashString(newPasswordInput);
        masterAdmin.passwordHash = newHash;
        StorageService.saveUser(masterAdmin);
        setIsRecovering(false);
        setLoginPassword(newPasswordInput);
        setError(
          lang === 'bn'
            ? 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন লগইন করুন।'
            : 'Password successfully reset! You can now log in.'
        );
      } else {
        setError(
          lang === 'bn' ? 'সিকিউরিটি উত্তরটি সঠিক নয়।' : 'Incorrect security answer.'
        );
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'রিসেটে সমস্যা হয়েছে।' : 'Error resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-[#14201C] rounded-3xl shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] overflow-hidden my-auto">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#005c53] via-[#007F73] to-[#00A896] p-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {isFirstTime
              ? t.adminRegistration
              : isRecovering
              ? t.recoveryTitle
              : t.loginTitle}
          </h2>
          <p className="text-xs text-teal-100 mt-1 max-w-xs mx-auto">
            {isFirstTime
              ? t.adminRegistrationDesc
              : isRecovering
              ? t.recoverySubtitle
              : t.loginSubtitle}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* FIRST TIME REGISTRATION */}
          {isFirstTime && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.adminName}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#626E6A] dark:text-stone-400" />
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder={t.adminNamePlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                  />
                </div>
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-1">{t.adminNameHint}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.password}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#626E6A] dark:text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#007F73] dark:text-[#00A896] font-medium mt-1">
                  {t.passwordHint}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
              </div>

              <div className="pt-2 border-t border-[#DCE4E1] dark:border-[#1E302B]">
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.securityQuestion}
                </label>
                <input
                  type="text"
                  required
                  value={securityQuestion}
                  onChange={e => setSecurityQuestion(e.target.value)}
                  placeholder={t.securityQuestionPlaceholder}
                  className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-1">{t.securityQuestionHint}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.securityAnswer}
                </label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  placeholder={t.securityAnswerPlaceholder}
                  className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
              </div>

              <div className="pt-2 border-t border-[#DCE4E1] dark:border-[#1E302B]">
                <label className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
                  {t.stockErasePassword}
                </label>
                <input
                  type="password"
                  required
                  value={stockErasePassword}
                  onChange={e => setStockErasePassword(e.target.value)}
                  placeholder={t.stockErasePasswordPlaceholder}
                  className="w-full px-4 py-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
                <p className="text-[10px] text-[#626E6A] dark:text-stone-400 mt-1">{t.stockErasePasswordHint}</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3 bg-[#007F73] hover:bg-[#006e63] text-white font-semibold rounded-xl text-sm shadow-md transition active:scale-[0.98]"
              >
                {isSubmitting ? '...' : t.createMasterAccount}
              </button>
            </form>
          )}

          {/* RETURNING LOGIN */}
          {!isFirstTime && !isRecovering && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* If guest accounts exist, allow switching */}
              {guestUsers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {t.switchAccount}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium text-[#17211F] dark:text-stone-100"
                  >
                    <option value={masterAdmin!.id}>
                      ★ {masterAdmin!.name} ({t.masterAccount})
                    </option>
                    {guestUsers.map(g => (
                      <option key={g.id} value={g.id}>
                        👤 {g.name} ({t.guestAccount})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Displaying Saved Admin Name as specified in notes */}
              <div className="p-3.5 rounded-2xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007F73] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {masterAdmin?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#007F73] dark:text-[#00A896] tracking-wider">
                    {t.masterAccount}
                  </div>
                  <div className="text-sm font-bold text-[#17211F] dark:text-white">
                    {masterAdmin?.name}
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#007F73] dark:text-[#00A896] ml-auto" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.password}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#626E6A] dark:text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="text-xs font-semibold text-[#007F73] dark:text-[#00A896] hover:underline transition"
                >
                  {t.forgotPassword}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#007F73] hover:bg-[#006e63] text-white font-semibold rounded-xl text-sm shadow-md transition active:scale-[0.98]"
              >
                {isSubmitting ? '...' : t.loginBtn}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD RECOVERY FLOW */}
          {!isFirstTime && isRecovering && (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#007F73]/10 dark:bg-[#007F73]/20 border border-[#007F73]/30 text-[#17211F] dark:text-stone-200 text-xs">
                <span className="font-semibold block text-[#007F73] dark:text-[#00A896] mb-1">
                  {masterAdmin?.securityQuestion}
                </span>
                <span className="text-[11px] text-[#626E6A] dark:text-stone-300">
                  {lang === 'bn'
                    ? 'নিবন্ধনের সময় দেওয়া সঠিক উত্তরটি নিচে লিখুন।'
                    : 'Provide the answer configured during registration.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.securityAnswer}
                </label>
                <input
                  type="text"
                  required
                  value={recoveryAnswerInput}
                  onChange={e => setRecoveryAnswerInput(e.target.value)}
                  placeholder={t.securityAnswerPlaceholder}
                  className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-sm focus:outline-none focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A]/50"
                />
                <p className="text-[10px] text-[#007F73] dark:text-[#00A896] font-medium mt-1">
                  {t.passwordHint}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecovering(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] dark:bg-[#101A17] hover:bg-[#E5ECE9] dark:hover:bg-[#182622] text-[#17211F] dark:text-stone-200 rounded-xl text-xs font-semibold transition"
                >
                  {t.backToLogin}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#006e63] text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  {isSubmitting ? '...' : t.resetPasswordBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
