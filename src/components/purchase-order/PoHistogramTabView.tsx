import React from 'react';
import {
  BarChart3,
  FileText,
  Truck,
  Droplets,
  Coins,
  Scale,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getArrivalSummary,
  getArrivalWeightMt,
  getInspectionMetrics,
  getInspectionWeightMt,
  getPaymentMetrics,
  getPoHeaderMetrics,
  getSettlementMetrics,
} from './poHistogramHelpers';

export interface PoHistogramTabViewProps {
  po: any;
  dbArrivals: any[];
  dbInspections: any[];
  dbPayments: any[];
  dbSettlements: any[];
}

const parseYmd = (raw: string | null | undefined): Date | null => {
  const s = String(raw || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const diffDays = (fromStr: string | null | undefined, toStr: string | null | undefined): number | null => {
  const d1 = parseYmd(fromStr);
  const d2 = parseYmd(toStr);
  if (!d1 || !d2) return null;
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDateRange = (dates: Array<string | null | undefined>): { label: string; first: string | null; last: string | null } => {
  const clean = dates
    .map((d) => String(d || '').trim().slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (clean.length === 0) return { label: 'Pending', first: null, last: null };
  const first = clean[0];
  const last = clean[clean.length - 1];
  return {
    label: first === last ? first : `${first} → ${last}`,
    first,
    last,
  };
};

export const PoHistogramTabView: React.FC<PoHistogramTabViewProps> = ({
  po,
  dbArrivals,
  dbInspections,
  dbPayments,
  dbSettlements,
}) => {
  const poHeader = getPoHeaderMetrics(po);

  const totalArrivalMt = dbArrivals.reduce((s, a) => s + getArrivalWeightMt(a), 0);
  const totalInspMt = dbInspections.reduce((s, i) => s + getInspectionWeightMt(i, dbArrivals), 0);
  const totalPaid = dbPayments.reduce((s, p) => s + getPaymentMetrics(p).paidAmount, 0);
  const totalSettledMt = dbSettlements.reduce((s, x) => s + getSettlementMetrics(x).weightMt, 0);
  const totalSettledGross = dbSettlements.reduce((s, x) => s + getSettlementMetrics(x).grossValue, 0);
  const totalSettledNet = dbSettlements.reduce((s, x) => s + getSettlementMetrics(x).netPayable, 0);

  const saudaDate = poHeader.poDate !== '—' ? poHeader.poDate.slice(0, 10) : null;
  const arrivalDates = formatDateRange(dbArrivals.map((a) => getArrivalSummary(a).date));
  const inspDates = formatDateRange(dbInspections.map((i) => getInspectionMetrics(i, dbArrivals).date));
  const payDates = formatDateRange(dbPayments.map((p) => getPaymentMetrics(p).paymentDate));
  const settDates = formatDateRange(dbSettlements.map((s) => getSettlementMetrics(s).settDate));

  const dSaudaToArr = diffDays(saudaDate, arrivalDates.first);
  const dArrToInsp = diffDays(arrivalDates.first, inspDates.first);
  const dInspToPay = diffDays(arrivalDates.first, payDates.first);
  const dTotalCycle = diffDays(saudaDate, settDates.last || payDates.last || inspDates.last || arrivalDates.last);

  const steps = [
    {
      title: '1. Sauda Entry',
      date: saudaDate || '—',
      icon: FileText,
      status: 'complete',
      val: `${poHeader.contractMt.toFixed(3)} MT`,
      sub: `${poHeader.lorries} Lorry Contract`,
    },
    {
      title: '2. Final Arrival',
      date: arrivalDates.label,
      icon: Truck,
      status: dbArrivals.length > 0 ? 'complete' : 'pending',
      val: `${(totalArrivalMt > 0 ? totalArrivalMt : totalInspMt).toFixed(3)} MT`,
      sub: `${dbArrivals.length} / ${poHeader.lorries} Lorry`,
    },
    {
      title: '3. Mill Inspection',
      date: inspDates.label,
      icon: Droplets,
      status: dbInspections.length > 0 ? 'complete' : 'pending',
      val: `${dbInspections.length} MR(s)`,
      sub: totalInspMt > 0 ? `${totalInspMt.toFixed(3)} MT Inspected` : 'Pending Inspection',
    },
    {
      title: '4. Payment',
      date: payDates.label,
      icon: Coins,
      status: dbPayments.length > 0 ? 'complete' : 'pending',
      val: `₹${Math.round(totalPaid).toLocaleString()}`,
      sub: `${dbPayments.length} Voucher(s)`,
    },
    {
      title: '5. Settlement',
      date: settDates.label,
      icon: Scale,
      status: dbSettlements.length > 0 ? 'complete' : 'pending',
      val: dbSettlements.length > 0 ? `${dbSettlements.length} MR Settled` : 'Pending',
      sub:
        dbSettlements.length > 0
          ? `${totalSettledMt.toFixed(3)} MT | ₹${Math.round(totalSettledGross > 0 ? totalSettledGross : totalSettledNet).toLocaleString()}`
          : 'Awaiting Settlement',
    },
  ];

  const turnaroundBars = [
    { label: 'Sauda → First Arrival', days: dSaudaToArr },
    { label: 'First Arrival → Mill Inspection', days: dArrToInsp },
    { label: 'First Arrival → Payment', days: dInspToPay },
    { label: 'Total Lifecycle (Sauda → Latest Stage)', days: dTotalCycle },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#FBCFCB] rounded-xl p-4 shadow-xs space-y-4">
        <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700" />
          <span>Turnaround Days & Progress Timeline (Histogram)</span>
        </h3>

        {/* Horizontal Progress Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 py-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 flex flex-col justify-between text-center relative"
            >
              <div className="flex justify-center mb-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-xs',
                    step.status === 'complete'
                      ? 'bg-[#D94B5A] text-white'
                      : 'bg-slate-200 text-slate-500'
                  )}
                >
                  <step.icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-xs font-bold text-[#D94B5A]">{step.title}</span>
              <span className="text-[11px] font-mono text-emerald-800 font-extrabold mt-1">
                {step.val}
              </span>
              <span className="text-[9.5px] font-mono text-slate-600 mb-1">
                {step.sub}
              </span>
              <span className="text-[9.5px] font-sans text-slate-500">{step.date}</span>
            </div>
          ))}
        </div>

        {/* Turnaround Metrics Strip */}
        <div className="border-t border-[#FBCFCB] pt-3">
          <div className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span>Stage Turnaround Duration</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {turnaroundBars.map((bar) => (
              <div key={bar.label} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold text-slate-600">{bar.label}</span>
                <span className="text-xs font-mono font-black text-[#D94B5A] shrink-0">
                  {bar.days !== null ? `${bar.days} day${Math.abs(bar.days) === 1 ? '' : 's'}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
