/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TRANSLATIONS, formatCurrency, formatNumber } from '../locales/i18n';
import { Smartphone, Code, Copy, Check, Calendar, TrendingUp, Layers } from 'lucide-react';

interface WidgetProps {
  lang: 'en' | 'bn';
  shopName: string;
  currencySymbol: string;
  totalStockKg: number;
  totalStockPcs: number;
  todaySalesAmount: number;
  monthlySalesAmount: number;
  todaySalesCount: number;
}

export const AndroidWidgetSimulator: React.FC<WidgetProps> = ({
  lang,
  shopName,
  currencySymbol,
  totalStockKg,
  totalStockPcs,
  todaySalesAmount,
  monthlySalesAmount,
  todaySalesCount,
}) => {
  const t = TRANSLATIONS[lang];
  const [widgetMode, setWidgetMode] = useState<'daily' | 'monthly'>('daily');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const nativeKotlinCode = `// File: app/src/main/java/com/muslimsweets/msms/widget/MSMSGlanceWidget.kt
package com.muslimsweets.msms.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

/**
 * 2026 Material 3 Android Home Screen Widget for Muslim Sweets Management System (MSMS)
 * Displays Live Stock Level & Daily / Monthly Sales Revenue directly on phone home screen.
 */
class MSMSGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetContent(context)
        }
    }

    @Composable
    private fun WidgetContent(context: Context) {
        val backgroundColor = GlanceTheme.colors.surface
        val primaryColor = GlanceTheme.colors.primary

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(backgroundColor)
                .padding(16.dp)
                .cornerRadius(24.dp)
        ) {
            // Header: Shop Name & MSMS Emblem
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "MSMS • ${shopName || "MSMS"}",
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = GlanceTheme.colors.onSurface
                    ),
                    modifier = GlanceModifier.defaultWeight()
                )
                Text(
                    text = "LIVE",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Main Stat: Today / Monthly Sales Revenue
            Text(
                text = "TODAY'S REVENUE",
                style = TextStyle(fontSize = 11.sp, color = GlanceTheme.colors.outline)
            )
            Text(
                text = "${currencySymbol} ${todaySalesAmount}",
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = GlanceTheme.colors.onSurface
                )
            )

            Spacer(modifier = GlanceModifier.height(10.dp))

            // Footer Metrics: Total Stock
            Row(modifier = GlanceModifier.fillMaxWidth()) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(text = "Stock (Kg)", style = TextStyle(fontSize = 10.sp))
                    Text(
                        text = "${totalStockKg} kg",
                        style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    )
                }
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(text = "Stock (Pcs)", style = TextStyle(fontSize = 10.sp))
                    Text(
                        text = "${totalStockPcs} pcs",
                        style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    )
                }
            }
        }
    }
}

class MSMSWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MSMSGlanceWidget()
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(nativeKotlinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white dark:bg-[#14201C] rounded-3xl p-5 border border-[#DCE4E1] dark:border-[#1E302B] shadow-sm relative overflow-hidden">
      {/* Decorative ambient top glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#007F73]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Widget Simulator Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 text-[#007F73] dark:text-[#00A896] flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100 leading-tight">
              {t.widgetPreviewTitle}
            </h3>
            <p className="text-[11px] text-[#626E6A] dark:text-stone-400">{t.widgetPreviewSubtitle}</p>
          </div>
        </div>

        {/* Daily vs Monthly Segmented Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#F0F4F2] dark:bg-[#101A17] rounded-xl text-xs font-medium">
          <button
            onClick={() => setWidgetMode('daily')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              widgetMode === 'daily'
                ? 'bg-[#007F73] text-white font-semibold shadow-sm'
                : 'text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-200'
            }`}
          >
            {t.dailyView}
          </button>
          <button
            onClick={() => setWidgetMode('monthly')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              widgetMode === 'monthly'
                ? 'bg-[#007F73] text-white font-semibold shadow-sm'
                : 'text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-200'
            }`}
          >
            {t.monthlyView}
          </button>
        </div>
      </div>

      {/* Interactive Android Material 3 Widget Card */}
      <div className="max-w-md mx-auto p-4 rounded-3xl bg-[#0E1513] text-white shadow-xl border border-[#1E302B] relative">
        {/* Subtle Android Widget pill tag & live indicator */}
        <div className="flex items-center justify-between text-xs mb-3 text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">
              MSMS · {shopName || (lang === 'bn' ? 'প্রধান দোকান' : 'Main Branch')}
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#00A896] bg-[#007F73]/20 px-2 py-0.5 rounded-md">
            {widgetMode === 'daily' ? 'DAILY WIDGET' : 'MONTHLY WIDGET'}
          </span>
        </div>

        {/* Main Stat display */}
        <div className="my-2">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
            {widgetMode === 'daily' ? t.widgetSalesLabel : t.widgetRevenueLabel}
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
            {formatCurrency(
              widgetMode === 'daily' ? todaySalesAmount : monthlySalesAmount,
              currencySymbol,
              lang
            )}
          </div>
        </div>

        {/* Stock Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-800/80">
          <div className="bg-white/5 rounded-2xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#007F73]/30 text-[#00A896] flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-stone-400 leading-none">
                {t.totalStockKg}
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {formatNumber(totalStockKg, lang)} {lang === 'bn' ? 'কেজি' : 'Kg'}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-stone-400 leading-none">
                {t.totalStockPieces}
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {formatNumber(totalStockPcs, lang)} {lang === 'bn' ? 'পিস' : 'Pcs'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom micro metadata */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-stone-500 font-mono">
          <span>{lang === 'bn' ? 'স্মার্টফোন স্ক্রিন উইজেট' : 'Android Glance 4x2'}</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Button to view / copy native Kotlin Glance code */}
      <div className="mt-3 text-center">
        <button
          onClick={() => setShowCodeModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007F73] dark:text-[#00A896] hover:underline py-1.5 px-3 rounded-xl hover:bg-[#007F73]/10 transition"
        >
          <Code className="w-3.5 h-3.5" />
          {t.nativeWidgetCode}
        </button>
      </div>

      {/* Native Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-stone-900 rounded-3xl p-6 text-white border border-stone-800 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h4 className="text-base font-bold text-amber-400">
                  MSMSGlanceWidget.kt
                </h4>
                <p className="text-xs text-stone-400">
                  Jetpack Compose Glance AppWidget for Android Studio
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t.copied : t.copyCode}
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs"
                >
                  {t.cancel}
                </button>
              </div>
            </div>

            <pre className="mt-4 p-4 bg-black/50 rounded-2xl overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed flex-1">
              {nativeKotlinCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
