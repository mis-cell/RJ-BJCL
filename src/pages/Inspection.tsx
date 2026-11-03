import React from "react";
import { CheckCircle2 } from "lucide-react";
import LegacyLayout from "../components/LegacyLayout";
import PrintModal from "../components/PrintModal";
import InspectionPrintSlip from "../components/InspectionPrintSlip";
import { InspectionActionBar } from "../components/inspection/InspectionActionBar";
import { InspectionHeaderCard } from "../components/inspection/InspectionHeaderCard";
import { InspectionDeductionsTable } from "../components/inspection/InspectionDeductionsTable";
import { InspectionDetailsTable } from "../components/inspection/InspectionDetailsTable";
import { InspectionRegisterView } from "../components/inspection/InspectionRegisterView";
import { useInspectionLogic } from "../components/inspection/useInspectionLogic";
import {
  DeductionRow,
  MatchedAutoDeduction,
  MoistureLogicRule,
  InspectionMasterRecord,
  InspectionDetailRow,
  DetailFieldConfig,
  detailFieldsConfig,
  InspectionProps,
} from "../types/inspection.types";
import {
  calculateBaleWeightDeduction,
  calculateAllMatchingDeductions,
  computeDetailRowWeights,
  calculateQtyInMt,
  calculateRowAmount,
  extractMonthFromDate,
  sanitizeDate,
  calculateClaimMoisture,
  isAutoBlocked,
  getFieldInputStyle,
} from "../utils/inspectionCalculations";

export type {
  DeductionRow,
  MatchedAutoDeduction,
  MoistureLogicRule,
  InspectionMasterRecord,
  InspectionDetailRow,
  DetailFieldConfig,
  InspectionProps,
};
export {
  calculateBaleWeightDeduction,
  calculateAllMatchingDeductions,
  computeDetailRowWeights,
  calculateQtyInMt,
  calculateRowAmount,
  extractMonthFromDate,
  sanitizeDate,
  calculateClaimMoisture,
  isAutoBlocked,
  getFieldInputStyle,
  detailFieldsConfig,
};

export default function Inspection({ onNavigate, onClose }: InspectionProps) {
  const {
    records,
    filteredRecords,
    loading,
    searchQuery,
    setSearchQuery,
    selectedMonthFilter,
    setSelectedMonthFilter,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    setDatePreset,
    handleDatePresetChange,
    clearDateFilter,
    viewMode,
    setViewMode,
    toastMessage,
    isSaving,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    copyType,
    setCopyType,
    printingRecord,
    setPrintingRecord,
    printingDetails,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    headerForm,
    detailRows,
    deductionRows,
    deductionMasterList,
    totalInspections,
    avgMoisture,
    totalDeductions,
    pendingArrivalList,
    fetchInspectionRecords,
    handleHeaderChange,
    handleDetailChange,
    handleToggleExpand,
    handleDuplicateRow,
    handleDeleteRow,
    handleAddRow,
    handleOpenNewForm,
    handleEditRecord,
    handlePrintRecord,
    handleSaveForm,
    handleDeleteRecord,
    handleExportCsv,
    populateFromFinalArrival,
    handleAddDeductionRow,
    handleRemoveDeductionRow,
    handleDeductionChange,
    handleDeductionTypeChange
  } = useInspectionLogic();

  return (
    <LegacyLayout 
      title="Mill Inspection Information" 
      subtitle="Quality inspection register & entry module"
      onClose={onClose}
      activeNavTab="inspection"
    >
      <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-4 w-full pb-10 px-2 sm:px-4">

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* HEADER TOOLBAR - ONLY SHOWN IN FORM MODE */}
        {viewMode === "form" && (
          <InspectionActionBar
            viewMode={viewMode}
            onBack={() => setViewMode("dashboard")}
            onOpenNewForm={handleOpenNewForm}
            onRefresh={() => fetchInspectionRecords(true)}
            loading={loading}
          />
        )}

        {/* VIEW MODE SWITCH */}
        {viewMode === "dashboard" ? (
          <InspectionRegisterView
            records={records}
            filteredRecords={filteredRecords}
            selectedMonthFilter={selectedMonthFilter}
            setSelectedMonthFilter={setSelectedMonthFilter}
            loading={loading}
            totalInspections={totalInspections}
            avgMoisture={avgMoisture}
            totalDeductions={totalDeductions}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            datePreset={datePreset}
            onDatePresetChange={handleDatePresetChange}
            onClearDateFilter={clearDateFilter}
            sortField={sortField}
            sortOrder={sortOrder}
            onToggleSort={(field) => {
              if (field === sortField) {
                setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
              } else {
                setSortField(field as any);
                setSortOrder("desc");
              }
            }}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onExportCsv={handleExportCsv}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            onEditRecord={handleEditRecord}
            onPrintRecord={handlePrintRecord}
            onDeleteRecord={handleDeleteRecord}
            onOpenNewForm={handleOpenNewForm}
            onRefresh={() => fetchInspectionRecords(true)}
          />
        ) : (
          <div className="space-y-6">
            {/* HEADER / MILL INFORMATION SECTION */}
            <InspectionHeaderCard
              headerForm={headerForm}
              onHeaderChange={handleHeaderChange}
              pendingArrivalList={pendingArrivalList}
              onSelectPendingArrival={populateFromFinalArrival}
            />

            {/* DEDUCTIONS & PENALTIES CARD */}
            {(() => {
              const { matchedDeductions, baleAudit } = calculateAllMatchingDeductions(
                detailRows,
                headerForm,
                deductionMasterList
              );
              return (
                <InspectionDeductionsTable
                  deductionRows={deductionRows}
                  deductionMasterList={deductionMasterList}
                  totalDeductionAmount={headerForm.deduction_amount || 0}
                  matchedDeductions={matchedDeductions}
                  baleAudit={baleAudit}
                  onAddDeductionRow={handleAddDeductionRow}
                  onRemoveDeductionRow={handleRemoveDeductionRow}
                  onDeductionChange={handleDeductionChange}
                  onDeductionTypeChange={handleDeductionTypeChange}
                />
              );
            })()}

            {/* INSPECTION DETAILS WIDE TABLE SECTION */}
            <InspectionDetailsTable
              detailRows={detailRows}
              headerForm={headerForm}
              isSaving={isSaving}
              onDetailChange={handleDetailChange}
              onToggleExpand={handleToggleExpand}
              onDuplicateRow={handleDuplicateRow}
              onDeleteRow={handleDeleteRow}
              onAddRow={handleAddRow}
              onPrintRecord={() => handlePrintRecord(headerForm)}
              onSaveForm={handleSaveForm}
            />
          </div>
        )}

        {/* PRINT MODAL (MARKS & QUALITY RECEIVED - MILL COPY) */}
        <PrintModal
          isOpen={printingRecord !== null}
          onClose={() => setPrintingRecord(null)}
          title={`MARKS & QUALITY RECEIVED - M.R. NO: ${printingRecord?.mr_no || ""}`}
          copyType={copyType}
          setCopyType={setCopyType}
        >
          {printingRecord && (
            <InspectionPrintSlip
              master={printingRecord}
              details={printingDetails}
              copyType={copyType}
            />
          )}
        </PrintModal>

      </div>
    </LegacyLayout>
  );
}
