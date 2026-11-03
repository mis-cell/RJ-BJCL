import React from 'react';
import {
  FileText,
  Truck,
  Droplets,
  Coins,
  Scale,
  ShieldAlert,
  Tag,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PoStoryTabViewProps {
  po: any;
  dbArrivals: any[];
  linkedMrs: string[];
  dbInspections: any[];
  dbSattaRate: any;
  dbMismatches: any[];
  dbPayments: any[];
  dbSettlements: any[];
}

export const PoStoryTabView: React.FC<PoStoryTabViewProps> = ({
  po,
  dbArrivals,
  linkedMrs,
  dbInspections,
  dbSattaRate,
  dbMismatches,
  dbPayments,
  dbSettlements,
}) => {
  return (
    <div className="space-y-6">
      {/* STAGE 1: SAUDA CHECK POINT */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Stage 1: Sauda Check Point Contract Master</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
            P.O. {po.po_no}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{po.broker || po.broker_name || 'DIRECT'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{po.supplier || po.supplier_name || 'DIRECT'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Challan Supplier:</span> <strong className="text-slate-800">{po.challan_supplier || po.supplier || 'DIRECT'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Area:</span> <strong className="text-slate-800">{po.area || po.station || 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Lorries:</span> <strong className="text-slate-800">{po.total_no_of_lorries || po.contract_lorries || 1}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Units / Lorry:</span> <strong className="text-slate-800">{po.units_per_lorry || po.units_lorry || 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Units (Count):</span> <strong className="text-slate-800">{po.total_units || po.total_unit || 0}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Weight/Lorry (MT):</span> <strong className="text-slate-800">{po.weight_per_lorry || (parseFloat(po.total_contract_mt || 0) / Math.max(1, parseInt(po.total_no_of_lorries || 1))).toFixed(3)} MT</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Contract (MT):</span> <strong className="text-emerald-800 font-mono font-black">{parseFloat(po.total_contract_mt || 0).toFixed(3)} MT</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Range:</span> <strong className="text-slate-800">{po.delivery_from || po.po_date || '—'} to {po.delivery_to || '—'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Grace Days:</span> <strong className="text-slate-800">{po.grace_days || 0} Days</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Penalty:</span> <strong className="text-slate-800">{po.delivery_penalty || 'Standard'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Grade Name:</span> <strong className="text-slate-800">{po.grade || po.grade_name || 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Agency Name:</span> <strong className="text-slate-800">{po.agency_name || 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Marka Name:</span> <strong className="text-slate-800">{po.marka_name || 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Rate / Qtl:</span> <strong className="text-emerald-800 font-mono font-black">₹{parseFloat(po.rate || po.price || 0).toLocaleString()}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Premium:</span> <strong className="text-slate-800">{po.premium || 'Nil'}</strong></div>
        </div>
      </div>

      {/* STAGE 2: TEMPORARY ARRIVAL (Per Linked MR) */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Stage 2: Temporary Arrival Records ({dbArrivals.length} Arrivals Linked)</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-mono font-bold">
            Linked MRs: {linkedMrs.join(', ') || 'None'}
          </span>
        </div>

        {dbArrivals.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No Temporary Arrival records logged yet for this P.O.
          </div>
        ) : (
          <div className="space-y-4">
            {dbArrivals.map((arr, idx) => (
              <div key={arr.id || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-1.5">
                  <span className="text-xs font-mono font-black text-[#D94B5A] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>M.R. No: {arr.temporary_arrival_no || arr.mr_no || arr.amad_no || `Arrival #${idx + 1}`}</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">
                    Date: <strong>{arr.date || arr.arrival_date || arr.lorry_date || '—'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Challan Supplier:</span> <strong className="text-slate-800">{arr.challan_supplier || arr.supplier || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{arr.supplier || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{arr.broker || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Lorry Number:</span> <strong className="text-slate-800 font-mono">{arr.lorry_number || arr.lorry_no || arr.truck_no || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Unit:</span> <strong className="text-slate-800">{arr.unit_name || arr.unit || 'BALES'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">A.P.M.C Fees (₹):</span> <strong className="text-slate-800">₹{parseFloat(arr.apmc_fees || 0).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Arrival Area:</span> <strong className="text-slate-800">{arr.arrival_area_name || arr.area || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Receipt Grade:</span> <strong className="text-slate-800">{arr.receipt_grade_name || arr.grade || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Agency Name:</span> <strong className="text-slate-800">{arr.agency_name || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Challan Marka:</span> <strong className="text-slate-800">{arr.challan_marka_name || arr.marka_name || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Netto (MT):</span> <strong className="text-slate-800 font-mono">{parseFloat(arr.netto_mt || 0).toFixed(3)} MT</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Quantity Chln:</span> <strong className="text-slate-800">{arr.quantity_chln || arr.received_units || 0}</strong></div>
                </div>

                {/* Weight Comparison Grid */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-slate-600" />
                    <span>Weighbridge Breakdown (Gross / Tare / Net):</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">CHALLAN GROSS</span><strong>{arr.supplier_challan_gross || arr.challan_gross_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">MILL GROSS</span><strong>{arr.actual_gross_weight || arr.mill_gross_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">ELECTRONIC GROSS</span><strong>{arr.electronic_gross_weight || arr.electronic_gross_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">CHALLAN TARE</span><strong>{arr.supplier_tare_weight || arr.challan_tare_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">MILL TARE</span><strong>{arr.actual_tare_weight || arr.mill_tare_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">ELECTRONIC TARE</span><strong>{arr.electronic_tare_weight || arr.electronic_tare_wt || 0}</strong></div>
                    <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">MILL NET</span><strong>{arr.actual_net_weight || arr.mill_net_wt || 0}</strong></div>
                    <div className="bg-emerald-50 p-1.5 rounded border border-emerald-300 text-emerald-900"><span className="text-emerald-700 block text-[8.5px] font-bold">FINAL WEIGHT (MT)</span><strong>{parseFloat(arr.final_weight_mt || arr.received_weight_mt || 0).toFixed(3)} MT</strong></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STAGE 3: MILL INSPECTION */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Droplets className="w-4 h-4 text-emerald-700" />
            <span>Stage 3: Mill Inspection & Quality Audit ({dbInspections.length} Inspections Linked)</span>
          </h3>
        </div>

        {dbInspections.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No Mill Inspection records logged yet for this P.O.
          </div>
        ) : (
          <div className="space-y-4">
            {dbInspections.map((insp, idx) => (
              <div key={insp.id || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-1.5">
                  <span className="text-xs font-mono font-black text-[#D94B5A]">
                    M.R. No: {insp.mr_no || insp.arrival_no || `Inspection #${idx + 1}`}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">
                    Inspection Date: <strong>{insp.mr_date || insp.date || '—'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Arrival No:</span> <strong className="text-slate-800 font-mono">{insp.arrival_no || insp.mr_no || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{insp.supplier_name || insp.supplier || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{insp.broker_name || insp.broker || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual Moisture:</span> <strong className={cn(parseFloat(insp.actual_moisture || 0) > 15 ? "text-rose-700" : "text-emerald-800")}>{parseFloat(insp.actual_moisture || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual Dust:</span> <strong className={cn(parseFloat(insp.actual_dust || 0) > 1 ? "text-rose-700" : "text-slate-800")}>{parseFloat(insp.actual_dust || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual NCV:</span> <strong className={cn(parseFloat(insp.actual_ncv || 0) > 0.5 ? "text-rose-700" : "text-slate-800")}>{parseFloat(insp.actual_ncv || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Claim Moisture:</span> <strong className="text-slate-800">{parseFloat(insp.claim_moisture || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Claim Dust:</span> <strong className="text-slate-800">{parseFloat(insp.claim_dust || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Claim NCV:</span> <strong className="text-slate-800">{parseFloat(insp.claim_ncv || 0).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Detention Days:</span> <strong className="text-slate-800">{insp.detention_days || 0} Days</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Unloading Date:</span> <strong className="text-slate-800">{insp.unloading_date || '—'}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Mill P.O. No:</span> <strong className="text-slate-800 font-mono">{insp.mill_po_no || '—'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STAGE 4: SATTA PRICE MISMATCH */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-700" />
            <span>Stage 4: Satta Price Mismatch Verification</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Sauda No. & Date:</span> <strong className="text-slate-800 font-mono">{po.po_no} ({po.po_date || '—'})</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier & Broker:</span> <strong className="text-slate-800">{po.supplier || 'DIRECT'} | {po.broker || 'DIRECT'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Area & Grade:</span> <strong className="text-slate-800">{po.area || '—'} | {po.grade || '—'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Sauda Rate (₹/Qtl):</span> <strong className="text-emerald-800 font-mono font-black">₹{parseFloat(po.rate || 0).toLocaleString()}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Satta Limit Rate (₹/Qtl):</span> <strong className="text-slate-700 font-mono">{dbSattaRate?.base_rate ? `₹${Number(dbSattaRate.base_rate).toLocaleString()}` : 'Standard Satta'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Variance / Excess:</span> <strong className="text-slate-800 font-mono">{dbSattaRate?.base_rate ? `₹${(parseFloat(po.rate || 0) - Number(dbSattaRate.base_rate)).toFixed(0)}` : '₹0'}</strong></div>
        </div>
      </div>

      {/* STAGE 5: MATERIAL MISMATCH */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-700" />
            <span>Stage 5: Material Mismatch Board (Base Mode)</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">P.O. Number & Date:</span> <strong className="text-slate-800 font-mono">{po.po_no} ({po.po_date || '—'})</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier & Broker:</span> <strong className="text-slate-800">{po.supplier || 'DIRECT'} | {po.broker || 'DIRECT'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Area & Grade:</span> <strong className="text-slate-800">{po.area || '—'} | {po.grade || '—'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Lorries (Contract|Recv|Rem):</span> <strong className="text-slate-800">{po.total_no_of_lorries || 1} | {dbArrivals.length} | {Math.max(0, (po.total_no_of_lorries || 1) - dbArrivals.length)}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Mismatched Fields:</span> <strong className="text-emerald-800">{dbMismatches.length > 0 ? dbMismatches.map(m => m.field_name).join(', ') : 'None (Zero Mismatches)'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Audit Status:</span> <strong className="text-emerald-800">Verified & Approved</strong></div>
        </div>
      </div>

      {/* STAGE 6: PAYMENT OPERATIONS */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-700" />
            <span>Stage 6: Payment Operations ({dbPayments.length} Vouchers)</span>
          </h3>
        </div>

        {dbPayments.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No Payment Vouchers created yet for this P.O.
          </div>
        ) : (
          <div className="space-y-3">
            {dbPayments.map((pay, idx) => (
              <div key={pay.id || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 text-[11px] grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Voucher No:</span> <strong className="text-slate-800 font-mono">{pay.voucher_no || `VOUCHER-${idx + 1}`}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Payment Date:</span> <strong className="text-slate-800">{pay.payment_date || pay.date || '—'}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Party / Supplier:</span> <strong className="text-slate-800">{pay.party_name || pay.supplier_name || po.supplier || '—'}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{pay.broker_name || po.broker || 'DIRECT'}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Payable Net Amount (₹):</span> <strong className="text-emerald-800 font-mono font-black">₹{parseFloat(pay.amount_paid || pay.payable_net_amount || pay.amount || 0).toLocaleString()}</strong></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STAGE 7: SETTLEMENT */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            <span>Stage 7: Settlement Master & Final Deduction Ledger ({dbSettlements.length} MR Settled)</span>
          </h3>
        </div>

        {dbSettlements.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            Account Settlement is pending for this P.O.
          </div>
        ) : (
          <div className="space-y-3">
            {dbSettlements.map((sett, idx) => (
              <div key={sett.id || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 text-[11px] grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Settlement MR No:</span> <strong className="text-slate-800 font-mono">{sett.mr_no || `SETTLEMENT-${idx + 1}`}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Settled Weight (MT):</span> <strong className="text-slate-800 font-mono">{parseFloat(sett.settled_weight_mt || 0).toFixed(3)} MT</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Quality Deductions:</span> <strong className="text-rose-700 font-mono">₹{parseFloat(sett.total_deduction_amount || 0).toLocaleString()}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Weight Penalty:</span> <strong className="text-rose-700 font-mono">₹{parseFloat(sett.penalty_amount || 0).toLocaleString()}</strong></div>
                <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Net Final Amount:</span> <strong className="text-emerald-800 font-mono font-black">₹{parseFloat(sett.net_settled_amount || 0).toLocaleString()}</strong></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
