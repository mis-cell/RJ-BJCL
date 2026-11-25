import React from "react";
import { 
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import {
  MATERIAL_MISMATCH_BLOCK_MESSAGE,
  navigateToMaterialMismatchRecord
} from "../lib/contractRelationshipEngine";
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
    poUnresolvedMismatches,
    activeMrMismatch,
    activeDataConflict,
    poClosureEligibility,
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

  const handleClosePrintModal = React.useCallback(() => {
    setShowViewModal(false);
    setViewModalData(null);
  }, [setShowViewModal, setViewModalData]);

  const handleResolvePrintGradeName = React.useCallback(
    (g: string) => resolveGradeName(g, gradeMasterList),
    [resolveGradeName, gradeMasterList]
  );

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

            {/* Layer 1: Historical / Cross-Module Data Integrity Conflict Banner */}
            {activeDataConflict && (
              <div className="bg-red-50 border-2 border-red-400 p-3 text-red-900 rounded-md shadow-xs flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-black uppercase tracking-wide flex items-center gap-2">
                    <span>Data Integrity Conflict — Audit Required</span>
                    <span className="bg-red-200 text-red-900 text-[10px] px-1.5 py-0.5 rounded font-mono">
                      Original PO Retained
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-red-800">{activeDataConflict}</p>
                </div>
              </div>
            )}

            {/* Layer 2: Active MR Unresolved Material Mismatch Blocking Banner + Direct Resolution Link */}
            {activeMrMismatch?.isUnresolved && (
              <div className="bg-rose-50 border-2 border-rose-400 p-3 text-rose-950 rounded-md shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-black uppercase tracking-wide flex items-center gap-2 flex-wrap">
                      <span>Material Mismatch — Settlement Blocked</span>
                      <span className="bg-rose-200 text-rose-900 text-[10px] px-1.5 py-0.5 rounded font-mono">
                        P.O: {activeMrMismatch.poNo} | M.R: {activeMrMismatch.mrNo}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-rose-900">{MATERIAL_MISMATCH_BLOCK_MESSAGE}</p>
                    {activeMrMismatch.mismatchReasons.length > 0 && (
                      <p className="text-[11px] text-rose-800">
                        <strong>Mismatched Field(s):</strong> {activeMrMismatch.mismatchReasons.join(" • ")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigateToMaterialMismatchRecord({
                      poNo: activeMrMismatch.poNo,
                      mrNo: activeMrMismatch.mrNo,
                      returnPage: "mr_settlement",
                      mismatchId: activeMrMismatch.mismatchId,
                    })
                  }
                  className="shrink-0 px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-black uppercase tracking-wide rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Resolve Material Mismatch</span>
                </button>
              </div>
            )}

            {/* Layer 4: PO-Level Unresolved Material Mismatches Summary (Other MRs on Same PO — Blocks Final PO Closure) */}
            {poUnresolvedMismatches.length > 0 && (!activeMrMismatch?.isUnresolved || poUnresolvedMismatches.length > 1) && (
              <div className="bg-amber-50 border border-amber-400 p-2.5 text-amber-950 rounded-md shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      P.O {selectedPoNo || masterData.po_no} has {poUnresolvedMismatches.length} MR(s) with Unresolved Material Mismatch — Final Contract Closure Blocked Until Resolved
                    </span>
                  </div>
                  {poClosureEligibility && !poClosureEligibility.canClosePo && (
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono">
                      Partial Settlement Only
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {poUnresolvedMismatches.map((mm) => (
                    <div
                      key={mm.mrNo}
                      className="flex items-center gap-2 bg-white border border-amber-300 rounded px-2 py-1 text-[11px]"
                    >
                      <span className="font-mono font-bold text-rose-800">{mm.mrNo}</span>
                      <span className="text-slate-600 truncate max-w-[240px]">
                        {mm.mismatchReasons[0] || "Material Mismatch"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          navigateToMaterialMismatchRecord({
                            poNo: mm.poNo,
                            mrNo: mm.mrNo,
                            returnPage: "mr_settlement",
                            mismatchId: mm.mismatchId,
                          })
                        }
                        className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Resolve</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        onClose={handleClosePrintModal}
        viewModalData={viewModalData}
        resolveGradeName={handleResolvePrintGradeName}
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
