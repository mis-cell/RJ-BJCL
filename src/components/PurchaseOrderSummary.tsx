import React from 'react';
import { cn } from '../lib/utils';
import { usePurchaseOrderSummaryData } from './purchase-order-summary/usePurchaseOrderSummaryData';
import { PurchaseOrderSummaryDashboardView } from './purchase-order-summary/PurchaseOrderSummaryDashboardView';
import { 
  PurchaseOrderSummaryFilters, 
  PurchaseOrderReportSidebar 
} from './purchase-order-summary/PurchaseOrderSummaryFilters';
import { PurchaseOrderSummaryCharts } from './purchase-order-summary/PurchaseOrderSummaryCharts';
import { PurchaseOrderSummaryTable } from './purchase-order-summary/PurchaseOrderSummaryTable';
import { PurchaseOrderSummaryPrintModal } from './purchase-order-summary/PurchaseOrderSummaryPrintModal';
import { PO_REPORTS } from './purchase-order-summary/types';

export default function PurchaseOrderSummary({ refreshTrigger }: { refreshTrigger?: number }) {
  const {
    loading,
    hoveredBar,
    setHoveredBar,
    viewMode,
    setViewMode,
    financialYearFilter,
    setFinancialYearFilter,
    searchQuery,
    setSearchQuery,
    selectedSupplier,
    setSelectedSupplier,
    activePoReportKey,
    setActivePoReportKey,
    poReportYear,
    setPoReportYear,
    poReportSearch,
    setPoReportSearch,
    poReportStartDate,
    setPoReportStartDate,
    poReportEndDate,
    setPoReportEndDate,
    poReportSupplier,
    setPoReportSupplier,
    showPrintModal,
    setShowPrintModal,
    selectedMonthsForPrint,
    setSelectedMonthsForPrint,
    r1ChartMetric,
    setR1ChartMetric,
    fetchPurchaseOrders,
    groupedChartData,
    stats,
    financialYears,
    handleBarClick,
    displayedDetails,
    poFilteredByPeriod,
    reportOutput,
    handleExportCSV,
    reportSuppliersList
  } = usePurchaseOrderSummaryData(refreshTrigger);

  const clearAdvancedFilters = () => {
    setPoReportYear('ALL');
    setPoReportSearch('');
    setPoReportStartDate('');
    setPoReportEndDate('');
    setPoReportSupplier('ALL');
    setSelectedMonthsForPrint([]);
  };

  const activeReport = PO_REPORTS.find(r => r.key === activePoReportKey);

  return (
    <div
      className="space-y-4 p-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border border-slate-200 rounded-2xl shadow-sm"
      id="purchase-order-summary-report"
    >
      {/* Header View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 p-1 bg-emerald-950 rounded-xl shadow-sm w-fit">
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            className={cn(
              "px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wide",
              "rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
              viewMode === 'dashboard'
                ? "bg-white text-emerald-900 shadow-md"
                : "text-emerald-100 hover:bg-emerald-800 hover:text-white"
            )}
          >
            <span className="text-sm">📊</span>
            <span>PO Metrics Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('advanced_reports')}
            className={cn(
              "px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wide",
              "rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
              viewMode === 'advanced_reports'
                ? "bg-white text-emerald-900 shadow-md"
                : "text-emerald-100 hover:bg-emerald-800 hover:text-white"
            )}
          >
            <span className="text-sm">📋</span>
            <span>Advanced Reports</span>
            <span className="hidden sm:inline bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-full text-[8px] font-black">
              11
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 rounded-full shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
          </span>
          <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest whitespace-nowrap">
            Advanced PO Audit Engine
          </span>
        </div>
      </div>

      {/* RENDER 1: STANDARD DASHBOARD MODE */}
      {viewMode === 'dashboard' && (
        <PurchaseOrderSummaryDashboardView
          financialYearFilter={financialYearFilter}
          setFinancialYearFilter={setFinancialYearFilter}
          financialYears={financialYears}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          loading={loading}
          fetchPurchaseOrders={fetchPurchaseOrders}
          stats={stats}
          groupedChartData={groupedChartData}
          displayedDetails={displayedDetails}
          handleBarClick={handleBarClick}
          hoveredBar={hoveredBar}
          setHoveredBar={setHoveredBar}
        />
      )}

      {/* RENDER 2: ADVANCED REPORT ENGINE */}
      {viewMode === 'advanced_reports' && (
        <div className="space-y-4">
          <PurchaseOrderSummaryFilters
            poReportYear={poReportYear}
            setPoReportYear={setPoReportYear}
            financialYears={financialYears}
            poReportSupplier={poReportSupplier}
            setPoReportSupplier={setPoReportSupplier}
            reportSuppliersList={reportSuppliersList}
            poReportStartDate={poReportStartDate}
            setPoReportStartDate={setPoReportStartDate}
            poReportEndDate={poReportEndDate}
            setPoReportEndDate={setPoReportEndDate}
            poReportSearch={poReportSearch}
            setPoReportSearch={setPoReportSearch}
            activePoReportKey={activePoReportKey}
            setActivePoReportKey={setActivePoReportKey}
            handleExportCSV={handleExportCSV}
            fetchPurchaseOrders={fetchPurchaseOrders}
            loading={loading}
            onClearFilters={clearAdvancedFilters}
          />

          <div className="grid grid-cols-12 gap-4">
            <PurchaseOrderReportSidebar
              activePoReportKey={activePoReportKey}
              setActivePoReportKey={setActivePoReportKey}
            />

            <div className="col-span-12 lg:col-span-8 flex flex-col space-y-4">
              <div className="bg-white border border-gray-400 p-4 rounded-sm shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h3 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                      {activeReport?.name}
                    </h3>
                    <p className="text-[8.5px] text-gray-400 italic">
                      Live compiled statistics for selected month and financial year.
                    </p>
                  </div>
                  <div className="text-right flex flex-col leading-none font-mono text-[9px] font-black uppercase">
                    <span className="text-emerald-700">
                      Committed: {reportOutput.totalMT.toLocaleString()} MT
                    </span>
                    <span className="text-slate-400 mt-1">
                      Contracts: {reportOutput.totalCount} Matches
                    </span>
                  </div>
                </div>

                {activePoReportKey === 'r1' && (
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-sm self-start">
                    <span className="text-[8.5px] font-black text-slate-500 uppercase px-1">
                      Trend Metric:
                    </span>
                    {[
                      { key: 'combo', label: 'Combo Trend' },
                      { key: 'weight', label: 'Weight Volume (MT)' },
                      { key: 'capital', label: 'Capital Outlay (INR)' },
                      { key: 'count', label: 'Order Counts' }
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setR1ChartMetric(m.key as any)}
                        className={cn(
                          "px-2 py-0.5 text-[8.5px] font-black rounded-sm transition-colors border cursor-pointer",
                          r1ChartMetric === m.key
                            ? "bg-indigo-950 text-white border-indigo-950"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-gray-200"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                <PurchaseOrderSummaryCharts
                  activePoReportKey={activePoReportKey}
                  r1ChartMetric={r1ChartMetric}
                  chartType={reportOutput.chartType}
                  chartData={reportOutput.chartData}
                />
              </div>

              <PurchaseOrderSummaryTable
                reportOutput={reportOutput}
                activePoReportKey={activePoReportKey}
              />
            </div>
          </div>
        </div>
      )}

      {/* Print Slip Modal */}
      <PurchaseOrderSummaryPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        selectedMonthsForPrint={selectedMonthsForPrint}
        reportOutput={reportOutput}
        poFilteredByPeriod={poFilteredByPeriod}
        poReportSupplier={poReportSupplier}
      />
    </div>
  );
}
