/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { SaleRecord } from '../types';
import { TRANSLATIONS, formatCurrency, formatNumber } from '../locales/i18n';
import { TrendingUp, Award, Calendar, Sparkles } from 'lucide-react';

interface AnalyticsProps {
  sales: SaleRecord[];
  currencySymbol: string;
  lang: 'en' | 'bn';
}

export const SalesAnalyticsDiagram: React.FC<AnalyticsProps> = ({
  sales,
  currencySymbol,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  // 1. Calculate Weekly Day-by-Day Sales & Weekly Average
  const { daySalesData, weeklyAverage, maxDaySales } = useMemo(() => {
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

    // Group sales from past 7 days
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();

      const dayTotal = sales
        .filter(s => s.dateTime.startsWith(dateStr))
        .reduce((sum, s) => sum + s.totalAmount, 0);

      return {
        dateStr,
        dayName: lang === 'bn' ? dayNamesBn[dayIndex] : dayNamesEn[dayIndex],
        amount: dayTotal,
      };
    });

    const totalWeek = days.reduce((sum, d) => sum + d.amount, 0);
    const avg = totalWeek > 0 ? Math.round(totalWeek / 7) : 0;
    const max = Math.max(...days.map(d => d.amount), avg, 100);

    return { daySalesData: days, weeklyAverage: avg, maxDaySales: max };
  }, [sales, lang]);

  // 2. Identify Top 5 Peak Sales of the Month
  const top5Peaks = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const monthlySales = sales.filter(s => {
      const d = new Date(s.dateTime);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    // Sort descending by totalAmount
    const sorted = [...monthlySales].sort((a, b) => b.totalAmount - a.totalAmount);
    return sorted.slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* 1. WEEKLY AVERAGE SALES DIAGRAM */}
      <div className="bg-white dark:bg-[#14201C] rounded-3xl p-5 border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 dark:bg-teal-500/20 text-[#007F73] dark:text-teal-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100 leading-tight">
                {t.weeklyAverageTitle}
              </h3>
              <p className="text-[11px] text-[#626E6A] dark:text-stone-400">
                {t.comparisonToAvg}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#F0F4F2] dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] text-xs font-semibold text-[#17211F] dark:text-stone-200 flex items-center gap-2">
            <span className="text-[#626E6A] dark:text-stone-400">{t.weeklyAvgSales}:</span>
            <span className="font-mono text-[#007F73] dark:text-teal-400 font-extrabold">
              {formatCurrency(weeklyAverage, currencySymbol, lang)}
            </span>
          </div>
        </div>

        {/* Weekly Bar Chart Diagram */}
        <div className="pt-6 pb-2 px-2">
          <div className="relative h-44 flex items-end justify-between gap-2 sm:gap-4 border-b border-[#DCE4E1] dark:border-[#1E302B]">
            {/* Horizontal Line for Weekly Average Benchmark */}
            {weeklyAverage > 0 && (
              <div
                className="absolute left-0 right-0 border-b-2 border-dashed border-[#007F73]/60 dark:border-teal-400/60 z-10 flex items-center justify-end pr-2 pointer-events-none"
                style={{
                  bottom: `${Math.min(95, Math.max(10, (weeklyAverage / maxDaySales) * 100))}%`,
                }}
              >
                <span className="text-[10px] font-mono font-bold bg-[#007F73] dark:bg-teal-700 text-white px-2 py-0.5 rounded shadow-xs -mb-2">
                  AVG {formatCurrency(weeklyAverage, currencySymbol, lang)}
                </span>
              </div>
            )}

            {daySalesData.map((item, idx) => {
              const heightPct = maxDaySales > 0 ? (item.amount / maxDaySales) * 100 : 0;
              const isAboveAvg = item.amount >= weeklyAverage && weeklyAverage > 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="text-[10px] font-mono font-bold text-[#17211F] dark:text-stone-300 mb-1 opacity-80 group-hover:opacity-100 transition">
                    {item.amount > 0 ? formatNumber(Math.round(item.amount), lang) : '-'}
                  </div>

                  {/* Vertical bar */}
                  <div className="w-full max-w-[36px] bg-[#F0F4F2] dark:bg-[#101A17] rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isAboveAvg
                          ? 'bg-gradient-to-t from-[#007F73] to-[#00A896] dark:from-teal-700 dark:to-teal-400 shadow-xs'
                          : item.amount > 0
                          ? 'bg-[#DCE4E1] group-hover:bg-[#00A896]/50 dark:bg-stone-700 dark:group-hover:bg-teal-800'
                          : 'bg-[#E8EFEB] dark:bg-stone-800/60'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span className="text-xs font-semibold text-[#626E6A] dark:text-stone-300 mt-2">
                    {item.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. TOP 5 PEAK SALES OF EACH MONTH */}
      <div className="bg-white dark:bg-[#14201C] rounded-3xl p-5 border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#007F73] text-white flex items-center justify-center shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100 leading-tight">
              {t.top5PeaksTitle}
            </h3>
            <p className="text-[11px] text-[#626E6A] dark:text-stone-400">
              {lang === 'bn'
                ? 'উৎসব ও সাপ্তাহিক সর্বোচ্চ বিক্রির তালিকা'
                : 'Highest single sales orders recorded this month'}
            </p>
          </div>
        </div>

        {top5Peaks.length === 0 ? (
          <div className="p-8 text-center bg-[#F0F4F2] dark:bg-[#101A17] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B]">
            <Sparkles className="w-8 h-8 mx-auto text-[#00A896] dark:text-teal-400 mb-2" />
            <p className="text-xs text-[#626E6A] dark:text-stone-300 font-medium">
              {lang === 'bn'
                ? 'এখনও কোনো বিক্রির রেকর্ড নেই। বিক্রি শুরু হলে শীর্ষ ৫টি পিক সেলস এখানে প্রদর্শিত হবে।'
                : 'No sales records yet. When sales are logged, the top 5 peak sales will be highlighted here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {top5Peaks.map((peak, index) => {
              const rank = index + 1;
              const dateStr = new Date(peak.dateTime).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isFirst = rank === 1;

              return (
                <div
                  key={peak.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    isFirst
                      ? 'bg-[#F0F4F2] dark:bg-[#162420] hover:bg-[#E4ECE9] dark:hover:bg-[#1C2C27] border-[#007F73]/40 dark:border-teal-500/50 shadow-xs'
                      : 'bg-white dark:bg-[#101A17] hover:bg-[#F0F4F2] dark:hover:bg-[#162420] border-[#DCE4E1] dark:border-[#1E302B]'
                  }`}
                >
                  {/* Left: Rank Badge and Sweet Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                        isFirst
                          ? 'bg-[#007F73] text-white'
                          : rank === 2
                          ? 'bg-[#17211F] text-white dark:bg-stone-700'
                          : rank === 3
                          ? 'bg-[#626E6A] text-white dark:bg-stone-600'
                          : 'bg-[#DCE4E1] dark:bg-stone-800 text-[#17211F] dark:text-stone-300'
                      }`}
                    >
                      #{formatNumber(rank, lang)}
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-bold text-[#17211F] dark:text-stone-100 truncate flex items-center gap-1.5">
                        <span>{lang === 'bn' ? peak.productNameBn || peak.productName : peak.productName}</span>
                        {isFirst && (
                          <span className="text-[10px] bg-[#007F73]/15 dark:bg-teal-950/80 text-[#007F73] dark:text-teal-300 font-bold px-1.5 py-0.2 rounded-md">
                            ★ {lang === 'bn' ? 'শীর্ষ বিক্রি' : 'Top Record'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#626E6A] dark:text-stone-400 flex items-center gap-2 mt-0.5">
                        <span>
                          {formatNumber(peak.quantitySold, lang)} {peak.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'Kg') : (lang === 'bn' ? 'পিস' : 'Pcs')}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-[#626E6A] dark:text-stone-500" />
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Peak Sale Amount */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold font-mono text-[#007F73] dark:text-teal-400">
                      {formatCurrency(peak.totalAmount, currencySymbol, lang)}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      +{formatCurrency(peak.totalAmount - peak.costTotal, currencySymbol, lang)} {lang === 'bn' ? 'লাভ' : 'margin'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
