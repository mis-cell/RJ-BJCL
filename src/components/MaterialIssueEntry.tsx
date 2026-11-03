import React from 'react';
import { 
  Check, 
  Printer, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { cn } from '../lib/utils';
import LegacyLayout from './LegacyLayout';
import { EditableComboBox } from './material-issue/EditableComboBox';
import { 
  RouteSelectorPanel, 
  RouteStatusBar, 
  GodownStorageHeader, 
  MillSellHeader, 
  FactoryIssueHeader 
} from './material-issue/IssueRouteHeaders';
import { LinkedFinalArrivalSection } from './material-issue/LinkedFinalArrivalSection';
import { MaterialIssueAllocationTable } from './material-issue/MaterialIssueAllocationTable';
import { useMaterialIssueEntryLogic } from './material-issue/useMaterialIssueEntryLogic';
import { MaterialIssueEntryProps } from './material-issue/entryTypes';

export { EditableComboBox };

interface EntryContainerProps {
  children: React.ReactNode;
  embedded?: boolean;
  issueRoute: 'godown' | 'mill' | 'factory' | null;
  handleFormCancel: () => void;
  setCurrentPage?: (p: any) => void;
}

function EntryContainer({
  children,
  embedded,
  issueRoute,
  handleFormCancel,
  setCurrentPage
}: EntryContainerProps) {
  const getRouteTitle = () => {
    if (issueRoute === 'godown') return "ISSUE TO GODOWN";
    if (issueRoute === 'mill') return "SELL (GODOWN TO FACTORY)";
    if (issueRoute === 'factory') return "GODOWN TO FACTORY";
    return "RAW JUTE MATERIAL ISSUE";
  };

  if (embedded) {
    return (
      <div className="border border-slate-300 rounded overflow-hidden flex flex-col bg-[#eae7e1] flex-1">
        <div className="bg-[#D94B5A] text-white font-mono px-3 py-1.5 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
          <span>📋 {getRouteTitle()}</span>
          <button 
            type="button" 
            onClick={handleFormCancel} 
            className="text-white hover:text-red-300 uppercase font-black text-[9px] cursor-pointer"
          >
            [ Back to List ]
          </button>
        </div>
        {children}
      </div>
    );
  }
  return (
    <LegacyLayout 
      title={getRouteTitle()} 
      subtitle={issueRoute ? undefined : 'Choose a Route'} 
      onBack={handleFormCancel}
      onClose={handleFormCancel}
      onMaximize={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }}
    >
      {children}
    </LegacyLayout>
  );
}

