import React from "react";
import {
  ShieldCheck,
  Save,
  X,
  Printer,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit,
  User,
  Calendar
} from "lucide-react";
import LegacyLayout from "../components/LegacyLayout";
import PrintModal from "../components/PrintModal";
import InspectionPrintSlip from "../components/InspectionPrintSlip";
import { safeRenderText } from "../types/inspection.types";
import { initialMasterState, createEmptyRow } from "../services/inspectionService";
import { InspectionBasicInfoCard } from "../components/inspection/InspectionBasicInfoCard";
import { InspectionLorrySettlementCard } from "../components/inspection/InspectionLorrySettlementCard";
import { InspectionCommoditySpecsCard } from "../components/inspection/InspectionCommoditySpecsCard";
import { InspectionHistoricSearchModal } from "../components/inspection/InspectionHistoricSearchModal";
import { MaterialInspectionRegisterView } from "../components/inspection/MaterialInspectionRegisterView";
import { useMaterialInspectionLogic } from "../components/inspection/useMaterialInspectionLogic";

export default function MaterialInspection({
  onClose,
  onLogEvent,
}: {
  onClose?: () => void;
  onLogEvent?: (event: string, details: string) => void;
}) {
  const {
    brokers,
    suppliers,
    grades,
    areas,
    agencies,
    markas,
    arrivalVouchers,
    viewMode,
    setViewMode,
    isEditMode,
    setIsEditMode,
    loading,
    setLoading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    currentTab,
    setCurrentTab,
    selectedMrNos,
    setSelectedMrNos,
    printedInspections,
    printingBatch,
    setPrintingBatch,
    printingInspection,
    setPrintingInspection,
    printingInspectionDetails,
    showSearchModal,
    setShowSearchModal,
    savedInspections,
    searchFilter,
    setSearchFilter,
    finalArrivals,
    purchaseOrders,
    arrivalStartDate,
    setArrivalStartDate,
    arrivalEndDate,
    setArrivalEndDate,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pendingCurrentPage,
    setPendingCurrentPage,
    pendingPageSize,
    setPendingPageSize,
    expandedMrNo,
    setExpandedMrNo,
    expandedDetails,
    visibleColumns,
    setVisibleColumns,
    showWeightsBreakdown,
    setShowWeightsBreakdown,
    unitList,
    currentUser,
    masterData,
    setMasterData,
    detailsList,
    setDetailsList,
    qualityMatrix,
    show3rdAnd4th,
    setShowAllFourSpecs,
    updateMatrixVal,
    totalChallanGrossWt,
    totalReceiptGrossWt,
    paymentOpsInfo,
    syncAdvanceFromPaymentOperations,
    handleSyncSettlementAmount,
    loadInspectionIntoForm,
    handleAutoFillFromVoucher,
    handleMasterChange,
    handleDetailChange,
    handleEditAction,
    deleteInspectionPermanently,
    handleCancelAction,
    handleSaveAction,
    handleToggleExpand,
    filteredSavedInspections,
    filteredPendingMrList,
    handleBatchPrint,
    handlePreparePrintInspection,
    handleExportToExcel,
    handleRefreshDatabase,
    loadSavedInspectionsList
  } = useMaterialInspectionLogic(onLogEvent);

  if (viewMode === "dashboard") {
    return (
      <LegacyLayout
        title="Inspection"
        subtitle=""
        onClose={onClose}
      >
        <MaterialInspectionRegisterView
          savedInspections={savedInspections}
          filteredSavedInspections={filteredSavedInspections}
          filteredPendingMrList={filteredPendingMrList}
          arrivalVouchers={arrivalVouchers}
          purchaseOrders={purchaseOrders}
          finalArrivals={finalArrivals}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          arrivalStartDate={arrivalStartDate}
          setArrivalStartDate={setArrivalStartDate}
          arrivalEndDate={arrivalEndDate}
          setArrivalEndDate={setArrivalEndDate}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          selectedMrNos={selectedMrNos}
          setSelectedMrNos={setSelectedMrNos}
          printedInspections={printedInspections}
          expandedMrNo={expandedMrNo}
          setExpandedMrNo={setExpandedMrNo}
          expandedDetails={expandedDetails}
          handleToggleExpand={handleToggleExpand}
          loadInspectionIntoForm={loadInspectionIntoForm}
          setIsEditMode={setIsEditMode}
          setViewMode={setViewMode}
          handlePreparePrintInspection={handlePreparePrintInspection}
          handleBatchPrint={handleBatchPrint}
          handleExportCsv={handleExportToExcel}
          handleRefreshDatabase={handleRefreshDatabase}
          deleteInspectionPermanently={deleteInspectionPermanently}
          loadSavedInspectionsList={loadSavedInspectionsList}
          setSuccessMessage={setSuccessMessage}
          setLoading={setLoading}
          loading={loading}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          pendingCurrentPage={pendingCurrentPage}
          setPendingCurrentPage={setPendingCurrentPage}
          pendingPageSize={pendingPageSize}
          setPendingPageSize={setPendingPageSize}
          initialMasterState={initialMasterState}
          createEmptyRow={createEmptyRow}
          setMasterData={setMasterData}
          setDetailsList={setDetailsList}
          setErrorMessage={setErrorMessage}
          handleAutoFillFromVoucher={handleAutoFillFromVoucher}
        />

        <PrintModal
          isOpen={printingInspection !== null}
          onClose={() => setPrintingInspection(null)}
          title={`QUALITY INSPECTION REPORT - M.R. NO: ${printingInspection?.mr_no}`}
        >
          {printingInspection && (
            <InspectionPrintSlip
              master={printingInspection}
              details={printingInspectionDetails}
            />
          )}
        </PrintModal>

        <PrintModal
          isOpen={printingBatch !== null}
          onClose={() => setPrintingBatch(null)}
          title={`BATCH QUALITY INSPECTION REPORT - ${printingBatch?.length} RECORDS`}
        >
          {printingBatch && (
            <div className="flex flex-col gap-8 print:gap-0 print:block">
              {printingBatch.map((item) => (
                <div key={item.master.mr_no} className="print:break-after-page print:page-break-after-always">
                  <InspectionPrintSlip
                    master={item.master}
                    details={item.details}
                  />
                </div>
              ))}
            </div>
          )}
        </PrintModal>
      </LegacyLayout>
    );
  }

  return (
    <LegacyLayout
      title="Material Quality audit system"
      subtitle="Mill Inspection Record Ledger"
      onClose={() => setViewMode("dashboard")}
    >
      <div className="w-full px-2 space-y-4 font-bold text-[11px] text-slate-800">
        {/* State Alerts display ribbon */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 p-2 text-red-800 font-extrabold rounded-sm flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-red-600 animate-pulse" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-300 p-2 text-emerald-800 font-extrabold rounded-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* --- Datalists for autocompletion --- */}
        <datalist id="brokersList">
          {brokers.map((b, idx) => (
            <option key={idx} value={safeRenderText(b.name, "")} />
          ))}
        </datalist>
        <datalist id="suppliersList">
          {suppliers.map((s, idx) => (
            <option key={idx} value={safeRenderText(s.name, "")} />
          ))}
        </datalist>
        <datalist id="gradesList">
          {grades.map((g, idx) => (
            <option key={idx} value={safeRenderText(g.code || g.name, "")} />
          ))}
        </datalist>
        <datalist id="areasList">
          {areas.map((a, idx) => (
            <option key={idx} value={safeRenderText(a.name, "")} />
          ))}
        </datalist>
        <datalist id="agenciesList">
          {agencies.map((ag, idx) => (
            <option key={idx} value={safeRenderText(ag.name, "")} />
          ))}
        </datalist>
        <datalist id="markasList">
          {markas.map((m, idx) => (
            <option key={idx} value={safeRenderText(m.name, "")} />
          ))}
        </datalist>
        <datalist id="arrivalPoList">
          {arrivalVouchers
            .filter((v) => {
              if (!v.po_no) return false;
              const arrivalVal = safeRenderText(v.temporary_arrival_no || v.arrival_no || v.amad_no, "").trim().toUpperCase();
              if (!arrivalVal) return false;
              return true;
            })
            .map((v, idx) => (
              <option
                key={idx}
                value={safeRenderText(v.po_no, "")}
              >{`P.O. #${safeRenderText(v.po_no, "")} | Inspection MR / Arr: ${safeRenderText(v.mr_no || v.temporary_arrival_no || v.arrival_no, "")} | Supplier: ${safeRenderText(v.supplier || v.supplier_name, "")}`}</option>
            ))}
        </datalist>
        <datalist id="arrivalNoList">
          {arrivalVouchers
            .filter((v) => {
              const arrivalVal = safeRenderText(v.temporary_arrival_no || v.arrival_no || v.amad_no, "").trim().toUpperCase();
              if (!arrivalVal) return false;
              return true;
            })
            .map((v, idx) => {
              const arrivalVal = safeRenderText(v.temporary_arrival_no || v.arrival_no || v.amad_no, "");
              return (
                <option
                  key={idx}
                  value={arrivalVal}
                >{`Inspection MR / Arr No: ${arrivalVal} | P.O. #${safeRenderText(v.po_no, "")} | Supplier: ${safeRenderText(v.supplier || v.supplier_name, "")}`}</option>
              );
            })}
        </datalist>

        {/* MAIN VISUAL CARD CONTAINER */}
        <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-4 w-full pb-10">
          {/* HEADER BAR */}
          <div className="bg-[#D94B5A] text-white px-6 py-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between border border-[#FBCFCB] gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D94B5A]/40 border border-[#FBCFCB]/40 flex items-center justify-center text-[#FDE7E6] shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-white tracking-wide">
                  INSPECTION CHECKLIST
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3.5 py-1.5 bg-[#D94B5A] hover:bg-[#D94B5A] text-amber-300 border border-[#F06D6C] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                title="Back to Sauda Desk (Esc)"
                onClick={() => setViewMode("dashboard")}
              >
                <ArrowLeft className="h-4 w-4 text-amber-300" />
                <span>Back</span>
              </button>
              
              <button
                type="button"
                onClick={() => handlePreparePrintInspection(masterData)}
                className="px-4 py-2 bg-[#0b2415]/80 hover:bg-[#123920] border border-emerald-400/50 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* CARD 1: BASIC INFORMATION */}
          <InspectionBasicInfoCard
            masterData={masterData}
            isEditMode={isEditMode}
            handleMasterChange={handleMasterChange}
            setMasterData={setMasterData}
            handleAutoFillFromVoucher={handleAutoFillFromVoucher}
            savedInspections={savedInspections}
            detailsList={detailsList}
            handleDetailChange={handleDetailChange}
            totalChallanGrossWt={totalChallanGrossWt}
            totalReceiptGrossWt={totalReceiptGrossWt}
            showWeightsBreakdown={showWeightsBreakdown}
            setShowWeightsBreakdown={setShowWeightsBreakdown}
            unitList={unitList}
          />

          {/* CARD 2: LORRY & SETTLEMENT DETAILS */}
          <InspectionLorrySettlementCard
            masterData={masterData}
            isEditMode={isEditMode}
            handleMasterChange={handleMasterChange}
            syncAdvanceFromPaymentOperations={syncAdvanceFromPaymentOperations}
            paymentOpsInfo={paymentOpsInfo}
            handleSyncSettlementAmount={handleSyncSettlementAmount}
          />

          {/* CARD 3: INSPECTION DETAILS */}
          <InspectionCommoditySpecsCard
            isEditMode={isEditMode}
            show3rdAnd4th={show3rdAnd4th}
            setShowAllFourSpecs={setShowAllFourSpecs}
            detailsList={detailsList}
            handleDetailChange={handleDetailChange}
            qualityMatrix={qualityMatrix}
            updateMatrixVal={updateMatrixVal}
            masterData={masterData}
            setMasterData={setMasterData}
          />

          {/* BOTTOM ACTION BAR */}
          <div className="bg-slate-100 rounded-xl border border-slate-300 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveAction(false)}
                disabled={loading || !isEditMode}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? "Saving..." : "Save"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAction(true)}
                disabled={loading || !isEditMode}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                onClick={handleCancelAction}
                disabled={loading}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleEditAction}
                  disabled={loading}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Form</span>
                </button>
              )}
            </div>

            {/* Right Metadata */}
            <div className="flex items-center gap-6 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Created By :</span>
                <span className="font-bold text-slate-800">{currentUser || "System"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Created At :</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Historic search modal */}
        <InspectionHistoricSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          filteredSavedInspections={filteredSavedInspections}
          loadInspectionIntoForm={loadInspectionIntoForm}
          setIsEditMode={setIsEditMode}
          setViewMode={setViewMode}
        />

        <PrintModal
          isOpen={printingInspection !== null}
          onClose={() => setPrintingInspection(null)}
          title={`QUALITY INSPECTION REPORT - M.R. NO: ${printingInspection?.mr_no}`}
        >
          {printingInspection && (
            <InspectionPrintSlip
              master={printingInspection}
              details={printingInspectionDetails}
            />
          )}
        </PrintModal>
      </div>
    </LegacyLayout>
  );
}
