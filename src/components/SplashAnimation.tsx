/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SplashProps {
  onFinish: () => void;
  lang: 'en' | 'bn';
}

export const SplashAnimation: React.FC<SplashProps> = ({ onFinish, lang }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1917] via-[#292524] to-[#1C1917] text-white p-6 overflow-hidden select-none">
      {/* Background warm confectionery ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-emerald-700/15 rounded-full blur-3xl pointer-events-none" />

      {/* Animated Sweet Logo Badge */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 100, duration: 0.8 }}
        className="relative mb-6"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 p-1 shadow-2xl shadow-amber-600/40 flex items-center justify-center">
          <img
            src="/icon.svg"
            alt="MSMS Logo"
            className="w-24 h-24 rounded-2xl object-contain drop-shadow"
          />
        </div>

        {/* Decorative corner sparkle */}
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className="absolute -top-2 -right-2 text-amber-300"
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
      </motion.div>

      {/* Main Title Welcome Animation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-center max-w-sm"
      >
        <div className="inline-block px-3 py-1 mb-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wider uppercase">
          {lang === 'bn' ? 'স্বাগতম' : 'Welcome to'}
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
            MSMS
          </span>
        </h1>
        <p className="text-base font-medium text-amber-100/90 leading-snug">
          {lang === 'bn'
            ? 'মুসলিম সুইটস ম্যানেজমেন্ট সিস্টেম'
            : 'Muslim Sweets Management System'}
        </p>

        <p className="text-xs text-stone-400 mt-3 font-normal">
          {lang === 'bn'
            ? 'স্মার্ট স্টক ও দৈনিক বিক্রয় সমাধান'
            : 'Artisan Confectionery Inventory & Sales'}
        </p>
      </motion.div>

      {/* Loading indicator bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '140px' }}
        transition={{ delay: 0.5, duration: 1.6, ease: 'easeInOut' }}
        className="h-1 bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full mt-10"
      />

      <button
        onClick={onFinish}
        className="mt-6 text-xs text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-wider"
      >
        {lang === 'bn' ? 'এড়িয়ে যান →' : 'Skip →'}
      </button>
    </div>
  );
};
