import React from "react";
import { 
  AlertTriangle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import LegacyLayout from "../components/LegacyLayout";
import { canEditOrDelete, isL5OrAdmin, enforceEditOrDeletePermission } from "../lib/permissions";
import { getCachedSattaDiffs } from "../services/sattaCalculation";
import {
  SettlementDeductionItem,
  SettlementMaster,
  SettlementDetailColumn,
  emptyDetailColumn,
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
  calculateWeightedRatePerMT,
  initialMaster,
  parseDateOnly,
  formatToInputDate,
  isApmcExemptArea,
  isSettlementApmcExempt
} from "../types/settlement.types";

export {
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
  calculateWeightedRatePerMT,
  emptyDetailColumn,
  initialMaster,
  parseDateOnly,
  formatToInputDate,
  isApmcExemptArea,
  isSettlementApmcExempt
};
export type {
  SettlementDeductionItem,
  SettlementMaster,
  SettlementDetailColumn
};

import { useSettlementWorkflow, parseDateToObj, calculateDeliveryDelayDays } from "../hooks/useSettlementWorkflow";
export { parseDateToObj, calculateDeliveryDelayDays };

import SettlementRegisterView from "../components/settlement/SettlementRegisterView";
import SettlementMasterHeaderCard from "../components/settlement/SettlementMasterHeaderCard";
import SettlementMetricsRibbon from "../components/settlement/SettlementMetricsRibbon";
import SettlementValuationCard from "../components/settlement/SettlementValuationCard";
import SettlementSpecificationsGrid from "../components/settlement/SettlementSpecificationsGrid";
import SettlementPrintModal from "../components/settlement/SettlementPrintModal";
import SettlementAuditOverwriteModal from "../components/settlement/SettlementAuditOverwriteModal";
import SettlementDeleteModal from "../components/settlement/SettlementDeleteModal";
import SettlementSuccessModal from "../components/settlement/SettlementSuccessModal";

export default function MrSettlement({ 
  onClose, 
  onLogEvent 
}: { 
  onClose?: () => void; 
  onLogEvent?: (event: string, details: string) => void 
}) {
  const {
    viewMode,
    setViewMode,
    loading,
    searchFilter,
    setSearchFilter,
    errorMessage,
    successMessage,
    settledList,
    inspections,
    selectedPoNo,
    selectedPoData,
    poStats,
    customSettlementRecords,
    lastSyncTime,
    showSuccessAnim,
    paymentValidationInfo,
    showAuditOverwriteModal,
    setShowAuditOverwriteModal,
    auditOverwriteInfo,
    masterData,
    saudaDeductionRecord,
    detailCols,
    showAllSpecCols,
    setShowAllSpecCols,
    showAllDeductionCols,
    setShowAllDeductionCols,
    visibleSpecCols,
    visibleDeductionCols,
    showViewModal,
    setShowViewModal,
    viewModalData,
    setViewModalData,
    deleteConfirmMr,
    setDeleteConfirmMr,
    gradeMasterList,
    agencyMasterList,
    areaMasterList,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredSettles,
    poOptions,
    faOptionsForSelectedPo,
    handleManualRefresh,
    handlePoNoSelection,
    handleProceedWithMrNo,
    handleOpenViewSettlement,
    handleMasterChange,
    handleColChange,
    handleSaveSettlement,
    handleRevertSettlement,
    handleDeleteSettlement,
    executeDeleteSettlement,
    handleExportCsv,
    handleExportExcelForSelectedPo,
    setMasterData,
    setDetailCols,
    setErrorMessage,
    setSuccessMessage,
    setIsEdit,
    resolveGradeName,
  } = useSettlementWorkflow({ onClose, onLogEvent });

  return (
    <div className="w-full text-[11px] font-sans selection:bg-rose-100">
      {viewMode === "dashboard" ? (
        <SettlementRegisterView
          settledList={settledList}
          filteredSettles={filteredSettles}
          inspections={inspections}
          loading={loading}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          onOpenCreate={() => {
            setMasterData(initialMaster());
            setDetailCols([1, 2, 3, 4].map(emptyDetailColumn));
            setErrorMessage("");
            setSuccessMessage("");
            setIsEdit(false);
            setViewMode("entry");
          }}
          onExportCsv={handleExportCsv}
          onRefresh={handleManualRefresh}
          onOpenView={(mrNo) => handleOpenViewSettlement(mrNo)}
          onEdit={async (mrNo) => {
            if (!enforceEditOrDeletePermission("Edit")) return;
            setViewMode("entry");
            await handleProceedWithMrNo(mrNo);
          }}
          onDelete={(mrNo) => handleDeleteSettlement(mrNo)}
          onRevert={(mrNo, poNo) => handleRevertSettlement(mrNo, poNo)}
          canEditOrDelete={canEditOrDelete}
          isL5OrAdmin={isL5OrAdmin}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onClose={onClose}
        />
      ) : (
        <LegacyLayout title="SETTLEMENT" onClose={() => setViewMode("dashboard")}>
          {/* Synchronization success animation modal */}
          <SettlementSuccessModal
            show={showSuccessAnim}
            selectedPoNo={selectedPoNo}
          />

          {/* HEADER BAR */}
          <div className="bg-[#D94B5A] text-white px-6 py-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between border border-[#FBCFCB] gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-white tracking-wide">
                  SETTLEMENT
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3.5 py-1.5 bg-[#D94B5A] hover:bg-[#F7AFA8] text-[#FDE7E6] border border-[#FBCFCB] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                title="Back to Sauda Desk (Esc)"
                onClick={() => setViewMode("dashboard")}
              >
                <ArrowLeft className="h-4 w-4 text-amber-300" />
                <span>Back</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 font-sans relative">
            {/* Header Controls & Basic MR Arrival Identity Records */}
            <SettlementMasterHeaderCard
              masterData={masterData}
              handleMasterChange={handleMasterChange}
              selectedPoNo={selectedPoNo}
              handlePoNoSelection={handlePoNoSelection}
              handleProceedWithMrNo={handleProceedWithMrNo}
              poOptions={poOptions}
              faOptionsForSelectedPo={faOptionsForSelectedPo}
              handleManualRefresh={handleManualRefresh}
              handleOpenViewSettlement={handleOpenViewSettlement}
              handleExportExcelForSelectedPo={handleExportExcelForSelectedPo}
              loading={loading}
              paymentValidationInfo={paymentValidationInfo}
              detailCols={detailCols}
              calculateWeightedRatePerMT={calculateWeightedRatePerMT}
            />

            {/* Error & Success indicators */}
            {errorMessage && (
              <div className="bg-amber-50 border-2 border-amber-400 p-2 text-amber-900 font-bold flex flex-wrap items-center justify-between gap-2 rounded-sm shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-xs">{errorMessage}</span>
                </div>
                {errorMessage.includes("Validation Failure (Audit Block)") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (auditOverwriteInfo) {
                        setShowAuditOverwriteModal(true);
                      } else {
                        handleSaveSettlement(false);
                      }
                    }}
                    className="ml-auto bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black px-2.5 py-1 rounded shadow-xs uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Authorize &amp; Overwrite</span>
                  </button>
                )}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border-2 border-emerald-400 p-2 text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Main Double Panel Form Grid */}
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* LEFT SIDE PANEL: Valuation Card */}
              <div className="col-span-12 lg:col-span-4">
                <SettlementValuationCard
                  masterData={masterData}
                  handleMasterChange={handleMasterChange}
                  detailCols={detailCols}
                  calculateWeightedRatePerMT={calculateWeightedRatePerMT}
                  saudaDeductionRecord={saudaDeductionRecord}
                  selectedPoNo={selectedPoNo}
                  selectedPoData={selectedPoData}
                  errorMessage={errorMessage}
                  onExit={() => setViewMode("dashboard")}
                  onSave={() => handleSaveSettlement(false)}
                />
              </div>

              {/* RIGHT SIDE PANEL: Detailed 4-Column Core Specification Grids & Consignment Meter */}
              <div className="col-span-12 lg:col-span-8 space-y-3">
                <SettlementSpecificationsGrid
                  detailCols={detailCols}
                  handleColChange={handleColChange}
                  visibleSpecCols={visibleSpecCols}
                  visibleDeductionCols={visibleDeductionCols}
                  showAllSpecCols={showAllSpecCols}
                  setShowAllSpecCols={setShowAllSpecCols}
                  showAllDeductionCols={showAllDeductionCols}
                  setShowAllDeductionCols={setShowAllDeductionCols}
                  masterData={masterData}
                  selectedPoData={selectedPoData}
                  calculateWeightedRatePerMT={calculateWeightedRatePerMT}
                  gradeMasterList={gradeMasterList.map((g: any) => ({
                    code: String(g.grade_code || g.code || g.id || ""),
                    name: String(g.grade_name || g.name || g.grade || ""),
                  }))}
                  areaMasterList={areaMasterList
                    .map((a: any) => String(a.area_name || a.name || a.area || "").trim())
                    .filter(Boolean)}
                  agencyMasterList={agencyMasterList
                    .map((ag: any) => String(ag.agency_name || ag.name || ag.agency || "").trim())
                    .filter(Boolean)}
                  sattaDiffsList={getCachedSattaDiffs()}
                />

                {/* Dynamic P.O Quantities Reduction Panel & 1-to-N Consignment Meter placed cleanly in the gap */}
                <SettlementMetricsRibbon
                  poStats={poStats}
                  selectedPoNo={selectedPoNo}
                  selectedPoData={selectedPoData}
                  lastSyncTime={lastSyncTime}
                  inspections={inspections}
                  customSettlementRecords={customSettlementRecords}
                />
              </div>
            </div>
          </div>
        </LegacyLayout>
      )}

      {/* Print View Modal */}
      <SettlementPrintModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewModalData(null);
        }}
        viewModalData={viewModalData}
        resolveGradeName={(g: string) => resolveGradeName(g, gradeMasterList)}
      />

      {/* PO Audit Limit Overwrite Confirmation Modal */}
      <SettlementAuditOverwriteModal
        isOpen={showAuditOverwriteModal}
        onClose={() => setShowAuditOverwriteModal(false)}
        onConfirm={() => handleSaveSettlement(true)}
        loading={loading}
        auditOverwriteInfo={auditOverwriteInfo}
        fallbackMrNo={masterData.mr_no}
      />

      {/* Delete Confirmation Modal */}
      <SettlementDeleteModal
        mrNo={deleteConfirmMr}
        onClose={() => setDeleteConfirmMr(null)}
        onConfirm={(mrNo) => executeDeleteSettlement(mrNo)}
      />
    </div>
  );
}
