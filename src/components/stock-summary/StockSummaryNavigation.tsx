import React from 'react';
import { cn } from '../../lib/utils';
import { StockTab, StockSubTab, MetricCalculationMode } from './types';

export interface StockSummaryNavigationProps {
  activeTab: StockTab;
  setActiveTab: (tab: StockTab) => void;
  stockSubTab: StockSubTab;
  setStockSubTab: (subTab: StockSubTab) => void;
  startDateFilter: string;
  setStartDateFilter: (val: string) => void;
  endDateFilter: string;
  setEndDateFilter: (val: string) => void;
  formatDateBeautiful: (dateStr: string) => string;
  metricCalculationMode: MetricCalculationMode;
  setMetricCalculationMode: (mode: MetricCalculationMode) => void;
}

export const StockSummaryNavigation: React.FC<StockSummaryNavigationProps> = ({
  activeTab,
  setActiveTab,
  stockSubTab,
  setStockSubTab,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  formatDateBeautiful,
  metricCalculationMode,
  setMetricCalculationMode
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Main Navigation */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Navigation Area */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Opening Stock */}
          <button
            onClick={() => setActiveTab('opening')}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer",
              activeTab === 'opening'
                ? "border-[#1c4587] bg-[#1c4587] text-white shadow-md"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#1c4587]/40 hover:bg-blue-50 hover:text-[#1c4587]"
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-sm">
              📋
            </span>
            <span>Stock Inventory</span>
          </button>

          {/* Live Inventory */}
          <button
            onClick={() => setActiveTab('live')}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer",
              activeTab === 'live'
                ? "border-[#D94B5A] bg-[#D94B5A] text-white shadow-md"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#D94B5A]/40 hover:bg-emerald-50 hover:text-[#D94B5A]"
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-sm">
              📉
            </span>
            <span>Live Inventory</span>
          </button>

          {/* Opening Sub Tabs */}
          {activeTab === 'opening' && (
            <div className="flex flex-wrap items-center gap-1 border-l border-slate-200 pl-2">
              {/* Godown Wise Stock */}
              <button
                onClick={() => setStockSubTab('opening')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-[10px] font-bold uppercase transition-all cursor-pointer",
                  stockSubTab === 'opening'
                    ? "bg-blue-50 text-[#1c4587] ring-1 ring-[#1c4587]/20 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <span>📦</span>
                <span>Godown Stocks</span>
              </button>

              {/* Monthly Opening Stock */}
              <button
                onClick={() => setStockSubTab('closing')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-[10px] font-bold uppercase transition-all cursor-pointer",
                  stockSubTab === 'closing'
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                <span>🔴</span>
                <span>Monthly Opening Stock</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 lg:ml-auto">
          {/* Stock Period */}
          <div className="flex items-center gap-2 border-r border-slate-200 pr-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-xs">
              📅
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                Stock Period
              </span>

              {startDateFilter || endDateFilter ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-black text-[#1c4587] shadow-xs">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                    {startDateFilter
                      ? formatDateBeautiful(startDateFilter)
                      : 'Start'}
                    <span className="text-slate-400">→</span>
                    {endDateFilter
                      ? formatDateBeautiful(endDateFilter)
                      : 'End'}
                  </span>

                  <button
                    onClick={() => {
                      setStartDateFilter('');
                      setEndDateFilter('');
                    }}
                    className="rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                    title="Clear date filter"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                  ALL HISTORY
                </span>
              )}
            </div>
          </div>

          {/* Calculation Mode */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-xs">
              📊
            </div>

            <div className="flex flex-col leading-tight">
              <span className="mb-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                Calculation Mode
              </span>

              <div className="inline-flex w-fit rounded-md border border-slate-200 bg-white p-0.5 shadow-xs">
                {/* As Of */}
                <button
                  onClick={() => setMetricCalculationMode('cumulative')}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-[9px] font-black uppercase transition-all cursor-pointer",
                    metricCalculationMode === 'cumulative'
                      ? "bg-[#1c4587] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                  title="True cumulative stock balance as of end period"
                >
                  📈
                  <span>As-Of</span>
                </button>

                {/* Period Activity */}
                <button
                  onClick={() => setMetricCalculationMode('period')}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-[9px] font-black uppercase transition-all cursor-pointer",
                    metricCalculationMode === 'period'
                      ? "bg-[#D94B5A] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                  title="Only activity/transactions occurred inside selected period"
                >
                  📊
                  <span>Period Activity</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