export function MaterialIssueEntry({
  formData,
  setFormData,
  items,
  setItems,
  issueRoute,
  setIssueRoute,
  finalArrivals,
  godownRecords = [],
  isEditMode,
  validationErrors,
  setValidationErrors,
  handleSave,
  handleFormCancel,
  showToast,
  successToast,
  setSuccessToast,
  containerRef,
  setCurrentPage,
  closePage,
  embedded = false
}: MaterialIssueEntryProps) {
  const {
    selectedArrivalId,
    setSelectedArrivalId,
    arrivalMeta,
    batchOptions,
    chooseRoute,
    changeRoute,
    loadFA,
    addRow,
    deleteRow,
    deleteLastRow,
    updateRow,
    splitTotals,
    recon,
    resetAll
  } = useMaterialIssueEntryLogic({
    formData,
    setFormData,
    items,
    setItems,
    issueRoute,
    setIssueRoute,
    finalArrivals,
    godownRecords,
    isEditMode,
    showToast
  });

  return (
    <EntryContainer 
      embedded={embedded} 
      issueRoute={issueRoute} 
      handleFormCancel={handleFormCancel}
      setCurrentPage={setCurrentPage}
    >
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 flex flex-col gap-4 font-sans text-xs text-slate-800 p-4 transition-all duration-300 overflow-y-auto bg-slate-50",
          embedded ? "max-h-[calc(100vh-210px)]" : ""
        )}
      >
        {/* Toast Alert */}
        {successToast && (
          <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-2 rounded flex items-center justify-between shadow-sm animate-fade-in">
            <span className="font-bold flex items-center gap-2 text-xs">
              <Check className="h-4 w-4 text-emerald-600" />
              {successToast}
            </span>
            <button 
              type="button" 
              onClick={() => setSuccessToast(null)} 
              className="text-emerald-800 font-bold hover:text-emerald-950 text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* 1. ROUTE SELECTOR (when no route is selected) */}
        {!issueRoute && (
          <RouteSelectorPanel onChooseRoute={chooseRoute} />
        )}

        {/* 2. ROUTE ACTIVE BAR */}
        {issueRoute && (
          <RouteStatusBar 
            issueRoute={issueRoute} 
            onChangeRoute={changeRoute} 
          />
        )}

        {/* 3. LINKED FINAL ARRIVAL (for Godown route) */}
        {issueRoute === 'godown' && (
          <LinkedFinalArrivalSection
            finalArrivals={finalArrivals}
            formData={formData}
            selectedArrivalId={selectedArrivalId}
            setSelectedArrivalId={setSelectedArrivalId}
            loadFA={loadFA}
            arrivalMeta={arrivalMeta}
          />
        )}

        {/* 4. ROUTE HEADER FORMS */}
        {issueRoute === 'godown' && (
          <GodownStorageHeader 
            formData={formData} 
            setFormData={setFormData} 
            godownRecords={godownRecords} 
          />
        )}

        {issueRoute === 'mill' && (
          <MillSellHeader 
            formData={formData} 
            setFormData={setFormData} 
            godownRecords={godownRecords} 
          />
        )}

        {issueRoute === 'factory' && (
          <FactoryIssueHeader 
            formData={formData} 
            setFormData={setFormData} 
            godownRecords={godownRecords}
            batchOptions={batchOptions}
          />
        )}

        {/* 5. ALLOCATION MATRIX TABLE */}
        {issueRoute && (
          <MaterialIssueAllocationTable
            issueRoute={issueRoute}
            items={items}
            addRow={addRow}
            deleteRow={deleteRow}
            deleteLastRow={deleteLastRow}
            updateRow={updateRow}
            splitTotals={splitTotals}
          />
        )}

        {/* 6. ACTION ZONE */}
        {issueRoute && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Top accent line */}
            <div
              className={cn(
                "h-1 w-full",
                issueRoute === 'godown'
                  ? "bg-gradient-to-r from-[#1c4587] via-[#3b82c4] to-[#1c4587]"
                  : issueRoute === 'mill'
                  ? "bg-gradient-to-r from-[#D94B5A] via-[#159c74] to-[#D94B5A]"
                  : "bg-gradient-to-r from-[#1c4587] via-[#3b82c4] to-[#1c4587]"
              )}
            />

            <div className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap bg-slate-50/70">
              {/* Information Section */}
              <div className="flex items-center gap-3 min-w-[250px] flex-1">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
                    issueRoute === 'godown'
                      ? "bg-[#eaf0f8] text-[#1c4587]"
                      : issueRoute === 'mill'
                      ? "bg-emerald-50 text-[#D94B5A]"
                      : "bg-[#eaf0f8] text-[#1c4587]"
                  )}
                >
                  <Check className="h-5 w-5 stroke-[2.5]" />
                </div>

                <div className="leading-tight">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                    Material Issue Control
                  </p>
                  <span className="mt-1 block text-[11px] font-medium text-slate-400">
                    Selecting a Code auto-fills the Batch Name. Totals split and reconcile automatically.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Clear */}
                <button 
                  type="button" 
                  onClick={resetAll}
                  className="group flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-100 active:scale-95 cursor-pointer"
                >
                  <span className="text-base leading-none transition-transform group-hover:rotate-[-45deg]">
                    ↻
                  </span>
                  <span>Clear</span>
                </button>

                {/* Print */}
                <button 
                  type="button" 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-[#b66b09] shadow-sm transition-all hover:bg-[#e0972f] hover:text-white hover:border-[#e0972f] active:scale-95 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Slip</span>
                </button>

                {/* Save */}
                <button 
                  type="button" 
                  onClick={handleSave}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-extrabold text-white shadow-md transition-all hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:scale-95 cursor-pointer",
                    issueRoute === 'godown'
                      ? "bg-[#1c4587] hover:bg-[#143160]"
                      : issueRoute === 'mill'
                      ? "bg-[#D94B5A] hover:bg-[#08523f]"
                      : "bg-[#1c4587] hover:bg-[#143160]"
                  )}
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>
                    {issueRoute === 'godown'
                      ? 'Save & Stack'
                      : issueRoute === 'mill'
                      ? 'Save & Sell (Factory to Factory)'
                      : 'Save & Issue'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntryContainer>
  );
}

export default MaterialIssueEntry;
