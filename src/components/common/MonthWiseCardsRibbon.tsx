import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Filter, Layers, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';
import { cn, formatIndianCurrency } from '../../lib/utils';

export interface CardMetricItem {
  label: string;
  value: string | number;
  isBadge?: boolean;
  badgeVariant?: 'amber' | 'emerald' | 'blue' | 'purple';
  isHighlight?: boolean;
  valueColor?: string;
}

export interface MonthWiseCardsRibbonProps<T = any> {
  records: T[];
  getDate: (record: T) => string | Date | null | undefined;
  selectedMonth: string | null; // e.g. '2026-04' or null
  onSelectMonth: (monthKey: string | null) => void;
  title?: string;
  unitLabel?: string;
  getCardMetrics?: (monthRecords: T[]) => CardMetricItem[];
  colorScheme?: 'purple' | 'emerald' | 'blue';
  className?: string;
}

export interface ParsedMonthItem {
  key: string;       // '2026-08'
  monthIndex: number;// 0-11
  monthName: string; // 'August'
  shortName: string; // 'AUG'
  year: number;      // 2026
}

export function parseMonthKey(dateVal: any): ParsedMonthItem | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Case 1: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthIndex = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    if (!isNaN(day) && !isNaN(monthIndex) && !isNaN(year) && monthIndex >= 0 && monthIndex <= 11) {
      const d = new Date(year, monthIndex, day);
      if (!isNaN(d.getTime())) {
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleString('en-US', { month: 'long' });
        const shortName = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        return { key, monthIndex, monthName, shortName, year };
      }
    }
  }

  // Case 2: YYYY-MM-DD or standard ISO
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    const shortName = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return { key, monthIndex, monthName, shortName, year };
  }

  return null;
}

