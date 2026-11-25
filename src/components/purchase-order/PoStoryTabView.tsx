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
import { isMaterialMismatchApproved } from '../../lib/contractRelationshipEngine';
import {
  getArrivalSummary,
  getInspectionMetrics,
  getPaymentMetrics,
  getPoHeaderMetrics,
  getSettlementMetrics,
} from './poHistogramHelpers';

export interface PoStoryTabViewProps {
  po: any;
  dbPoDetails?: any[];
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
  dbPoDetails = [],
  dbArrivals,
  linkedMrs,
  dbInspections,
  dbSattaRate,
  dbMismatches,
  dbPayments,
  dbSettlements,
}) => {
  const poHeader = getPoHeaderMetrics(po, dbPoDetails);
  const sattaRateNum =
    Number(dbSattaRate?.finalRate || dbSattaRate?.base_rate || dbSattaRate?.baseRate || 0) || null;
  const receivedLorryCount = Math.max(dbArrivals.length, dbInspections.length, linkedMrs.length);
  const remainingLorries = Math.max(0, poHeader.lorries - receivedLorryCount);

  const pendingMismatches = dbMismatches.filter((m) => !isMaterialMismatchApproved(m));
  const approvedMismatches = dbMismatches.filter((m) => isMaterialMismatchApproved(m));
  const mismatchFieldLabels = Array.from(
    new Set(
      dbMismatches
        .map((m) => String(m.field_name || m.field || m.mismatched_fields || m.mismatch_type || '').trim())
        .filter(Boolean)
    )
  );

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
            P.O. {poHeader.poNo}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{poHeader.broker}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{poHeader.supplier}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Challan Supplier:</span> <strong className="text-slate-800">{poHeader.challanSupplier}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Area:</span> <strong className="text-slate-800">{poHeader.area}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Lorries:</span> <strong className="text-slate-800">{poHeader.lorries}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Units / Lorry:</span> <strong className="text-slate-800">{poHeader.unitsPerLorry > 0 ? `${poHeader.unitsPerLorry} ${poHeader.unit}` : 'N/A'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Units (Count):</span> <strong className="text-slate-800">{poHeader.totalUnits} {poHeader.unit}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Weight/Lorry (MT):</span> <strong className="text-slate-800">{poHeader.weightPerLorry.toFixed(3)} MT</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Total Contract (MT):</span> <strong className="text-emerald-800 font-mono font-black">{poHeader.contractMt.toFixed(3)} MT</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Range:</span> <strong className="text-slate-800">{poHeader.deliveryFrom} to {poHeader.deliveryTo}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Grace Days:</span> <strong className="text-slate-800">{poHeader.graceDays} Days</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Penalty:</span> <strong className="text-slate-800">{poHeader.deliveryPenalty || 'Standard'}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Grade Name:</span> <strong className="text-slate-800">{poHeader.grades}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Agency Name:</span> <strong className="text-slate-800">{poHeader.agencies}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Marka Name:</span> <strong className="text-slate-800">{poHeader.markas}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Rate / Qtl:</span> <strong className="text-emerald-800 font-mono font-black">{poHeader.rate > 0 ? `₹${poHeader.rate.toLocaleString()}` : poHeader.detailRateRange}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Detail Rates:</span> <strong className="text-slate-800 font-mono">{poHeader.detailRateRange}</strong></div>
          <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Premium:</span> <strong className="text-slate-800">{poHeader.premium || 'Nil'}</strong></div>
        </div>
      </div>

      {/* STAGE 2: FINAL ARRIVAL (Per Linked MR) */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Stage 2: Final Arrival Records ({dbArrivals.length} Arrivals Linked)</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-mono font-bold">
            Linked MRs ({linkedMrs.length}): {linkedMrs.join(', ') || 'None'}
          </span>
        </div>

        {dbArrivals.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No Final Arrival records logged yet for this P.O.
          </div>
        ) : (
          <div className="space-y-4">
            {dbArrivals.map((arr, idx) => {
              const summary = getArrivalSummary(arr);
              return (
                <div key={arr.id || arr.final_arrival_id || summary.mrNo || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-1.5">
                    <span className="text-xs font-mono font-black text-[#D94B5A] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      <span>M.R. No: {summary.mrNo}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-600">
                      Date: <strong>{summary.date}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Challan Supplier:</span> <strong className="text-slate-800">{summary.challanSupplier}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{summary.supplier}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{summary.broker}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Lorry Number:</span> <strong className="text-slate-800 font-mono">{summary.lorryNo}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Unit:</span> <strong className="text-slate-800">{summary.unit}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">A.P.M.C Fees (₹):</span> <strong className="text-slate-800">₹{summary.apmcFees.toLocaleString()}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Arrival Area:</span> <strong className="text-slate-800">{summary.area}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Receipt Grade:</span> <strong className="text-slate-800">{summary.grades}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Agency Name:</span> <strong className="text-slate-800">{summary.agencies}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Challan Marka:</span> <strong className="text-slate-800">{summary.markas}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Netto (MT):</span> <strong className="text-slate-800 font-mono">{summary.nettoMt.toFixed(3)} MT</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Quantity Chln:</span> <strong className="text-slate-800">{summary.quantityChln}</strong></div>
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
                      <div className="bg-slate-50 p-1.5 rounded border"><span className="text-slate-400 block text-[8.5px]">WEIGHT (QTL)</span><strong>{arr.weight_qtl ? Number(arr.weight_qtl).toFixed(2) : (summary.weightMt * 10).toFixed(2)}</strong></div>
                      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-300 text-emerald-900"><span className="text-emerald-700 block text-[8.5px] font-bold">FINAL WEIGHT (MT)</span><strong>{summary.weightMt.toFixed(3)} MT</strong></div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            {dbInspections.map((insp, idx) => {
              const m = getInspectionMetrics(insp, dbArrivals);
              return (
                <div key={insp.id || m.mrNo || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-1.5 flex-wrap gap-2">
                    <span className="text-xs font-mono font-black text-[#D94B5A]">
                      M.R. No: {m.mrNo || `Inspection #${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                      <span>Weight: <strong className="font-mono text-emerald-800">{m.weightMt.toFixed(3)} MT</strong></span>
                      <span>Arrival: <strong>{m.arrivalDate}</strong></span>
                      <span>Inspection Date: <strong>{m.date}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[11px]">
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">M.R. / Arrival No:</span> <strong className="text-slate-800 font-mono">{m.mrNo || '—'}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier:</span> <strong className="text-slate-800">{m.supplier}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Broker:</span> <strong className="text-slate-800">{m.broker}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Grade(s):</span> <strong className="text-slate-800">{m.grades}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Agency:</span> <strong className="text-slate-800">{m.agencies}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Marka:</span> <strong className="text-slate-800">{m.markas}</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual Moisture:</span> <strong className={cn(m.actualMoisture > 15 ? 'text-rose-700' : 'text-emerald-800')}>{m.actualMoisture.toFixed(1)}%</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Claim Moisture:</span> <strong className="text-slate-800">{m.claimMoisture.toFixed(1)}%</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual Dust:</span> <strong className={cn(m.actualDust > 1 ? 'text-rose-700' : 'text-slate-800')}>{m.actualDust.toFixed(1)}%</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Actual NCV:</span> <strong className={cn(m.actualNcv > 0.5 ? 'text-rose-700' : 'text-slate-800')}>{m.actualNcv.toFixed(1)}%</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Detention Days:</span> <strong className="text-slate-800">{m.detentionDays} Days</strong></div>
                    <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Mill P.O. No:</span> <strong className="text-slate-800 font-mono">{m.millPoNo}</strong></div>
                  </div>
                </div>
              );
            })}
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
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Sauda No. & Date:</span> <strong className="text-slate-800 font-mono">{poHeader.poNo} ({poHeader.poDate})</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier & Broker:</span> <strong className="text-slate-800">{poHeader.supplier} | {poHeader.broker}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Area & Grade:</span> <strong className="text-slate-800">{poHeader.area} | {poHeader.grades}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Sauda Rate (₹/Qtl):</span> <strong className="text-emerald-800 font-mono font-black">{poHeader.rate > 0 ? `₹${poHeader.rate.toLocaleString()}` : poHeader.detailRateRange}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Satta Limit Rate (₹/Qtl):</span> <strong className="text-slate-700 font-mono">{sattaRateNum !== null ? `₹${sattaRateNum.toLocaleString()}` : 'Not Set for Date'}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Variance / Excess:</span> <strong className={cn('font-mono', sattaRateNum !== null && poHeader.rate > sattaRateNum ? 'text-rose-700' : 'text-slate-800')}>{sattaRateNum !== null && poHeader.rate > 0 ? `${poHeader.rate - sattaRateNum >= 0 ? '+' : ''}₹${(poHeader.rate - sattaRateNum).toLocaleString()}` : '—'}</strong></div>
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
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">P.O. Number & Date:</span> <strong className="text-slate-800 font-mono">{poHeader.poNo} ({poHeader.poDate})</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Supplier & Broker:</span> <strong className="text-slate-800">{poHeader.supplier} | {poHeader.broker}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Area & Grade:</span> <strong className="text-slate-800">{poHeader.area} | {poHeader.grades}</strong></div>
          <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Lorries (Contract|Recv|Rem):</span> <strong className="text-slate-800 font-mono">{poHeader.lorries} | {receivedLorryCount} | {remainingLorries}</strong></div>
          <div>
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Mismatched Fields:</span>
            <strong className={cn(pendingMismatches.length > 0 ? 'text-rose-700' : 'text-emerald-800')}>
              {mismatchFieldLabels.length > 0 ? mismatchFieldLabels.join(', ') : 'None (Zero Mismatches)'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Audit Status:</span>
            <strong className={cn(pendingMismatches.length > 0 ? 'text-rose-700' : 'text-emerald-800')}>
              {pendingMismatches.length > 0
                ? `${pendingMismatches.length} Pending Approval`
                : approvedMismatches.length > 0
                  ? `Approved (${approvedMismatches.length} Resolved)`
                  : 'Clean (Zero Mismatches)'}
            </strong>
          </div>
        </div>
      </div>

      {/* STAGE 6: PAYMENT OPERATIONS */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-700" />
            <span>Stage 6: Payment Operations ({dbPayments.length} Vouchers)</span>
          </h3>
          {dbPayments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
              Total Paid: ₹{Math.round(dbPayments.reduce((s, p) => s + getPaymentMetrics(p).paidAmount, 0)).toLocaleString()}
            </span>
          )}
        </div>

        {dbPayments.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            No Payment Vouchers created yet for this P.O.
          </div>
        ) : (
          <div className="space-y-3">
            {dbPayments.map((pay, idx) => {
              const pm = getPaymentMetrics(pay);
              return (
                <div key={pay.payment_id || pay.id || pm.voucherNo || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 text-[11px] grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Voucher / MR No:</span> <strong className="text-slate-800 font-mono">{pm.voucherNo} ({pm.mrNo})</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Payment Date:</span> <strong className="text-slate-800">{pm.paymentDate}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Party / Supplier:</span> <strong className="text-slate-800">{pm.partyName !== '—' ? pm.partyName : poHeader.supplier}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Status:</span> <strong className="text-slate-800">{pm.paymentStatus}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Payable Value (₹):</span> <strong className="text-slate-800 font-mono">₹{Math.round(pm.payableAmount).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Paid Amount (₹):</span> <strong className="text-emerald-800 font-mono font-black">₹{Math.round(pm.paidAmount).toLocaleString()}</strong></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STAGE 7: SETTLEMENT */}
      <div className="bg-white border-2 border-[#FBCFCB] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            <span>Stage 7: Settlement Master & Final Deduction Ledger ({dbSettlements.length} MR Settled)</span>
          </h3>
          {dbSettlements.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
              Gross Value: ₹{Math.round(dbSettlements.reduce((s, x) => s + getSettlementMetrics(x).grossValue, 0)).toLocaleString()} | Net Balance: ₹{Math.round(dbSettlements.reduce((s, x) => s + getSettlementMetrics(x).netPayable, 0)).toLocaleString()}
            </span>
          )}
        </div>

        {dbSettlements.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            Account Settlement is pending for this P.O.
          </div>
        ) : (
          <div className="space-y-3">
            {dbSettlements.map((sett, idx) => {
              const sm = getSettlementMetrics(sett);
              return (
                <div key={sett.settlement_id || sett.id || sm.mrNo || idx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 text-[11px] grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Settlement MR & Date:</span> <strong className="text-slate-800 font-mono">{sm.mrNo} ({sm.settDate})</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Settled Weight (MT):</span> <strong className="text-slate-800 font-mono">{sm.weightMt.toFixed(3)} MT</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Material Value (₹):</span> <strong className="text-slate-800 font-mono">₹{Math.round(sm.grossValue).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Advance Adjusted (₹):</span> <strong className="text-slate-700 font-mono">₹{Math.round(sm.advanceAdjusted).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Deductions / Penalty:</span> <strong className="text-rose-700 font-mono">₹{Math.round(sm.qualityDeductions + sm.weightPenalty).toLocaleString()}</strong></div>
                  <div><span className="text-slate-400 block text-[9.5px] uppercase font-bold">Net Balance Payable:</span> <strong className="text-emerald-800 font-mono font-black">₹{Math.round(sm.netPayable).toLocaleString()}</strong></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
