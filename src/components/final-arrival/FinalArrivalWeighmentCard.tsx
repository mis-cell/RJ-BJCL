import React from 'react';
import { Scale, Info } from 'lucide-react';
import { FinalArrivalEntryFormData } from './finalArrivalTypes';

interface FinalArrivalWeighmentCardProps {
  formData: FinalArrivalEntryFormData;
  handleInputChange: (field: string, val: any) => void;
  finalWeightDisplayValue: any;
}

export function FinalArrivalWeighmentCard({
  formData,
  handleInputChange,
  finalWeightDisplayValue
}: FinalArrivalWeighmentCardProps) {
  const actualNet = (Number(formData.actual_gross_weight) || 0) - (Number(formData.actual_tare_weight) || 0);
  const supplierNet = (Number(formData.supplier_challan_gross) || 0) - (Number(formData.supplier_tare_weight) || 0);
  const electronicNet = (Number(formData.electronic_gross_weight) || 0) - (Number(formData.electronic_tare_weight) || 0);

  const challanWt = Number(formData.challan_material_weight) || 0;
  const finalWt = Number(finalWeightDisplayValue) || 0;
  const diffWt = finalWt > 0 && challanWt > 0 ? (finalWt - challanWt) : 0;
  const diffPct = challanWt > 0 && diffWt !== 0 ? ((diffWt / challanWt) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-xs p-4 space-y-4 text-xs">
      <div className="flex items-center gap-2 pb-1 border-b border-[#FBCFCB]">
        <Scale className="w-4 h-4 text-[#D94B5A]" />
        <span className="font-bold text-slate-800 uppercase tracking-wide">Enterprise Weighment Compilations & Reconciliation</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Actual Weighment Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
            Actual Mill Weighment
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Gross Weight (MT)</label>
              <input
                type="number"
                step="0.001"
                value={formData.actual_gross_weight || ''}
                onChange={(e) => handleInputChange('actual_gross_weight', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tare Weight (MT)</label>
              <input
                type="number"
                step="0.001"
                value={formData.actual_tare_weight || ''}
                onChange={(e) => handleInputChange('actual_tare_weight', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between items-center font-bold">
              <span className="text-[10px] text-slate-600 uppercase">Actual Net:</span>
              <span className="font-mono text-emerald-800">{actualNet > 0 ? actualNet.toFixed(3) : '0.000'} MT</span>
            </div>
          </div>
        </div>

        {/* Supplier Weighment Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
            Supplier Challan Details
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Supplier Challan Gross</label>
              <input
                type="number"
                step="0.001"
                value={formData.supplier_challan_gross || ''}
                onChange={(e) => handleInputChange('supplier_challan_gross', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Supplier Tare Weight</label>
              <input
                type="number"
                step="0.001"
                value={formData.supplier_tare_weight || ''}
                onChange={(e) => handleInputChange('supplier_tare_weight', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between items-center font-bold">
              <span className="text-[10px] text-slate-600 uppercase">Supplier Net:</span>
              <span className="font-mono text-blue-900">{supplierNet > 0 ? supplierNet.toFixed(3) : (formData.supplier_net_weight ? Number(formData.supplier_net_weight).toFixed(3) : '0.000')} MT</span>
            </div>
          </div>
        </div>

        {/* Electronic Weighbridge Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
            Electronic Weighbridge
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Electronic Gross Wt</label>
              <input
                type="number"
                step="0.001"
                value={formData.electronic_gross_weight || ''}
                onChange={(e) => handleInputChange('electronic_gross_weight', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Electronic Tare Wt</label>
              <input
                type="number"
                step="0.001"
                value={formData.electronic_tare_weight || ''}
                onChange={(e) => handleInputChange('electronic_tare_weight', parseFloat(e.target.value) || 0)}
                className="w-full h-7 bg-white border border-slate-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-[#D94B5A]"
              />
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between items-center font-bold">
              <span className="text-[10px] text-slate-600 uppercase">Electronic Net:</span>
              <span className="font-mono text-purple-900">{electronicNet > 0 ? electronicNet.toFixed(3) : (formData.electronic_net_weight ? Number(formData.electronic_net_weight).toFixed(3) : '0.000')} MT</span>
            </div>
          </div>
        </div>

        {/* Final Decision & Weight Reduced Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300 rounded-lg p-3 space-y-2 flex flex-col justify-between">
          <div>
            <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] block border-b border-amber-200 pb-1">
              Weight Reduced / Final MT
            </span>
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Challan Material Wt (MT)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.challan_material_weight || ''}
                  onChange={(e) => handleInputChange('challan_material_weight', parseFloat(e.target.value) || 0)}
                  className="w-full h-7 bg-white border border-amber-300 rounded px-2 text-right font-mono font-bold text-slate-800 outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-800 mb-0.5">Final Certified Net (MT)</label>
                <input
                  type="number"
                  step="0.001"
                  value={finalWeightDisplayValue ?? ''}
                  onChange={(e) => handleInputChange('weight_reduced', parseFloat(e.target.value) || 0)}
                  className="w-full h-7 bg-white border-2 border-amber-500 rounded px-2 text-right font-mono font-black text-rose-700 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-amber-200 text-[10px] font-bold">
            {diffWt !== 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 uppercase">{diffWt < 0 ? 'Shortage:' : 'Excess:'}</span>
                <span className={diffWt < 0 ? "text-rose-600 font-mono" : "text-emerald-700 font-mono"}>
                  {Math.abs(diffWt).toFixed(3)} MT ({Math.abs(diffPct).toFixed(2)}%)
                </span>
              </div>
            ) : (
              <span className="text-slate-500 italic flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-700" /> Balanced Net Weight
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remarks row */}
      <div className="pt-2 border-t border-slate-200">
        <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks / Quality Notes</label>
        <textarea
          rows={2}
          value={formData.remarks || ''}
          onChange={(e) => handleInputChange('remarks', e.target.value)}
          placeholder="Enter remarks or advice notes..."
          className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:border-[#D94B5A] outline-none"
        />
      </div>
    </div>
  );
}
