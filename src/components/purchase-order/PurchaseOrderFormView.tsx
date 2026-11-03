import React from 'react';
import { FileText, ArrowLeft, Save, Edit, X } from 'lucide-react';
import LegacyLayout, { LegacyFieldset } from '../LegacyLayout';
import { PurchaseOrderFormHeader } from './PurchaseOrderFormHeader';
import { PoCalculationModal } from './PoCalculationModal';
import { PoItemsGrid } from './PoItemsGrid';
import { canEditOrDelete } from '../../lib/permissions';
import { PoFormData, PoCalcData } from '../../types/purchaseOrder';

interface PurchaseOrderFormViewProps {
  isArchiveView: boolean;
  isTempPo: boolean;
  formData: PoFormData;
  setFormData: React.Dispatch<React.SetStateAction<PoFormData>>;
  calcData: PoCalcData;
  setCalcData: React.Dispatch<React.SetStateAction<PoCalcData>>;
  isCalcOpen: boolean;
  setIsCalcOpen: (open: boolean) => void;
  selectedItemSrl: number | null;
  setSelectedItemSrl: (srl: number | null) => void;
  isSaudaActive: boolean;
  poList: any[];
  brokerList: any[];
  supplierList: any[];
  areaList: any[];
  unitList: string[];
  displaySaudas: any[];
  gradeList: any[];
  agencyList: any[];
  markaList: any[];
  sattaBaseRates: any[];
  sattaCalculatedRates: any[];
  sattaDifferentials: any[];
  loading: boolean;
  getCropYear: () => string;
  generateNextPtfNo: (list?: any[]) => string;
  recalculateAllRates: (...args: any[]) => any[];
  lookupSattaBaseRate: (dateStr: string, bases?: any[]) => string;
  getSattaRateForRow: (...args: any[]) => number | null;
  handlePurchaseUnitChange: (name: string, code: string) => void;
  handleSaudaSelect: (saudaNo: string) => void;
  handleAddItem: () => void;
  handleDeleteItem: () => void;
  handleSyncFromSource: () => void;
  handleCalculateOk: () => void;
  handleSave: () => void;
  handleGlobalAmend: () => void;
  setViewMode: (mode: 'register' | 'form') => void;
  poFormRef: React.RefObject<HTMLDivElement | null>;
}