export const MonthWiseCardsRibbon = <T,>({
  records = [],
  getDate,
  selectedMonth,
  onSelectMonth,
  title = "MONTH-WISE SUMMARY",
  unitLabel = "Vouchers",
  getCardMetrics,
  colorScheme = "purple",
  className = "",
}: MonthWiseCardsRibbonProps<T>) => {
  const [collapseMonthSummary, setCollapseMonthSummary] = useState(false);

  // Group records by year and month
  // Strict requirement: "If Any Month Have No Data Then This month Card Not Shown There"
  const { allGroupedMonths, availableYears, latestYear } = useMemo(() => {
    const map = new Map<string, {
      key: string;
      monthIndex: number;
      monthName: string;
      shortName: string;
      year: number;
      items: T[];
    }>();

    const yearsSet = new Set<number>();

    for (const r of records) {
      const d = getDate(r);
      const parsed = parseMonthKey(d);
      if (!parsed) continue;

      yearsSet.add(parsed.year);
      const existing = map.get(parsed.key);
      if (existing) {
        existing.items.push(r);
      } else {
        map.set(parsed.key, {
          key: parsed.key,
          monthIndex: parsed.monthIndex,
          monthName: parsed.monthName,
          shortName: parsed.shortName,
          year: parsed.year,
          items: [r],
        });
      }
    }

    const yrs = Array.from(yearsSet).sort((a, b) => b - a);
    const monthsList = Array.from(map.values()).filter(m => m.items.length > 0);
    // Sort chronological: from Jan to Dec or latest
    monthsList.sort((a, b) => a.key.localeCompare(b.key));

    const currentYr = new Date().getFullYear();
    const defaultYr = yrs.includes(currentYr) ? currentYr : (yrs[0] || currentYr);

    return {
      allGroupedMonths: monthsList,
      availableYears: yrs.length > 0 ? yrs : [currentYr],
      latestYear: defaultYr,
    };
  }, [records, getDate]);

  // Active Year state
  const [activeYear, setActiveYear] = useState<number>(latestYear);

  useEffect(() => {
    if (latestYear && !availableYears.includes(activeYear)) {
      setActiveYear(latestYear);
    }
  }, [latestYear, availableYears, activeYear]);

  // Filter months belonging to activeYear
  // ONLY months that have records > 0 are present in allGroupedMonths
  const activeMonthSummaries = useMemo(() => {
    return allGroupedMonths.filter(m => m.year === activeYear);
  }, [allGroupedMonths, activeYear]);

  // If no records in entire dataset or for any year, do not render
  if (allGroupedMonths.length === 0) {
    return null;
  }

  // Visual Theme Palettes (defaults to exact purple from the user's screenshot)
  const isPurple = colorScheme === 'purple';
  const isEmerald = colorScheme === 'emerald';

  const theme = isEmerald
    ? {
        bannerBg: 'bg-gradient-to-b from-emerald-50/70 to-slate-50 border-2 border-emerald-200/80',
        iconBg: 'bg-[#F7AFA8] text-emerald-200',
        titleColor: 'text-[#D94B5A]',
        labelColor: 'text-[#D94B5A]',
        selectBorder: 'border-2 border-[#F7AFA8] text-[#D94B5A] focus:ring-emerald-600',
        allBtnActive: 'bg-[#D94B5A] text-white border-[#D94B5A] shadow-xs',
        allBtnInactive: 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100',
        collapseBtn: 'border-emerald-300 hover:bg-emerald-100 text-emerald-900',
        cardActive: 'bg-gradient-to-br from-[#D94B5A] to-[#F7AFA8] text-white border-2 border-emerald-400 shadow-md ring-2 ring-emerald-400/40',
        cardInactive: 'bg-white border-2 border-emerald-200/90 hover:border-emerald-600 hover:shadow-md text-slate-800',
        dotInactive: 'bg-emerald-600',
        dotActive: 'bg-emerald-300',
        headerTextActive: 'text-emerald-100',
        headerTextInactive: 'text-emerald-950',
        footerActive: 'border-emerald-700 text-emerald-200',
        footerInactive: 'border-slate-200 text-emerald-700',
      }
    : {
        // EXACT match with user's Payment Section screenshot
        bannerBg: 'bg-gradient-to-b from-purple-50/70 to-slate-50 border-2 border-purple-200/80',
        iconBg: 'bg-purple-900 text-purple-200',
        titleColor: 'text-purple-950',
        labelColor: 'text-purple-950',
        selectBorder: 'border-2 border-purple-800 text-purple-950 focus:ring-purple-600',
        allBtnActive: 'bg-purple-800 text-white border-purple-900 shadow-xs',
        allBtnInactive: 'bg-white text-purple-900 border-purple-300 hover:bg-purple-100',
        collapseBtn: 'border-purple-300 hover:bg-purple-100 text-purple-900',
        cardActive: 'bg-gradient-to-br from-purple-900 to-indigo-950 text-white border-2 border-purple-400 shadow-md ring-2 ring-purple-400/40',
        cardInactive: 'bg-white border-2 border-purple-200/90 hover:border-purple-600 hover:shadow-md text-slate-800',
        dotInactive: 'bg-purple-600',
        dotActive: 'bg-emerald-400',
        headerTextActive: 'text-purple-100',
        headerTextInactive: 'text-purple-950',
        footerActive: 'border-purple-700 text-purple-200',
        footerInactive: 'border-slate-200 text-purple-700',
      };

  return (
    <div className={cn(theme.bannerBg, "rounded-2xl p-2.5 sm:p-3 shadow-sm space-y-2.5", className)}>
      {/* Compact Clean Control Toolbar (Matched with user's Payment screenshot) */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg shadow-xs", theme.iconBg)}>
            <Calendar className="w-4 h-4" />
          </div>
          <span className={cn("text-xs font-black uppercase tracking-wider", theme.titleColor)}>
            {title} {activeMonthSummaries.length > 0 ? `(${activeMonthSummaries.length} Active ${activeMonthSummaries.length === 1 ? 'Month' : 'Months'})` : ''}
          </span>
        </div>

        {/* Dynamic Year Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="summary-year-select" className={cn("text-xs font-bold flex items-center gap-1", theme.labelColor)}>
            <Filter className="w-3.5 h-3.5 text-purple-700" />
            <span>Year:</span>
          </label>
          <select
            id="summary-year-select"
            value={activeYear}
            onChange={(e) => {
              setActiveYear(Number(e.target.value));
              onSelectMonth(null);
            }}
            className={cn("h-8 px-2.5 bg-white rounded-lg text-xs font-mono font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2", theme.selectBorder)}
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr} className="font-mono font-bold">
                {yr}
              </option>
            ))}
          </select>

          {/* All Months Filter Pill */}
          <button
            type="button"
            onClick={() => onSelectMonth(null)}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
              selectedMonth === null ? theme.allBtnActive : theme.allBtnInactive
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Months</span>
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setCollapseMonthSummary(!collapseMonthSummary)}
            className={cn("h-8 px-2.5 bg-white border rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer", theme.collapseBtn)}
            title={collapseMonthSummary ? "Expand Month Cards" : "Collapse Month Cards"}
          >
            {collapseMonthSummary ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{collapseMonthSummary ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>

      {/* Month Cards Grid (SINGLE LINE ROW, ONLY ACTIVE MONTHS WITH DATA) */}
      {!collapseMonthSummary && (
        activeMonthSummaries.length > 0 ? (
          <div className="flex flex-row flex-nowrap overflow-x-auto gap-2.5 pb-2 pt-0.5 scrollbar-thin">
            {activeMonthSummaries.map((m) => {
              const isSelected = selectedMonth === m.key;
              const count = m.items.length;

              // Generate custom metric rows if provided, or default metrics
              const customMetrics: CardMetricItem[] = getCardMetrics
                ? getCardMetrics(m.items)
                : [
                    { label: `${unitLabel}:`, value: count, isHighlight: true }
                  ];

              return (
                <div
                  key={m.key}
                  onClick={() => {
                    if (isSelected) {
                      onSelectMonth(null);
                    } else {
                      onSelectMonth(m.key);
                    }
                  }}
                  className={cn(
                    "min-w-[185px] flex-1 max-w-[240px] shrink-0 rounded-xl p-2.5 transition-all flex flex-col justify-between cursor-pointer group active:scale-[0.98] select-none text-xs relative",
                    isSelected ? theme.cardActive : theme.cardInactive
                  )}
                  title={`Click to filter to ${m.monthName} ${m.year}`}
                >
                  <div>
                    {/* Card Header: Month Name + Year */}
                    <div className={cn(
                      "flex items-center justify-between gap-1 mb-1.5 pb-1 border-b",
                      isSelected ? "border-purple-700/60" : "border-slate-100"
                    )}>
                      <h3 className={cn(
                        "text-xs font-black uppercase tracking-wider flex items-center gap-1 truncate",
                        isSelected ? theme.headerTextActive : theme.headerTextInactive
                      )}>
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isSelected ? theme.dotActive : theme.dotInactive
                        )} />
                        <span>{m.shortName}</span>
                      </h3>
                      <span className={cn(
                        "text-[9px] font-mono font-semibold",
                        isSelected ? "text-purple-200" : "text-slate-500"
                      )}>
                        {m.year}
                      </span>
                    </div>

                    {/* Metric Rows */}
                    <div className="space-y-0.5">
                      {customMetrics.map((met, idx) => {
                        const isMainCount = idx === 0;

                        if (met.isBadge) {
                          return (
                            <div key={idx} className="flex items-center justify-between text-[10px] pt-1">
                              <span className={isSelected ? "text-purple-200 font-semibold" : "text-slate-500 font-semibold"}>
                                {met.label}
                              </span>
                              <span className={cn(
                                "font-mono font-black px-1.5 py-0.5 rounded text-[9px]",
                                isSelected
                                  ? "bg-amber-400 text-amber-950 font-black"
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                              )}>
                                {met.value}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center justify-between text-[10px] py-0.5",
                              isMainCount
                                ? cn("border-b text-[11px]", isSelected ? "border-purple-800/60" : "border-slate-100")
                                : cn("border-b border-dashed", isSelected ? "border-purple-800/60" : "border-slate-100")
                            )}
                          >
                            <span className={isSelected ? "text-purple-200 font-semibold" : "text-slate-500 font-semibold"}>
                              {met.label}
                            </span>
                            <span className={cn(
                              "font-mono truncate max-w-[105px]",
                              isMainCount ? "font-black text-xs" : "font-bold",
                              isSelected
                                ? (met.valueColor || "text-white")
                                : (met.valueColor || (isMainCount ? "text-purple-950" : "text-slate-800"))
                            )}>
                              {met.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer / Action Hint (Matches Payment screenshot: "View Month ->") */}
                  <div className={cn(
                    "mt-2 pt-1 border-t border-dashed text-[9px] font-bold flex items-center justify-between transition-transform",
                    isSelected ? theme.footerActive : theme.footerInactive
                  )}>
                    <span>{isSelected ? '✓ Active Filter' : 'View Month'}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-xs font-semibold text-slate-500 bg-white/70 rounded-xl border border-purple-100">
            No active records found for year {activeYear}.
          </div>
        )
      )}
    </div>
  );
};

export default MonthWiseCardsRibbon;