export const PurchaseOrderFormView: React.FC<PurchaseOrderFormViewProps> = ({
  isArchiveView,
  isTempPo,
  formData,
  setFormData,
  calcData,
  setCalcData,
  isCalcOpen,
  setIsCalcOpen,
  selectedItemSrl,
  setSelectedItemSrl,
  isSaudaActive,
  poList,
  brokerList,
  supplierList,
  areaList,
  unitList,
  displaySaudas,
  gradeList,
  agencyList,
  markaList,
  sattaBaseRates,
  sattaCalculatedRates,
  sattaDifferentials,
  loading,
  getCropYear,
  generateNextPtfNo,
  recalculateAllRates,
  lookupSattaBaseRate,
  getSattaRateForRow,
  handlePurchaseUnitChange,
  handleSaudaSelect,
  handleAddItem,
  handleDeleteItem,
  handleSyncFromSource,
  handleCalculateOk,
  handleSave,
  handleGlobalAmend,
  setViewMode,
  poFormRef
}) => {
  return (
    <LegacyLayout 
      title={isArchiveView ? "FINAL P.O ARCHIVE ENTRY" : (isTempPo ? "SAUDA CHECK POINT ENTRY" : "PURCHASE ORDER ENTRY")} 
      subtitle={formData.no ? `Editing Order #${formData.no}` : ""} 
      onClose={() => setViewMode('register')}
    >
      <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-4 w-full pb-10">
        
        {/* Header Bar - Matching Mill Inspection Aesthetics (Compact Height) */}
        <div className="bg-[#D94B5A] text-white px-5 py-2.5 rounded-lg shadow-md flex flex-wrap items-center justify-between border border-[#F06D6C] gap-3">
          {/* Left Badge & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800/40 border border-emerald-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="bg-[#0b2415] text-amber-300 text-[10px] font-extrabold px-2 py-0 rounded border border-emerald-700/60 tracking-wider w-fit">
                {formData.is_ptf ? "PTF Direct Entry" : "Sauda Linked"}
              </span>
              <h1 className="text-base md:text-lg font-black uppercase tracking-wider text-amber-300 drop-shadow mt-0.5 leading-tight">
                {formData.no ? `EDIT P.O #${formData.no}` : (isTempPo ? "NEW SAUDA CHECK POINT ENTRY" : "CREATE NEW PURCHASE ORDER (P.O)")}
              </h1>
              <p className="text-[11px] font-bold text-amber-300 tracking-wide mt-0.5 flex items-center gap-1.5 leading-tight">
                <span>Session: BJCL/2026-2027/</span>
                {formData.no ? (
                  <>
                    <span>•</span>
                    <span>Order No: #{formData.no}</span>
                  </>
                ) : formData.is_ptf ? (
                  <>
                    <span>•</span>
                    <span>PTF Direct Entry Mode</span>
                  </>
                ) : isTempPo ? null : (
                  <>
                    <span>•</span>
                    <span>Sauda Linked Contract Entry</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="px-3 py-1.5 bg-[#0b2415]/80 hover:bg-[#123920] border border-emerald-400/50 rounded-md text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Close P.O Form & Return to Register (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div ref={poFormRef as React.RefObject<HTMLDivElement>} className="space-y-5 w-full">
        
          {/* Modular Calculator Helper Modal */}
          <PoCalculationModal
            isOpen={isCalcOpen}
            onClose={() => setIsCalcOpen(false)}
            onApply={handleCalculateOk}
            calcData={calcData}
            setCalcData={setCalcData}
            isPtf={formData.is_ptf}
            purchaseUnitName={formData.purchase_unit_name}
            weightUnitKgs={formData.weight_unit_kgs}
            unitList={unitList}
            onUnitTypeChange={(name, code) => handlePurchaseUnitChange(name, code)}
          />

          <PurchaseOrderFormHeader
            formData={formData}
            setFormData={setFormData}
            isSaudaActive={isSaudaActive}
            isTempPo={isTempPo}
            poList={poList}
            brokerList={brokerList}
            supplierList={supplierList}
            areaList={areaList}
            unitList={unitList}
            displaySaudas={displaySaudas}
            handleSaudaSelect={handleSaudaSelect}
            getCropYear={getCropYear}
            generateNextPtfNo={generateNextPtfNo}
            recalculateAllRates={recalculateAllRates}
            sattaBaseRates={sattaBaseRates}
            sattaCalculatedRates={sattaCalculatedRates}
            sattaDifferentials={sattaDifferentials}
            handlePurchaseUnitChange={handlePurchaseUnitChange}
            setCalcData={setCalcData}
            setIsCalcOpen={setIsCalcOpen}
            lookupSattaBaseRate={lookupSattaBaseRate}
          />

          <LegacyFieldset legend="Purchase Order Details (Items Table Matrix)">
            <PoItemsGrid
              formData={formData}
              setFormData={setFormData}
              selectedItemSrl={selectedItemSrl}
              setSelectedItemSrl={setSelectedItemSrl}
              gradeList={gradeList}
              agencyList={agencyList}
              markaList={markaList}
              handleAddItem={handleAddItem}
              handleDeleteItem={handleDeleteItem}
              handleSyncFromSource={handleSyncFromSource}
              getSattaRateForRow={getSattaRateForRow}
              getCropYear={getCropYear}
              isSaudaActive={isSaudaActive}
            />
          </LegacyFieldset>

          {/* Global Actions Block inside Form */}
          <div className="bg-white border border-slate-200 rounded-[18px] p-4 shadow-xs flex flex-wrap justify-center items-center gap-3">
             
             <button 
               onClick={handleSave} 
               disabled={loading}
               className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
               title="Validate and save changes to DB" 
             >
               <Save className="w-4 h-4 text-emerald-200" /> {loading ? "Saving..." : "Save P.O"}
             </button>

             <button 
               onClick={() => setViewMode('register')} 
               className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-[#F7AFA8] px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
               title="Switch back to records ledger overview" 
             >
               <FileText className="w-4 h-4 text-slate-600" /> View All P.O
             </button>

             {canEditOrDelete() && (
               <button 
                 onClick={handleGlobalAmend} 
                 className="bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 hover:border-amber-400 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                 title="Revise PO number and increment amend counter" 
               >
                 <Edit className="w-4 h-4 text-amber-700" /> Amend / Revise
               </button>
             )}

             <button 
               onClick={() => {
                 if(confirm("Discard active edits? Changes will be lost.")) {
                   setViewMode('register');
                 }
               }} 
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
             >
               <X className="w-4 h-4 text-slate-500" /> Discard
             </button>

             <button 
               onClick={() => setViewMode('register')} 
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
             >
               <X className="w-4 h-4 text-slate-500" /> Close Form
             </button>
          </div>
        </div>
      </div>
    </LegacyLayout>
  );
};
